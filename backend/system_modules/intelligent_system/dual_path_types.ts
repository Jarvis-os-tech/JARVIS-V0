/**
 * J.A.R.V.I.S. Multi-Agent Dual-Path Execution Engine - Type Definitions
 * 
 * Strict type safety for Zero-Latency Routing, Instant Vocal Acknowledgment,
 * Asynchronous Agentic Queue Handoff, and Secondary Synthesis Delivery.
 */

import { WebSocket } from 'ws';

export enum ExecutionPath {
  FAST_PATH = 'FAST_PATH',
  SLOW_PATH = 'SLOW_PATH'
}

export enum TaskStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum AgentRole {
  ORCHESTRATOR = 'ORCHESTRATOR',
  ENGINEER = 'ENGINEER',
  REASONING = 'REASONING',
  SHELL_RUNNER = 'SHELL_RUNNER',
  RESEARCHER = 'RESEARCHER',
  SYNTHESIZER = 'SYNTHESIZER'
}

export type TaskDomain = 'code' | 'shell' | 'diagnostics' | 'general' | 'memory' | 'os_control';

export interface IntentClassificationResult {
  path: ExecutionPath;
  domain: TaskDomain;
  confidence: number;
  reason: string;
  suggestedAction?: string;
  latencyMs: number;
  tokensEvaluated?: number;
}

export interface FillerAudioSnippet {
  text: string;
  audioBase64: string;
  sampleRate: number; // 24000 Hz
  format: string;     // 'audio/pcm;rate=24000'
  durationMs: number;
  domain: TaskDomain;
}

export interface AgentTask {
  id: string;
  title: string;
  role: AgentRole;
  domain?: TaskDomain;
  payload: {
    prompt?: string;
    command?: string;
    script?: string;
    args?: Record<string, any>;
    context?: string;
  };
  status: TaskStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  abortController?: AbortController;
  result?: any;
  error?: string;
  logs?: string[];
}

export interface AgentTaskResult {
  taskId: string;
  status: TaskStatus;
  output: string;
  rawPayload?: any;
  durationMs: number;
  agentRole: AgentRole;
  providerUsed?: string;
  modelUsed?: string;
  logs: string[];
}

export interface DualPathConfig {
  maxConcurrentAgents?: number;
  routingTimeoutMs?: number;
  slowPathTimeoutMs?: number;
  groqModel?: string;
  geminiModel?: string;
  nvidiaModel?: string;
  omniRouteModel?: string;
  personaVoice?: string;
}

export interface DualPathExecutionResponse {
  path: ExecutionPath;
  classification: IntentClassificationResult;
  fastPathResult?: any;
  taskId?: string;
  vocalFillerSent?: boolean;
}

export interface SecondarySynthesisPayload {
  type: 'slow_path_completed';
  taskId: string;
  taskTitle: string;
  result: string;
  audio?: string;
  outputTranscription?: string;
  durationMs: number;
  agentRole: AgentRole;
  providerUsed?: string;
  logs: string[];
}
