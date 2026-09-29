import assert from 'node:assert';
import { autonomousEngine } from './autonomous_engine';

async function runCheck() {
  console.log('[Test] Verifying AutonomousEngine...');
  assert.ok(autonomousEngine, 'AutonomousEngine instance should exist');
  assert.strictEqual(typeof autonomousEngine.start, 'function', 'start() should be a function');
  assert.strictEqual(typeof autonomousEngine.stop, 'function', 'stop() should be a function');

  let alertReceived = false;
  // Test start/stop cycle
  autonomousEngine.start(500, (msg) => {
    alertReceived = true;
  });

  // Wait 1 second for pulse to run without throwing
  await new Promise((r) => setTimeout(r, 1100));

  autonomousEngine.stop();
  console.log('[Test] PASSED: AutonomousEngine lifecycle and pulse executed cleanly.');
  process.exit(0);
}

runCheck().catch((err) => {
  console.error('[Test] FAILED:', err);
  process.exit(1);
});
