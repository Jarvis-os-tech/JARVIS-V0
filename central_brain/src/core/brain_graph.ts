import crypto from 'crypto';
import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { RawBrainEvent, NormalizedBrainEvent, DistilledSummary, BrainLedgerRecord } from './types.js';
import { isEventDuplicate, registerEventHash, insertLedgerRecord } from './db.js';
import { defaultDistiller } from './distillation_engine.js';
import { syncMasterIndexFiles } from './master_index_sync.js';

export const BrainStateAnnotation = Annotation.Root({
  rawEvent: Annotation<RawBrainEvent | null>({
    default: () => null,
    reducer: (_, next) => next,
  }),
  normalizedEvent: Annotation<NormalizedBrainEvent | null>({
    default: () => null,
    reducer: (_, next) => next,
  }),
  distilledSummary: Annotation<DistilledSummary | null>({
    default: () => null,
    reducer: (_, next) => next,
  }),
  auditPassed: Annotation<boolean>({
    default: () => true,
    reducer: (_, next) => next,
  }),
  circuitBreakerOpen: Annotation<boolean>({
    default: () => false,
    reducer: (_, next) => next,
  }),
  errors: Annotation<string[]>({
    default: () => [],
    reducer: (curr, next) => curr.concat(next),
  }),
});

/**
 * Node 1: Discovery & Normalization Sentinel
 * Cleans payload, generates idempotency SHA-256 hash, filters duplicates
 */
async function discoveryNode(state: typeof BrainStateAnnotation.State) {
  const raw = state.rawEvent;
  if (!raw || !raw.payload || raw.payload.includes('\0')) {
    return {
      auditPassed: false,
      errors: ['Invalid, empty, or binary raw event payload rejected']
    };
  }

  const cleaned = raw.payload.trim();
  const hash = crypto.createHash('sha256').update(`${raw.agentId}:${cleaned}`).digest('hex');

  // Deduplication check
  if (isEventDuplicate(hash)) {
    return {
      auditPassed: false,
      errors: [`Duplicate event detected with hash: ${hash.slice(0, 12)}...`]
    };
  }

  const normalized: NormalizedBrainEvent = {
    id: raw.id || crypto.randomUUID(),
    agentId: raw.agentId || 'unknown_agent',
    sessionId: raw.sessionId || `session_${Date.now()}`,
    timestamp: raw.timestamp || new Date().toISOString(),
    cleanedPayload: cleaned,
    sourcePath: raw.sourcePath || 'stream',
    hash,
    metadata: raw.metadata
  };

  return {
    normalizedEvent: normalized,
    auditPassed: true
  };
}

/**
 * Node 2: Distillation & Token Compression Agent
 * Real Semantic LLM primary with deterministic extractive fallback
 */
async function distillerNode(state: typeof BrainStateAnnotation.State) {
  if (!state.auditPassed || !state.normalizedEvent) {
    return {};
  }

  const norm = state.normalizedEvent;
  try {
    const distilled = await defaultDistiller.distill(norm.agentId, norm.cleanedPayload);
    return {
      distilledSummary: distilled
    };
  } catch (err: any) {
    return {
      errors: [`Distillation error: ${err.message}`]
    };
  }
}

/**
 * Node 3: Memory Indexer & Graph Weaver (Fixture B)
 * Inserts into SQLite WAL and synchronizes master_index.json & master_index.md
 */
async function indexerNode(state: typeof BrainStateAnnotation.State) {
  if (!state.auditPassed || !state.normalizedEvent || !state.distilledSummary) {
    return {};
  }

  const norm = state.normalizedEvent;
  const dist = state.distilledSummary;

  const record: BrainLedgerRecord = {
    id: norm.id,
    agent_id: norm.agentId,
    session_id: norm.sessionId,
    timestamp: norm.timestamp,
    raw_tokens: dist.metrics.rawTokens,
    distilled_tokens: dist.metrics.distilledTokens,
    summary: dist.summary,
    artifacts: JSON.stringify(dist.artifacts),
    event_hash: norm.hash,
    source_path: norm.sourcePath
  };

  // 1. Insert into SQLite WAL database
  insertLedgerRecord(record);

  // 2. Register hash for deduplication
  registerEventHash(norm.hash, norm.id, norm.agentId);

  // 3. Atomically synchronize dual-format master indices to disk (Fixture B)
  syncMasterIndexFiles();

  return {};
}

/**
 * Node 4: Quality Audit & Curation Sentinel
 */
async function curationNode(state: typeof BrainStateAnnotation.State) {
  // Quality audit: ensure metrics are non-negative and summary is recorded
  if (state.distilledSummary && state.distilledSummary.metrics.rawTokens < 0) {
    return {
      errors: ['Audit Warning: anomalous token calculation detected']
    };
  }
  return {};
}

/**
 * Conditional router: abort processing if discovery / dedup fails
 */
function routeAfterDiscovery(state: typeof BrainStateAnnotation.State): string {
  if (!state.auditPassed) {
    return END;
  }
  return 'distiller';
}

/**
 * Builds the compiled Central Brain StateGraph supervisor
 */
export function buildCentralBrainGraph() {
  const workflow = new StateGraph(BrainStateAnnotation)
    .addNode('discovery', discoveryNode)
    .addNode('distiller', distillerNode)
    .addNode('indexer', indexerNode)
    .addNode('curator', curationNode)
    .addEdge(START, 'discovery')
    .addConditionalEdges('discovery', routeAfterDiscovery, {
      distiller: 'distiller',
      [END]: END,
    })
    .addEdge('distiller', 'indexer')
    .addEdge('indexer', 'curator')
    .addEdge('curator', END);

  return workflow.compile();
}

export const brainGraph = buildCentralBrainGraph();
