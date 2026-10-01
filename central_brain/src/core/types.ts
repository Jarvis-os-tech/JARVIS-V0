/**
 * Core Data Contracts & Interfaces for Central Brain
 * Sovereign Multi-Agent Memory & Observability Platform
 */

export interface RawBrainEvent {
  id: string;
  agentId: string;
  sessionId: string;
  timestamp: string;
  payload: string;
  sourcePath: string;
  hash?: string;
  metadata?: Record<string, any>;
}

export interface NormalizedBrainEvent {
  id: string;
  agentId: string;
  sessionId: string;
  timestamp: string;
  cleanedPayload: string;
  sourcePath: string;
  hash: string;
  metadata?: Record<string, any>;
}

export interface DistilledSummary {
  summary: string;
  keyDecisions: string[];
  artifacts: string[];
  metrics: {
    rawTokens: number;
    distilledTokens: number;
    compressionRatio: number; // e.g. 0.85 (85% savings)
    engine: 'semantic_llm' | 'deterministic_fallback';
  };
}

export interface BrainLedgerRecord {
  id: string;
  agent_id: string;
  session_id: string;
  timestamp: string;
  raw_tokens: number;
  distilled_tokens: number;
  summary: string;
  artifacts: string; // JSON array string
  event_hash: string;
  source_path: string;
}

export interface AgentStatus {
  agentId: string;
  role: string;
  status: 'AUTO_CONNECTED' | 'LISTENING' | 'OFFLINE' | 'DISCOVERED';
  runtimePath: string;
  lastActive: string;
  totalEvents?: number;
}

export interface CircuitBreakerState {
  status: 'STANDBY' | 'ACTIVE';
  lastToggled: string;
  reason: string;
  port: number;
  jarvisPort: number;
}

export interface TelemetryPayload {
  type: 'EVENT_INGESTED' | 'EVENT_DISTILLED' | 'LEDGER_INDEXED' | 'RECORD_PURGED' | 'CIRCUIT_BREAKER_UPDATED' | 'AGENTS_DISCOVERED';
  data: any;
  timestamp: string;
}
