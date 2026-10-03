/**
 * J.A.R.V.I.S. Cognitive Architecture — Type Definitions
 *
 * Core types for the ReAct reasoning loop, working memory, tool registry,
 * and goal decomposition. These replace the one-shot dispatcher model with
 * a Think → Act → Observe → Reflect iterative agent architecture.
 */

// ─── ReAct Loop Types ────────────────────────────────────────────────

export interface CognitiveStep {
  /** Sequential index within the current task (0-based) */
  index: number;
  /** LLM's internal reasoning about what to do next */
  thought: string;
  /** The tool/action the agent chose to execute */
  action: string;
  /** Arguments passed to the tool */
  actionInput: Record<string, any>;
  /** Raw result returned by the tool */
  observation: string;
  /** Duration of the action execution in milliseconds */
  durationMs: number;
  /** ISO timestamp when the step completed */
  timestamp: string;
}

export type CognitiveOutcome =
  | { type: 'final_answer'; answer: string; steps: CognitiveStep[]; totalDurationMs: number }
  | { type: 'max_iterations'; partialAnswer: string; steps: CognitiveStep[]; totalDurationMs: number }
  | { type: 'aborted'; reason: string; steps: CognitiveStep[]; totalDurationMs: number };

// ─── Tool Registry ───────────────────────────────────────────────────

export interface AgentToolDef {
  /** Unique tool name (e.g. 'run_shell_command', 'read_file') */
  name: string;
  /** Human-readable description for the LLM to understand when to use this tool */
  description: string;
  /** JSON schema for the tool's parameters */
  parameters: Record<string, any>;
}

export type AgentToolExecutor = (
  toolName: string,
  args: Record<string, any>,
  abortSignal?: AbortSignal
) => Promise<string>;

// ─── Working Memory (Scratchpad) ─────────────────────────────────────

export interface WorkingMemory {
  /** The top-level goal the agent is working toward */
  currentGoal: string | null;

  /** The active execution plan (if goal was decomposed) */
  currentPlan: TaskPlan | null;

  /** Completed ReAct steps for the current task */
  completedSteps: CognitiveStep[];

  /** User facts and preferences persisted across sessions */
  userFacts: Record<string, string>;

  /** Lessons learned from past execution episodes */
  learnedRules: string[];

  /** Recent errors and how they were resolved (for self-correction) */
  recentErrors: Array<{
    tool: string;
    error: string;
    resolution: string;
    timestamp: string;
  }>;

  /** Timestamp of last update */
  lastUpdated: string;
}

// ─── Goal Decomposition ──────────────────────────────────────────────

export interface SubTask {
  id: string;
  description: string;
  /** IDs of subtasks that must complete before this one can start */
  dependencies: string[];
  status: 'pending' | 'running' | 'done' | 'failed' | 'skipped';
  result?: string;
  error?: string;
  /** The cognitive outcome if this subtask was solved by a ReAct loop */
  cognitiveOutcome?: CognitiveOutcome;
}

export interface TaskPlan {
  goal: string;
  subtasks: SubTask[];
  /** ISO timestamp when the plan was created */
  createdAt: string;
  /** ISO timestamp of last modification (replanning, status change) */
  updatedAt: string;
}

// ─── Progress Events (for HUD / WebSocket streaming) ─────────────────

export type CognitiveEvent =
  | { type: 'thinking'; thought: string; stepIndex: number }
  | { type: 'acting'; tool: string; args: Record<string, any>; stepIndex: number }
  | { type: 'observing'; observation: string; stepIndex: number; durationMs: number }
  | { type: 'replanning'; reason: string; newPlan: TaskPlan }
  | { type: 'subtask_started'; subtaskId: string; description: string }
  | { type: 'subtask_completed'; subtaskId: string; result: string }
  | { type: 'subtask_failed'; subtaskId: string; error: string }
  | { type: 'goal_completed'; answer: string; totalSteps: number; totalDurationMs: number }
  | { type: 'goal_failed'; reason: string; totalSteps: number; totalDurationMs: number };
