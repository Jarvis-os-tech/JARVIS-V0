import { WebSocket } from 'ws';
import { dispatchSystemControl, isSystemControl } from './system_controls';
import { FillerAudioSynthesizer } from './filler_audio_synthesizer';

export interface ContinuousAction {
  tool: string;
  args?: Record<string, any>;
  label?: string;
  waitMs?: number;
}

export interface ContinuousPlan {
  planId: string;
  title?: string;
  actions: ContinuousAction[];
}

type ActionExecutor = (tool: string, args: Record<string, any>) => Promise<any>;

interface ActivePlan {
  plan: ContinuousPlan;
  cancelled: boolean;
  currentIndex: number;
}

/**
 * Executes voice-generated GUI plans as a serial workflow.
 *
 * The plan is deliberately fire-and-forget from the Live API tool handler:
 * Jarvis acknowledges immediately, then emits one event per state transition.
 * A step is never started until the previous step has completed successfully.
 */
export class ContinuousExecutionQueue {
  private readonly activePlans = new Map<WebSocket, ActivePlan>();
  private readonly speechChains = new Map<WebSocket, Promise<void>>();
  private readonly executor: ActionExecutor;
  private readonly speech: FillerAudioSynthesizer;

  constructor(options?: { executor?: ActionExecutor; speech?: FillerAudioSynthesizer }) {
    this.executor = options?.executor || ((tool, args) => dispatchSystemControl(tool, args));
    this.speech = options?.speech || new FillerAudioSynthesizer('Puck');
  }

  public start(clientWs: WebSocket, input: Omit<ContinuousPlan, 'planId'> & { planId?: string }): { planId: string; actionCount: number } {
    const planId = input.planId || `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const actions = this.validateActions(input.actions);

    // A new voice plan supersedes the previous plan for that client.
    this.cancel(clientWs, 'Superseded by a newer plan');

    const active: ActivePlan = {
      plan: { planId, title: input.title, actions },
      cancelled: false,
      currentIndex: -1
    };
    this.activePlans.set(clientWs, active);

    this.emit(clientWs, {
      type: 'continuous_plan_started',
      planId,
      title: input.title || 'Continuous desktop workflow',
      totalSteps: actions.length,
      steps: actions.map((action, index) => ({
        index,
        label: action.label || action.tool,
        tool: action.tool,
        status: 'queued'
      }))
    });
    this.speak(clientWs, `Workflow started, Sir. I will execute ${actions.length} steps in sequence.`);

    // Do not await: the caller must return the plan receipt immediately.
    void Promise.resolve().then(() => this.run(active, clientWs));
    return { planId, actionCount: actions.length };
  }

  public cancel(clientWs: WebSocket, reason = 'Cancelled by user'): boolean {
    const active = this.activePlans.get(clientWs);
    if (!active) return false;
    active.cancelled = true;
    this.emit(clientWs, {
      type: 'continuous_plan_cancelled',
      planId: active.plan.planId,
      currentStep: active.currentIndex,
      reason
    });
    this.speak(clientWs, 'Workflow cancelled, Sir.');
    this.activePlans.delete(clientWs);
    return true;
  }

  public cancelForClient(clientWs: WebSocket): void {
    this.cancel(clientWs, 'Voice session disconnected');
    this.speechChains.delete(clientWs);
  }

  public getActivePlan(clientWs: WebSocket): ContinuousPlan | null {
    return this.activePlans.get(clientWs)?.plan || null;
  }

  private validateActions(actions: ContinuousAction[]): ContinuousAction[] {
    if (!Array.isArray(actions) || actions.length === 0) {
      throw new Error('A continuous plan must contain at least one action.');
    }
    if (actions.length > 12) {
      throw new Error('A continuous plan may contain at most 12 actions.');
    }

    return actions.map((action, index) => {
      if (!action || typeof action.tool !== 'string' || !action.tool.trim()) {
        throw new Error(`Plan step ${index + 1} is missing a tool name.`);
      }
      if (!isSystemControl(action.tool)) {
        throw new Error(`Plan step ${index + 1} uses unsupported GUI tool '${action.tool}'.`);
      }
      const waitMs = Math.max(0, Math.min(10_000, Number(action.waitMs || 0)));
      return {
        tool: action.tool,
        args: action.args && typeof action.args === 'object' ? action.args : {},
        label: action.label?.trim() || action.tool,
        waitMs
      };
    });
  }

  private async run(active: ActivePlan, clientWs: WebSocket): Promise<void> {
    const { plan } = active;
    try {
      for (let index = 0; index < plan.actions.length; index++) {
        if (active.cancelled || this.activePlans.get(clientWs) !== active) return;
        active.currentIndex = index;
        const action = plan.actions[index];

        this.emit(clientWs, {
          type: 'continuous_plan_step_started',
          planId: plan.planId,
          stepIndex: index,
          totalSteps: plan.actions.length,
          label: action.label || action.tool,
          tool: action.tool
        });
        this.speak(clientWs, `Step ${index + 1} of ${plan.actions.length}: ${action.label || action.tool}.`);

        const startedAt = Date.now();
        const result = await this.executor(action.tool, action.args || {});
        if (active.cancelled || this.activePlans.get(clientWs) !== active) return;

        const failed = Boolean(result?.error) || result?.success === false;
        this.emit(clientWs, {
          type: failed ? 'continuous_plan_step_failed' : 'continuous_plan_step_completed',
          planId: plan.planId,
          stepIndex: index,
          totalSteps: plan.actions.length,
          label: action.label || action.tool,
          tool: action.tool,
          result,
          durationMs: Date.now() - startedAt
        });

        if (failed) {
          this.emit(clientWs, {
            type: 'continuous_plan_failed',
            planId: plan.planId,
            failedStep: index,
            error: result?.error || 'The action reported failure.'
          });
          this.speak(clientWs, `Step ${index + 1} failed, Sir. I stopped the workflow safely.`);
          this.activePlans.delete(clientWs);
          return;
        }

        if (action.waitMs) await this.delay(action.waitMs);
      }

      if (active.cancelled || this.activePlans.get(clientWs) !== active) return;
      this.emit(clientWs, {
        type: 'continuous_plan_completed',
        planId: plan.planId,
        totalSteps: plan.actions.length
      });
      this.speak(clientWs, `Workflow complete, Sir. All ${plan.actions.length} steps executed.`);
      this.activePlans.delete(clientWs);
    } catch (error: any) {
      if (active.cancelled || this.activePlans.get(clientWs) !== active) return;
      this.emit(clientWs, {
        type: 'continuous_plan_failed',
        planId: plan.planId,
        failedStep: active.currentIndex,
        error: error?.message || String(error)
      });
      this.speak(clientWs, 'The workflow encountered an error, Sir, and has stopped safely.');
      this.activePlans.delete(clientWs);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private emit(clientWs: WebSocket, payload: Record<string, any>): void {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify(payload));
    }
  }

  private speak(clientWs: WebSocket, text: string): void {
    if (clientWs.readyState !== WebSocket.OPEN) return;
    const previous = this.speechChains.get(clientWs) || Promise.resolve();
    const next = previous.catch(() => undefined).then(async () => {
      try {
        const audio = await this.speech.synthesizeJarvisSpeech(text, 'Puck');
        if (clientWs.readyState !== WebSocket.OPEN) return;
        clientWs.send(JSON.stringify({
          type: 'output_transcription',
          text,
          isContinuousPlanSpeech: true
        }));
        clientWs.send(JSON.stringify({
          type: 'audio',
          audio: audio.audioBase64,
          sampleRate: audio.sampleRate,
          isContinuousPlanSpeech: true
        }));
      } catch {
        // State events remain authoritative when speech synthesis is unavailable.
        this.emit(clientWs, { type: 'output_transcription', text, isContinuousPlanSpeech: true });
      }
    });
    this.speechChains.set(clientWs, next);
    void next.finally(() => {
      if (this.speechChains.get(clientWs) === next) this.speechChains.delete(clientWs);
    }).catch(() => undefined);
  }
}

export const continuousExecutionQueue = new ContinuousExecutionQueue();
