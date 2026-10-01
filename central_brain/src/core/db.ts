import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { BrainLedgerRecord, AgentStatus, CircuitBreakerState } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'central_brain.db');

export const db: Database.Database = new Database(DB_PATH);

// Enable high-concurrency WAL mode and resilient timeouts
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');
db.pragma('synchronous = NORMAL');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS brain_ledger (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    raw_tokens INTEGER NOT NULL,
    distilled_tokens INTEGER NOT NULL,
    summary TEXT NOT NULL,
    artifacts TEXT DEFAULT '[]',
    event_hash TEXT,
    source_path TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_ledger_agent ON brain_ledger(agent_id);
  CREATE INDEX IF NOT EXISTS idx_ledger_timestamp ON brain_ledger(timestamp);
  CREATE INDEX IF NOT EXISTS idx_ledger_hash ON brain_ledger(event_hash);

  CREATE TABLE IF NOT EXISTS event_dedup (
    hash TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    timestamp TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_dedup_event_id ON event_dedup(event_id);

  CREATE TABLE IF NOT EXISTS agent_registry (
    agent_id TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    status TEXT NOT NULL,
    runtime_path TEXT,
    last_active TEXT
  );

  CREATE TABLE IF NOT EXISTS circuit_breaker (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    last_toggled TEXT NOT NULL,
    reason TEXT
  );
`);

// Ensure initial circuit breaker row exists (Default: STANDBY)
const existingBreaker = db.prepare('SELECT status FROM circuit_breaker WHERE id = ?').get('master');
if (!existingBreaker) {
  db.prepare(`
    INSERT INTO circuit_breaker (id, status, last_toggled, reason)
    VALUES (?, ?, ?, ?)
  `).run('master', 'STANDBY', new Date().toISOString(), 'Initial sovereign quarantine - J.A.R.V.I.S. sync standby');
}

/**
 * Checks if an event hash already exists in dedup table
 */
export function isEventDuplicate(hash: string): boolean {
  const row = db.prepare('SELECT hash FROM event_dedup WHERE hash = ?').get(hash);
  return !!row;
}

/**
 * Registers an event hash for deduplication
 */
export function registerEventHash(hash: string, eventId: string, agentId: string): void {
  db.prepare(`
    INSERT OR REPLACE INTO event_dedup (hash, event_id, agent_id, timestamp)
    VALUES (?, ?, ?, ?)
  `).run(hash, eventId, agentId, new Date().toISOString());
}

/**
 * Inserts a record into brain_ledger
 */
export function insertLedgerRecord(record: BrainLedgerRecord): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO brain_ledger 
    (id, agent_id, session_id, timestamp, raw_tokens, distilled_tokens, summary, artifacts, event_hash, source_path)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    record.id,
    record.agent_id,
    record.session_id,
    record.timestamp,
    record.raw_tokens,
    record.distilled_tokens,
    record.summary,
    record.artifacts,
    record.event_hash,
    record.source_path
  );
}

/**
 * Cascade Purge: Atomically deletes record from brain_ledger AND removes its
 * idempotency hash from event_dedup to allow clean re-ingestion if required.
 * Addresses Gap 4 / Fixture A.
 */
export function purgeLedgerRecordCascade(id: string): { success: boolean; eventHash?: string } {
  const target = db.prepare('SELECT id, event_hash FROM brain_ledger WHERE id = ?').get(id) as { id: string; event_hash: string } | undefined;
  if (!target) {
    return { success: false };
  }

  const cascadeTx = db.transaction(() => {
    // 1. Delete from ledger
    db.prepare('DELETE FROM brain_ledger WHERE id = ?').run(id);

    // 2. Delete from event_dedup using event_hash or event_id
    if (target.event_hash) {
      db.prepare('DELETE FROM event_dedup WHERE hash = ?').run(target.event_hash);
    }
    db.prepare('DELETE FROM event_dedup WHERE event_id = ?').run(id);
  });

  cascadeTx();
  return { success: true, eventHash: target.event_hash };
}

/**
 * Updates summary for a ledger entry
 */
export function updateLedgerSummary(id: string, newSummary: string): boolean {
  const info = db.prepare('UPDATE brain_ledger SET summary = ? WHERE id = ?').run(newSummary, id);
  return info.changes > 0;
}

/**
 * Fetches all ledger records ordered by timestamp descending
 */
export function getAllLedgerRecords(): BrainLedgerRecord[] {
  return db.prepare('SELECT * FROM brain_ledger ORDER BY timestamp DESC').all() as BrainLedgerRecord[];
}

/**
 * Fetches a single ledger record by ID
 */
export function getLedgerRecordById(id: string): BrainLedgerRecord | undefined {
  return db.prepare('SELECT * FROM brain_ledger WHERE id = ?').get(id) as BrainLedgerRecord | undefined;
}

/**
 * Upserts an agent in the registry
 */
export function upsertAgent(agent: AgentStatus): void {
  db.prepare(`
    INSERT INTO agent_registry (agent_id, role, status, runtime_path, last_active)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(agent_id) DO UPDATE SET
      role = excluded.role,
      status = excluded.status,
      runtime_path = excluded.runtime_path,
      last_active = excluded.last_active
  `).run(agent.agentId, agent.role, agent.status, agent.runtimePath, agent.lastActive);
}

/**
 * Fetches all registered agents with session counts
 */
export function getAllRegisteredAgents(): AgentStatus[] {
  const agents = db.prepare('SELECT * FROM agent_registry').all() as any[];
  return agents.map(a => {
    const countRow = db.prepare('SELECT COUNT(*) as cnt FROM brain_ledger WHERE agent_id = ?').get(a.agent_id) as any;
    return {
      agentId: a.agent_id,
      role: a.role,
      status: a.status,
      runtimePath: a.runtime_path,
      lastActive: a.last_active,
      totalEvents: countRow ? countRow.cnt : 0
    };
  });
}

/**
 * Fetches circuit breaker state
 */
export function getCircuitBreaker(): CircuitBreakerState {
  const row = db.prepare('SELECT * FROM circuit_breaker WHERE id = ?').get('master') as any;
  return {
    status: (row?.status || 'STANDBY') as 'STANDBY' | 'ACTIVE',
    lastToggled: row?.last_toggled || new Date().toISOString(),
    reason: row?.reason || 'Circuit breaker active',
    port: 8200,
    jarvisPort: 3000
  };
}

/**
 * Sets circuit breaker state
 */
export function setCircuitBreaker(status: 'STANDBY' | 'ACTIVE', reason?: string): CircuitBreakerState {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE circuit_breaker 
    SET status = ?, last_toggled = ?, reason = ?
    WHERE id = ?
  `).run(status, now, reason || `Manual user override to ${status}`, 'master');

  return getCircuitBreaker();
}

/**
 * Calculates global token and activity metrics
 */
export function getGlobalMetrics(): {
  totalSessions: number;
  rawTokensReceived: number;
  compressedTokensStored: number;
  overallTokenSavings: string;
  activeAgentsCount: number;
} {
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      COALESCE(SUM(raw_tokens), 0) as rawTotal,
      COALESCE(SUM(distilled_tokens), 0) as distilledTotal
    FROM brain_ledger
  `).get() as any;

  const raw = stats.rawTotal || 0;
  const distilled = stats.distilledTotal || 0;
  const savings = raw > 0 ? (((raw - distilled) / raw) * 100).toFixed(1) + '%' : '0.0%';

  const agentCountRow = db.prepare("SELECT COUNT(*) as cnt FROM agent_registry WHERE status != 'OFFLINE'").get() as any;

  return {
    totalSessions: stats.total || 0,
    rawTokensReceived: raw,
    compressedTokensStored: distilled,
    overallTokenSavings: savings,
    activeAgentsCount: agentCountRow?.cnt || 0
  };
}
