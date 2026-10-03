/**
 * J.A.R.V.I.S. Multi-Agent Dual-Path Orchestrator
 * 
 * Central Asynchronous Engine:
 * - Sub-100ms Intent Classification (FAST_PATH vs SLOW_PATH).
 * - FAST_PATH: Instant execution (<10ms) via compiled native C++ workers or OS actuators.
 * - SLOW_PATH:
 *   1. Instant Vocal Acknowledgment (<300ms SLA) in Jarvis's signature voice.
 *   2. Non-blocking Asynchronous Multi-Agent Queue Handoff (Engineering, Reasoning, Shell).
 *   3. Secondary Synthesis Delivery: Vocal debrief exclusively in Jarvis's voice + rich structured HUD payload.
 */

import { WebSocket } from 'ws';
import {
  AgentRole,
  DualPathConfig,
  DualPathExecutionResponse,
  ExecutionPath,
  IntentClassificationResult,
  TaskDomain,
  SecondarySynthesisPayload
} from './dual_path_types';
import { IntentRouter } from './intent_router';
import { FillerAudioSynthesizer } from './filler_audio_synthesizer';
import { MultiAgentPool } from './multi_agent_pool';
import { dispatchSystemControl, isSystemControl } from './system_controls';

export type DelegationExecutor = (params: {
  agentId: string;
  prompt: string;
  sessionId?: string;
  clientWs: WebSocket;
}) => Promise<any>;

export class DualPathOrchestrator {
  private intentRouter: IntentRouter;
  private fillerSynthesizer: FillerAudioSynthesizer;
  private agentPool: MultiAgentPool;
  private personaVoice: string;
  private activeTaskByWs: Map<WebSocket, string> = new Map();
  private delegationExecutor: DelegationExecutor | null = null;

  constructor(options?: {
    intentRouter?: IntentRouter;
    fillerSynth?: FillerAudioSynthesizer;
    agentPool?: MultiAgentPool;
    config?: DualPathConfig;
    delegationExecutor?: DelegationExecutor;
  }) {
    this.personaVoice = options?.config?.personaVoice || 'Puck';
    this.intentRouter = options?.intentRouter || new IntentRouter();
    this.fillerSynthesizer = options?.fillerSynth || new FillerAudioSynthesizer(this.personaVoice);
    this.agentPool = options?.agentPool || new MultiAgentPool({ maxConcurrent: options?.config?.maxConcurrentAgents || 2 });
    this.delegationExecutor = options?.delegationExecutor || null;
  }

  /**
   * Sets or updates the active persona voice (strictly maintains Jarvis voice consistency).
   */
  public setVoiceName(voiceName: string): void {
    this.personaVoice = voiceName;
  }

  /**
   * Processes streaming speech transcript fragments or complete user utterances.
   */
  public async processUtterance(
    utterance: string,
    clientWs: WebSocket | null,
    context?: { runMemoryBridge?: (args: string[]) => Promise<any> }
  ): Promise<DualPathExecutionResponse> {
    const text = utterance.trim();
    if (!text) {
      return {
        path: ExecutionPath.FAST_PATH,
        classification: {
          path: ExecutionPath.FAST_PATH,
          domain: 'general',
          confidence: 1.0,
          reason: 'Empty utterance',
          latencyMs: 0
        }
      };
    }

    // 1. Zero-Latency Asynchronous Intent Routing (<100ms)
    const classification = await this.intentRouter.classify(text);

    // =================================================================
    // PATH A: FAST_PATH PIPELINE (<10ms Native C++ / OS Actuators)
    // =================================================================
    if (classification.path === ExecutionPath.FAST_PATH) {
      const fastResult = await this.executeFastPath(text, clientWs, context?.runMemoryBridge);
      return {
        path: ExecutionPath.FAST_PATH,
        classification,
        fastPathResult: fastResult
      };
    }

    // =================================================================
    // PATH C: DELEGATION_PATH PIPELINE (Explicit Agent Delegation)
    // =================================================================
    if (classification.path === ExecutionPath.DELEGATION_PATH) {
      if (!clientWs || clientWs.readyState !== WebSocket.OPEN) {
        return {
          path: ExecutionPath.DELEGATION_PATH,
          classification,
          taskId: `delegation_${Date.now()}`,
          error: 'No active WebSocket for delegation'
        };
      }

      if (!this.delegationExecutor) {
        console.warn('[DualPathOrchestrator] DELEGATION_PATH triggered but no delegationExecutor configured');
        return {
          path: ExecutionPath.DELEGATION_PATH,
          classification,
          taskId: `delegation_${Date.now()}`,
          error: 'Delegation executor not configured'
        };
      }

      const classificationWithTarget = classification as IntentClassificationResult & { targetAgent?: string };
      const targetAgent = classificationWithTarget.targetAgent || 'hermes';
      const taskId = `delegation_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // Inject instant vocal filler (<300ms SLA)
      let fillerSent = false;
      fillerSent = await this.injectInstantVocalFiller(classification.domain, text, clientWs);

      // Execute delegation asynchronously
      this.delegationExecutor({
        agentId: targetAgent,
        prompt: text,
        clientWs
      }).then(async (result) => {
        await this.deliverSecondarySynthesis(taskId, text, {
          output: result,
          durationMs: result.durationMs || 0,
          agentRole: AgentRole.ENGINEER,
          providerUsed: targetAgent
        }, clientWs);
      }).catch(async (err) => {
        console.error('[DualPathOrchestrator] Delegation failed:', err);
        if (clientWs && clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({
            type: 'delegation_failed',
            taskId,
            agentId: targetAgent,
            error: err?.message || String(err)
          }));
        }
      });

      return {
        path: ExecutionPath.DELEGATION_PATH,
        classification,
        taskId,
        vocalFillerSent: fillerSent
      };
    }

    // =================================================================
    // PATH B: SLOW_PATH PIPELINE (The Instant Fallback Trick & Agents)
    // =================================================================
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Task 1: Instant Vocal Acknowledgment (<300ms SLA)
    let fillerSent = false;
    if (clientWs && clientWs.readyState === WebSocket.OPEN) {
      fillerSent = await this.injectInstantVocalFiller(classification.domain, text, clientWs);
      this.activeTaskByWs.set(clientWs, taskId);
    }

    // Task 2: Asynchronous Agentic Queue Handoff
    const agentRole = this.mapDomainToAgentRole(classification.domain);
    this.agentPool.submitTask({
      id: taskId,
      title: text,
      role: agentRole,
      domain: classification.domain,
      payload: {
        prompt: text,
        command: classification.domain === 'shell' ? text : undefined
      }
    }).then(async () => {
      // Task 3: Secondary Synthesis Delivery upon completion
      try {
        const result = await this.agentPool.waitForTask(taskId, 30000);
        await this.deliverSecondarySynthesis(taskId, text, result, clientWs);
      } catch (err: any) {
        console.warn(`[DualPathOrchestrator] Secondary synthesis error for ${taskId}:`, err?.message || err);
      } finally {
        if (clientWs) this.activeTaskByWs.delete(clientWs);
      }
    }).catch(err => {
      console.error('[DualPathOrchestrator] Failed to queue task:', err);
    });

    return {
      path: ExecutionPath.SLOW_PATH,
      classification,
      taskId,
      vocalFillerSent: fillerSent
    };
  }

  /**
   * Executes fast-path commands immediately using whole_controls native workers.
   */
  private async executeFastPath(
    text: string,
    clientWs: WebSocket | null,
    memoryBridgeRunner?: (args: string[]) => Promise<any>
  ): Promise<any> {
    const lower = text.toLowerCase();
    let result: any = null;

    try {
      // 1. Volume
      if (lower.includes('volume')) {
        const match = lower.match(/\b(\d{1,3})\b/);
        const vol = match ? parseInt(match[1], 10) : undefined;
        if (vol !== undefined) {
          result = await dispatchSystemControl('set_system_volume', { volume: vol });
        } else {
          result = await dispatchSystemControl('get_system_volume', {});
        }
      }
      // 2. Brightness
      else if (lower.includes('brightness')) {
        const match = lower.match(/\b(\d{1,3})\b/);
        const br = match ? parseInt(match[1], 10) : undefined;
        if (br !== undefined) {
          result = await dispatchSystemControl('set_display_brightness', { brightness: br });
        } else {
          result = await dispatchSystemControl('get_display_brightness', {});
        }
      }
      // 3. Telemetry / Specs
      else if (lower.includes('telemetry') || lower.includes('cpu') || lower.includes('ram')) {
        result = await dispatchSystemControl('get_system_telemetry', {});
      } else if (lower.includes('spec')) {
        result = await dispatchSystemControl('get_pc_specs', {});
      }
      // 4. Memory query
      else if ((lower.includes('search memory') || lower.includes('recall')) && memoryBridgeRunner) {
        result = await memoryBridgeRunner(['search', text, '5']);
      }
      // 5. Text Deletion & Input Editing
      else if (/\b(delete text|clear text|backspace|erase text|delete that|clear input|delete word|clear line)\b/i.test(lower)) {
        let mode: 'backspace' | 'delete' | 'word' | 'line' | 'all' = 'backspace';
        let count = 1;
        if (/all|everything|entire/i.test(lower)) {
          mode = 'all';
        } else if (/word/i.test(lower)) {
          mode = 'word';
        } else if (/line/i.test(lower)) {
          mode = 'line';
        } else if (/forward|delete\s+key/i.test(lower)) {
          mode = 'delete';
        }
        const numMatch = lower.match(/\b(\d+)\b/);
        if (numMatch) {
          count = parseInt(numMatch[1], 10);
        }
        result = await dispatchSystemControl('delete_text', { mode, count });
      }
      // 6. Memory Clear / Wipe / Reset
      else if (/\b(clear\s+memory|wipe\s+memory|erase\s+memory|reset\s+memory|forget\s+everything|clear\s+all\s+memory)\b/i.test(lower) && memoryBridgeRunner) {
        let cat = 'all';
        if (/personal/i.test(lower)) cat = 'personal_data';
        else if (/pref/i.test(lower)) cat = 'preferences';
        else if (/instruction/i.test(lower)) cat = 'instructions';
        result = await memoryBridgeRunner(['clear_memory', cat, 'all']);
      }

      if (result && clientWs && clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          type: 'fast_path_executed',
          command: text,
          result,
          timestamp: new Date().toISOString()
        }));
      }
    } catch (err: any) {
      console.warn('[DualPathOrchestrator] Fast path execution error:', err?.message || err);
    }

    return result || { executed: true, handledLocally: true };
  }

  /**
   * Injects the instant verbal filler phrase in <300ms directly into the client WebSocket.
   */
  private async injectInstantVocalFiller(
    domain: TaskDomain,
    contextText: string,
    clientWs: WebSocket
  ): Promise<boolean> {
    try {
      const snippet = await this.fillerSynthesizer.getFillerSnippet(domain, contextText);

      // 1. Send Audio Chunk (24kHz signed 16-bit linear PCM)
      clientWs.send(JSON.stringify({
        type: 'audio',
        audio: snippet.audioBase64,
        isVocalFiller: true,
        sampleRate: snippet.sampleRate
      }));

      // 2. Send Spoken Transcript Chunk for HUD
      clientWs.send(JSON.stringify({
        type: 'output_transcription',
        text: snippet.text,
        isVocalFiller: true
      }));

      return true;
    } catch (err) {
      console.error('[DualPathOrchestrator] Failed to inject vocal filler:', err);
      return false;
    }
  }

  /**
   * Delivers the secondary synthesis payload:
   * 1. High-fidelity spoken audio summary exclusively in Jarvis's persona voice.
   * 2. Structured JSON payload for HUD code/task view.
   */
  private async deliverSecondarySynthesis(
    taskId: string,
    prompt: string,
    result: any,
    clientWs: WebSocket | null
  ): Promise<void> {
    if (!clientWs || clientWs.readyState !== WebSocket.OPEN) {
      return;
    }

    const outputText = typeof result.output === 'string' ? result.output : JSON.stringify(result.output, null, 2);

    // Format concise verbal debrief for Jarvis to speak aloud
    const spokenDebrief = `Task completed, Sir. ${outputText.length > 250 ? outputText.slice(0, 220) + '... Full results displayed on your console.' : outputText}`;

    // Synthesize spoken debrief in Jarvis's exact voice
    const synthAudio = await this.fillerSynthesizer.synthesizeJarvisSpeech(spokenDebrief, this.personaVoice);

    // Stream Jarvis spoken response frames
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({
        type: 'audio',
        audio: synthAudio.audioBase64,
        isSecondarySynthesis: true,
        sampleRate: 24000
      }));

      clientWs.send(JSON.stringify({
        type: 'output_transcription',
        text: spokenDebrief,
        isSecondarySynthesis: true
      }));

      // Send structured completion payload
      const payload: SecondarySynthesisPayload = {
        type: 'slow_path_completed',
        taskId,
        taskTitle: prompt,
        result: outputText,
        durationMs: result.durationMs,
        agentRole: result.agentRole,
        providerUsed: result.providerUsed || 'MultiAgentPool',
        logs: result.logs || []
      };

      clientWs.send(JSON.stringify(payload));
    }
  }

  /**
   * Handles user barge-in / speech interruption:
   * Immediately aborts active slow-path task and resets state.
   */
  public handleInterruption(clientWs?: WebSocket | null): void {
    if (clientWs) {
      const activeTaskId = this.activeTaskByWs.get(clientWs);
      if (activeTaskId) {
        console.log(`[DualPathOrchestrator] User interrupted: Aborting active task '${activeTaskId}'`);
        this.agentPool.abortTask(activeTaskId, 'Interrupted by user speech');
        this.activeTaskByWs.delete(clientWs);
      }
    }
  }

  private mapDomainToAgentRole(domain: TaskDomain): AgentRole {
    switch (domain) {
      case 'code':
        return AgentRole.ENGINEER;
      case 'shell':
        return AgentRole.SHELL_RUNNER;
      case 'memory':
      case 'diagnostics':
        return AgentRole.REASONING;
      default:
        return AgentRole.ENGINEER;
    }
  }

  public getAgentPool(): MultiAgentPool {
    return this.agentPool;
  }

  public getIntentRouter(): IntentRouter {
    return this.intentRouter;
  }

  public setDelegationExecutor(executor: DelegationExecutor): void {
    this.delegationExecutor = executor;
  }
}
export const dualPathOrchestrator = new DualPathOrchestrator({
  delegationExecutor: async (params) => {
    // This will be overridden by server.ts after initialization
    console.warn('[DualPathOrchestrator] delegationExecutor not wired — delegation will fail');
    return { error: 'Delegation not wired' };
  }
});
