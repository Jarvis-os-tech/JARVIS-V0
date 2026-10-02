/**
 * J.A.R.V.I.S. Agent2Agent (A2A) Protocol - TypeScript Type Definitions
 * 
 * Directly aligned with the official A2A Specification (protocols/a2a/specification/a2a.proto).
 * Implements JSON-RPC 2.0 structures for inter-agent communication across:
 * - CLI Agents (Claude Code, Codex, OpenCode, OpenMuse, Hermes)
 * - IDE Agents (Orca IDE, Antigravity IDE, Cursor Agent)
 * - Web Agents (OpenManus, Chrome DevTools MCP)
 * - J.A.R.V.I.S. Central Host
 */

export type AgentDomain = 'cli' | 'ide' | 'web' | 'core';

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  examples?: string[];
  parametersSchema?: Record<string, any>;
}

export interface AgentCapabilities {
  streaming?: boolean;
  pushNotifications?: boolean;
  statePersistence?: boolean;
  multiTurn?: boolean;
}

export interface AgentProvider {
  organization: string;
  url?: string;
}

export interface AgentCard {
  name: string;
  description: string;
  url: string;
  version: string;
  domain: AgentDomain;
  defaultInputModes: string[];
  defaultOutputModes: string[];
  capabilities: AgentCapabilities;
  skills: AgentSkill[];
  provider?: AgentProvider;
  icon?: string;
  status?: 'active' | 'busy' | 'offline' | 'error';
  lastSeen?: number;
}

export type A2ATaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'input_required';

export interface A2AMessage {
  role: 'user' | 'agent' | 'system';
  content: string;
  contentType?: string; // 'text/plain', 'application/json', etc.
  timestamp?: number;
}

export interface A2ATask {
  id: string;
  sessionId: string;
  sourceAgent: string;
  targetAgent: string;
  domain: AgentDomain;
  prompt: string;
  status: A2ATaskStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  messages: A2AMessage[];
  output?: string;
  error?: string;
  metadata?: Record<string, any>;
  logs: string[];
}

export interface A2ARequest<T = any> {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params: T;
}

export interface A2ASuccessResponse<T = any> {
  jsonrpc: '2.0';
  id: string | number;
  result: T;
}

export interface A2AErrorResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  error: {
    code: number;
    message: string;
    data?: any;
  };
}

export type A2AResponse<T = any> = A2ASuccessResponse<T> | A2AErrorResponse;

export interface TaskSendParams {
  targetAgent: string;
  prompt: string;
  sessionId?: string;
  context?: Record<string, any>;
  stream?: boolean;
  pushUrl?: string;
}

export interface A2AEvent {
  taskId: string;
  type: 'status_changed' | 'token_stream' | 'step_progress' | 'log' | 'completed' | 'error';
  agent: string;
  domain: AgentDomain;
  payload: any;
  timestamp: number;
}
