/**
 * J.A.R.V.I.S. Cognitive Loop — ReAct Reasoning Engine
 *
 * The core agentic primitive. Transforms J.A.R.V.I.S. from a "tool dispatcher"
 * into a reasoning agent that iterates Think → Act → Observe until the goal is met.
 *
 * Architecture:
 *   1. THINK  — LLM reasons about the current state and decides next action
 *   2. ACT    — Execute the chosen tool with parsed arguments
 *   3. OBSERVE — Capture and interpret the result
 *   4. REFLECT — Update working memory; check if goal is met
 *   5. REPEAT — Loop until final answer, max iterations, or abort
 *
 * The LLM is given:
 *   - The original goal
 *   - Available tools (with schemas)
 *   - Working memory context (prior steps, user facts, learned rules)
 *   - The scratchpad of all Think/Act/Observe cycles so far
 *
 * This replaces the one-shot `generateContent()` calls in MultiAgentPool.
 */

import { GoogleGenAI } from '@google/genai';
import type {
  CognitiveStep,
  CognitiveOutcome,
  CognitiveEvent,
  AgentToolDef,
  AgentToolExecutor
} from './cognitive_types';
import { workingMemory } from './working_memory';
import { KeyPoolRotator } from './key_pool_rotator';

// ─── Configuration ───────────────────────────────────────────────────

export interface CognitiveLoopConfig {
  /** Model to use for reasoning (default: gemini-2.5-flash) */
  model?: string;
  /** Maximum Think→Act→Observe iterations before returning partial answer */
  maxIterations?: number;
  /** Per-action execution timeout in milliseconds (default: 30000) */
  actionTimeoutMs?: number;
  /** Name of the agent persona for prompting (default: 'J.A.R.V.I.S.') */
  agentName?: string;
  /** System instructions prepended to every reasoning call */
  systemPreamble?: string;
  /** Abort signal from the parent orchestrator */
  abortSignal?: AbortSignal;
  /** Callback for streaming progress events to the HUD */
  onEvent?: (event: CognitiveEvent) => void;
}

const DEFAULT_CONFIG: Required<Omit<CognitiveLoopConfig, 'abortSignal' | 'onEvent' | 'systemPreamble'>> = {
  model: 'gemini-2.5-flash',
  maxIterations: 10,
  actionTimeoutMs: 30_000,
  agentName: 'J.A.R.V.I.S.',
};

// ─── Prompt Templates ────────────────────────────────────────────────

function buildSystemPrompt(
  agentName: string,
  tools: AgentToolDef[],
  preamble?: string
): string {
  const toolDescriptions = tools.map(t =>
    `- **${t.name}**: ${t.description}\n  Parameters: ${JSON.stringify(t.parameters)}`
  ).join('\n');

  return `${preamble ? preamble + '\n\n' : ''}You are ${agentName}, an autonomous reasoning agent. You solve complex tasks by iterating through a Think → Act → Observe loop.

AVAILABLE TOOLS:
${toolDescriptions}

RESPONSE FORMAT:
You MUST respond in EXACTLY ONE of these two JSON formats:

**Format A — Take an Action:**
\`\`\`json
{
  "thought": "Your reasoning about what to do next and why",
  "action": "tool_name",
  "action_input": { "param1": "value1" }
}
\`\`\`

**Format B — Deliver Final Answer (when the goal is fully achieved):**
\`\`\`json
{
  "thought": "Explanation of why the goal is now complete",
  "final_answer": "The complete answer or summary for the user"
}
\`\`\`

RULES:
1. ALWAYS reason step-by-step in "thought" before choosing an action.
2. After each Observation, reflect on whether you've achieved the goal or need another step.
3. If a tool fails, analyze the error in your next "thought" and try an alternative approach.
4. When the goal is fully achieved, respond with Format B immediately — do NOT take unnecessary extra actions.
5. Keep tool arguments minimal and precise.
6. Never invent tool names — only use tools from the AVAILABLE TOOLS list above.
7. If you cannot achieve the goal with available tools, explain why in a final_answer.`;
}

function buildReasoningPrompt(
  goal: string,
  scratchpad: CognitiveStep[],
  memoryContext: string
): string {
  const parts: string[] = [];

  if (memoryContext) {
    parts.push(memoryContext);
    parts.push('');
  }

  parts.push(`GOAL: ${goal}`);
  parts.push('');

  if (scratchpad.length > 0) {
    parts.push('SCRATCHPAD (previous steps):');
    for (const step of scratchpad) {
      parts.push(`--- Step ${step.index} ---`);
      parts.push(`Thought: ${step.thought}`);
      parts.push(`Action: ${step.action}(${JSON.stringify(step.actionInput)})`);
      parts.push(`Observation: ${step.observation}`);
      parts.push('');
    }
  }

  parts.push('Now reason about the next step. Respond with a JSON object (Format A or Format B).');

  return parts.join('\n');
}

// ─── Response Parser ─────────────────────────────────────────────────

interface ParsedAction {
  thought: string;
  action: string;
  actionInput: Record<string, any>;
}

interface ParsedFinalAnswer {
  thought: string;
  finalAnswer: string;
}

type ParsedResponse = 
  | { type: 'action'; data: ParsedAction }
  | { type: 'final_answer'; data: ParsedFinalAnswer }
  | { type: 'parse_error'; raw: string; error: string };

function parseReasoningResponse(text: string): ParsedResponse {
  // Try to extract JSON from the response (handling markdown code fences)
  let jsonStr = text.trim();

  // Strip markdown code fences
  const jsonBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    jsonStr = jsonBlockMatch[1].trim();
  }

  // Try direct JSON parse
  try {
    const parsed = JSON.parse(jsonStr);

    if (parsed.final_answer !== undefined) {
      return {
        type: 'final_answer',
        data: {
          thought: parsed.thought || '',
          finalAnswer: parsed.final_answer
        }
      };
    }

    if (parsed.action) {
      return {
        type: 'action',
        data: {
          thought: parsed.thought || '',
          action: parsed.action,
          actionInput: parsed.action_input || {}
        }
      };
    }

    return { type: 'parse_error', raw: text, error: 'JSON found but missing action or final_answer field' };
  } catch {
    // Try extracting JSON object from mixed text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.final_answer !== undefined) {
          return {
            type: 'final_answer',
            data: { thought: parsed.thought || '', finalAnswer: parsed.final_answer }
          };
        }
        if (parsed.action) {
          return {
            type: 'action',
            data: {
              thought: parsed.thought || '',
              action: parsed.action,
              actionInput: parsed.action_input || {}
            }
          };
        }
      } catch { /* fall through */ }
    }

    return { type: 'parse_error', raw: text, error: 'Could not extract valid JSON from LLM response' };
  }
}

// ─── Core Loop ───────────────────────────────────────────────────────

export class CognitiveLoop {
  private geminiKeyRotator: KeyPoolRotator;

  constructor() {
    this.geminiKeyRotator = new KeyPoolRotator('GEMINI_API_KEY');
  }

  /**
   * Solves a goal by iterating through the ReAct loop until completion.
   *
   * @param goal     - Natural language description of what needs to be achieved
   * @param tools    - Available tool definitions the agent can use
   * @param executor - Function that actually executes a tool call
   * @param config   - Loop configuration (model, max iterations, etc.)
   * @returns        - CognitiveOutcome with the final answer and step trace
   */
  public async solve(
    goal: string,
    tools: AgentToolDef[],
    executor: AgentToolExecutor,
    config: CognitiveLoopConfig = {}
  ): Promise<CognitiveOutcome> {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const scratchpad: CognitiveStep[] = [];
    const startTime = Date.now();

    // Set the goal in working memory
    workingMemory.setGoal(goal);

    // Build system prompt once
    const systemPrompt = buildSystemPrompt(cfg.agentName, tools, cfg.systemPreamble);

    // Get Gemini API key
    const apiKey = this.geminiKeyRotator.getActiveKey();
    if (!apiKey) {
      return {
        type: 'aborted',
        reason: 'No GEMINI_API_KEY available for reasoning',
        steps: [],
        totalDurationMs: Date.now() - startTime
      };
    }

    const ai = new GoogleGenAI({ apiKey });

    for (let iteration = 0; iteration < cfg.maxIterations; iteration++) {
      // Check abort
      if (cfg.abortSignal?.aborted) {
        return {
          type: 'aborted',
          reason: 'Aborted by user or orchestrator',
          steps: scratchpad,
          totalDurationMs: Date.now() - startTime
        };
      }

      // ── THINK ──────────────────────────────────────────────────
      const memoryContext = workingMemory.formatForPrompt();
      const reasoningPrompt = buildReasoningPrompt(goal, scratchpad, memoryContext);

      let reasoningText: string;
      try {
        const response = await ai.models.generateContent({
          model: cfg.model,
          contents: reasoningPrompt,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.1,
            maxOutputTokens: 1024
          }
        });
        reasoningText = response.text || '';
        this.geminiKeyRotator.reportSuccess(apiKey);
      } catch (err: any) {
        this.geminiKeyRotator.reportFailure(apiKey);
        return {
          type: 'aborted',
          reason: `Reasoning LLM error: ${err.message}`,
          steps: scratchpad,
          totalDurationMs: Date.now() - startTime
        };
      }

      // ── PARSE ──────────────────────────────────────────────────
      const parsed = parseReasoningResponse(reasoningText);

      if (parsed.type === 'final_answer') {
        cfg.onEvent?.({
          type: 'goal_completed',
          answer: parsed.data.finalAnswer,
          totalSteps: scratchpad.length,
          totalDurationMs: Date.now() - startTime
        });

        workingMemory.clearGoal();

        return {
          type: 'final_answer',
          answer: parsed.data.finalAnswer,
          steps: scratchpad,
          totalDurationMs: Date.now() - startTime
        };
      }

      if (parsed.type === 'parse_error') {
        // Treat unparseable response as a "thinking out loud" step
        // and give the LLM one more chance
        console.warn(`[CognitiveLoop] Parse error at step ${iteration}: ${parsed.error}`);

        const errorStep: CognitiveStep = {
          index: iteration,
          thought: parsed.raw.slice(0, 200),
          action: '_parse_error',
          actionInput: {},
          observation: `Parse error: ${parsed.error}. Please respond with valid JSON in Format A or Format B.`,
          durationMs: 0,
          timestamp: new Date().toISOString()
        };
        scratchpad.push(errorStep);
        workingMemory.recordStep(errorStep);
        continue;
      }

      // parsed.type === 'action'
      const { thought, action, actionInput } = parsed.data;

      cfg.onEvent?.({ type: 'thinking', thought, stepIndex: iteration });
      cfg.onEvent?.({ type: 'acting', tool: action, args: actionInput, stepIndex: iteration });

      // ── ACT ────────────────────────────────────────────────────
      let observation: string;
      const actionStart = Date.now();

      // Validate tool exists
      const toolExists = tools.some(t => t.name === action);
      if (!toolExists) {
        observation = `Error: Tool '${action}' does not exist. Available tools: ${tools.map(t => t.name).join(', ')}`;
      } else {
        try {
          // Execute with timeout
          observation = await Promise.race([
            executor(action, actionInput, cfg.abortSignal),
            new Promise<string>((_, reject) =>
              setTimeout(() => reject(new Error(`Tool '${action}' timed out after ${cfg.actionTimeoutMs}ms`)), cfg.actionTimeoutMs)
            )
          ]);
        } catch (err: any) {
          observation = `Error executing '${action}': ${err.message}`;

          // Record the error for self-correction
          workingMemory.recordError(action, err.message, 'Pending agent self-correction');
        }
      }

      const actionDurationMs = Date.now() - actionStart;

      // ── OBSERVE ────────────────────────────────────────────────
      cfg.onEvent?.({ type: 'observing', observation, stepIndex: iteration, durationMs: actionDurationMs });

      const step: CognitiveStep = {
        index: iteration,
        thought,
        action,
        actionInput,
        observation: observation.slice(0, 4000), // Bound observation length
        durationMs: actionDurationMs,
        timestamp: new Date().toISOString()
      };

      scratchpad.push(step);
      workingMemory.recordStep(step);
    }

    // ── MAX ITERATIONS REACHED ─────────────────────────────────────
    const totalDurationMs = Date.now() - startTime;

    // Ask for a final summary even if we hit the limit
    const lastObservations = scratchpad
      .slice(-3)
      .map(s => `[${s.action}]: ${s.observation.slice(0, 100)}`)
      .join('\n');

    cfg.onEvent?.({
      type: 'goal_failed',
      reason: `Reached max ${cfg.maxIterations} iterations`,
      totalSteps: scratchpad.length,
      totalDurationMs
    });

    workingMemory.clearGoal();

    return {
      type: 'max_iterations',
      partialAnswer: `Reached ${cfg.maxIterations} reasoning steps. Last observations:\n${lastObservations}`,
      steps: scratchpad,
      totalDurationMs
    };
  }
}

export const cognitiveLoop = new CognitiveLoop();
