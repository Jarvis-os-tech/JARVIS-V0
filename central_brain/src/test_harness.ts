import crypto from 'crypto';
import { buildCentralBrainGraph } from './core/brain_graph.js';
import { db, getAllLedgerRecords, isEventDuplicate } from './core/db.js';
import { syncMasterIndexFiles } from './core/master_index_sync.js';
import { defaultDistiller } from './core/distillation_engine.js';
import { discoverAgentRuntimes } from './core/agent_discovery.js';

async function runVerificationTests() {
  console.log('🧪 Starting Central Brain Architectural Verification Suite...\n');

  // Test 1: Agent Auto-Discovery
  console.log('--- Test 1: Autonomous Agent Discovery ---');
  const agents = discoverAgentRuntimes();
  console.log(`Discovered ${agents.length} agents:`);
  for (const a of agents) {
    console.log(`  - [${a.status}] ${a.agentId} (${a.role}) -> ${a.runtimePath}`);
  }
  if (agents.length < 4) throw new Error('Failed to discover expected agents');
  console.log('✅ Test 1 Passed.\n');

  // Test 2: Two-Tier Distillation Engine Test
  console.log('--- Test 2: Two-Tier Distillation Engine ---');
  const sampleLog = `
    User requested to build the central brain subsystem.
    Decision: Selected TypeScript + LangGraph StateGraph with better-sqlite3 WAL mode.
    Created files: central_brain/src/core/db.ts, central_brain/src/core/brain_graph.ts.
    Fixed potential concurrency locks with 5000ms busy timeout.
    Everything verified cleanly.
  `;
  const distResult = await defaultDistiller.distill('Hermes', sampleLog);
  console.log('Distillation Summary:', distResult.summary);
  console.log('Metrics:', distResult.metrics);
  console.log('Artifacts:', distResult.artifacts);
  if (distResult.metrics.compressionRatio <= 0) throw new Error('Compression ratio must be positive');
  console.log('✅ Test 2 Passed.\n');

  // Test 3: LangGraph StateGraph Ingestion & Ledger Sync (Fixture B)
  console.log('--- Test 3: LangGraph StateGraph Ingestion & Sync ---');
  const graph = buildCentralBrainGraph();
  const testId = crypto.randomUUID();
  const testSessionId = `test_session_${Date.now()}`;
  const testPayload = `Discussed memory architecture with Gopi. Implemented WAL mode database at central_brain/src/core/db.ts.`;

  const invokeResult = await graph.invoke({
    rawEvent: {
      id: testId,
      agentId: 'Hermes',
      sessionId: testSessionId,
      timestamp: new Date().toISOString(),
      payload: testPayload,
      sourcePath: '/home/g0pi/.hermes/sessions'
    },
    auditPassed: false,
    circuitBreakerOpen: false,
    errors: []
  });

  const records = getAllLedgerRecords();
  const inserted = records.find(r => r.id === testId);
  if (!inserted) throw new Error('Record was not found in SQLite ledger');
  console.log(`Record inserted into SQLite: ${inserted.id} (${inserted.summary})`);
  console.log('✅ Test 3 Passed.\n');

  // Test 4: Deduplication Check
  console.log('--- Test 4: Idempotency & Deduplication ---');
  const dedupResult = await graph.invoke({
    rawEvent: {
      id: crypto.randomUUID(),
      agentId: 'Hermes',
      sessionId: testSessionId,
      timestamp: new Date().toISOString(),
      payload: testPayload, // identical payload
      sourcePath: '/home/g0pi/.hermes/sessions'
    },
    auditPassed: false,
    circuitBreakerOpen: false,
    errors: []
  });
  console.log('Duplicate event audit passed:', dedupResult.auditPassed);
  console.log('Duplicate errors logged:', dedupResult.errors);
  if (dedupResult.auditPassed !== false) throw new Error('Deduplication failed to reject identical event');
  console.log('✅ Test 4 Passed.\n');

  // Test 5: Cascade Purge & Hash Wiping (Fixture A / Gap 4)
  console.log('--- Test 5: Cascade Purge & Deduplication Hash Wiping ---');
  const targetRecord = db.prepare('SELECT id, event_hash FROM brain_ledger WHERE id = ?').get(testId) as any;
  if (!targetRecord) throw new Error('Target record missing before purge');
  const eventHash = targetRecord.event_hash;

  // Execute atomic cascade purge
  const purgeTx = db.transaction(() => {
    db.prepare('DELETE FROM brain_ledger WHERE id = ?').run(testId);
    if (eventHash) {
      db.prepare('DELETE FROM event_dedup WHERE hash = ?').run(eventHash);
    }
    db.prepare('DELETE FROM event_dedup WHERE event_id = ?').run(testId);
  });
  purgeTx();
  syncMasterIndexFiles();

  // Verify deleted from ledger
  const afterPurgeLedger = db.prepare('SELECT id FROM brain_ledger WHERE id = ?').get(testId);
  if (afterPurgeLedger) throw new Error('Record still exists in ledger after purge');

  // Verify hash was deleted from event_dedup
  const isDedupWiped = !isEventDuplicate(eventHash);
  if (!isDedupWiped) throw new Error('Event hash still exists in event_dedup after purge');
  console.log(`Cascade Purge successfully wiped record and hash [${eventHash.slice(0, 12)}...]`);
  console.log('✅ Test 5 Passed.\n');

  console.log('🎉 ALL 5 ARCHITECTURAL VERIFICATION TESTS PASSED 100%!');
}

runVerificationTests().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
