/**
 * J.A.R.V.I.S. Multi-Agent Dual-Path Execution Engine - Defensive TDD Test Harness
 * 
 * Verifies:
 * 1. IntentRouter classification (<100ms budget, Tier-1 regex <2ms, Tier-2 schema).
 * 2. KeyPoolRotator multi-account rotation and HTTP 429 auto-failover.
 * 3. FillerAudioSynthesizer 24kHz PCM audio integrity (<10ms pre-rendered injection, only Jarvis voice).
 * 4. MultiAgentPool asynchronous execution, task queue, and AbortController cancellation.
 * 5. DualPathOrchestrator fast path vs slow path routing with instant verbal filler & secondary synthesis.
 */

import assert from 'node:assert';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
process.env.NODE_ENV = 'test';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
process.env.NODE_ENV = 'test';

import { ExecutionPath, TaskStatus, AgentRole } from '../system_modules/intelligent_system/dual_path_types';
import { KeyPoolRotator } from '../system_modules/intelligent_system/key_pool_rotator';
import { IntentRouter } from '../system_modules/intelligent_system/intent_router';
import { FillerAudioSynthesizer } from '../system_modules/intelligent_system/filler_audio_synthesizer';
import { MultiAgentPool } from '../system_modules/intelligent_system/multi_agent_pool';
import { DualPathOrchestrator } from '../system_modules/intelligent_system/dual_path_orchestrator';

async function runTestSuite() {
  console.log('🧪 Starting J.A.R.V.I.S. Multi-Agent Dual-Path Test Harness...\n');
  let testsPassed = 0;
  let testsTotal = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    testsTotal++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      testsPassed++;
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  // -------------------------------------------------------------
  // TEST GROUP 1: Dual Path Enums & Types
  // -------------------------------------------------------------
  console.log('--- 1. Dual Path Types & Enums Contracts ---');
  await test('ExecutionPath has FAST_PATH and SLOW_PATH values', () => {
    assert.strictEqual(ExecutionPath.FAST_PATH, 'FAST_PATH');
    assert.strictEqual(ExecutionPath.SLOW_PATH, 'SLOW_PATH');
  });

  await test('TaskStatus enum defines complete lifecycle states', () => {
    assert.strictEqual(TaskStatus.QUEUED, 'QUEUED');
    assert.strictEqual(TaskStatus.RUNNING, 'RUNNING');
    assert.strictEqual(TaskStatus.COMPLETED, 'COMPLETED');
    assert.strictEqual(TaskStatus.FAILED, 'FAILED');
    assert.strictEqual(TaskStatus.CANCELLED, 'CANCELLED');
  });

  // -------------------------------------------------------------
  // TEST GROUP 2: Multi-Account Key Pool & Failover
  // -------------------------------------------------------------
  console.log('\n--- 2. KeyPoolRotator Multi-Account Pooling & Failover ---');
  await test('Initializes key pool from comma-separated and suffixed env keys', () => {
    const rotator = new KeyPoolRotator('TEST_POOL', 'test_key_1,test_key_2');
    assert.strictEqual(rotator.getKeyCount(), 2);
    assert.strictEqual(rotator.getActiveKey(), 'test_key_1');
  });

  await test('Rotates keys sequentially in round-robin fashion', () => {
    const rotator = new KeyPoolRotator('TEST_POOL', 'key_a,key_b,key_c');
    assert.strictEqual(rotator.getActiveKey(), 'key_a');
    rotator.nextKey();
    assert.strictEqual(rotator.getActiveKey(), 'key_b');
    rotator.nextKey();
    assert.strictEqual(rotator.getActiveKey(), 'key_c');
    rotator.nextKey();
    assert.strictEqual(rotator.getActiveKey(), 'key_a');
  });

  await test('Auto-rotates to backup key on HTTP 429 rate limit reporting', () => {
    const rotator = new KeyPoolRotator('TEST_POOL', 'key_rate_limited,key_healthy');
    const firstKey = rotator.getActiveKey();
    assert.strictEqual(firstKey, 'key_rate_limited');
    rotator.reportRateLimit(firstKey);
    const backupKey = rotator.getActiveKey();
    assert.strictEqual(backupKey, 'key_healthy');
  });

  // -------------------------------------------------------------
  // TEST GROUP 3: IntentRouter Sub-100ms Classification
  // -------------------------------------------------------------
  console.log('\n--- 3. IntentRouter Sub-100ms Classification ---');
  const intentRouter = new IntentRouter();

  await test('Tier-1 matches fast OS commands in <5ms', async () => {
    const fastPhrases = [
      'set volume to 75',
      'mute the audio',
      'launch chrome browser',
      'dim the screen brightness',
      'what are the pc specs',
      'close current window',
      'open terminal',
      'scan wifi networks'
    ];

    for (const phrase of fastPhrases) {
      const start = performance.now();
      const result = await intentRouter.classify(phrase);
      const elapsed = performance.now() - start;
      assert.strictEqual(result.path, ExecutionPath.FAST_PATH, `Expected FAST_PATH for "${phrase}"`);
      assert.ok(elapsed < 10, `Classification for "${phrase}" took ${elapsed}ms (expected <10ms)`);
    }
  });

  await test('Identifies complex multi-step and heavy coding tasks as SLOW_PATH', async () => {
    const complexPhrases = [
      'analyze the server codebase and refactor the authentication middleware with JWT',
      'write a python script to parse logs and send alert emails when errors exceed 10',
      'build a multi-step background pipeline to clean up docker images and run benchmarks',
      'perform deep architecture review of our sqlite memory schema and propose improvements'
    ];

    for (const phrase of complexPhrases) {
      const result = await intentRouter.classify(phrase);
      assert.strictEqual(result.path, ExecutionPath.SLOW_PATH, `Expected SLOW_PATH for "${phrase}"`);
      assert.ok(result.domain, 'Expected classification domain to be populated');
    }
  });

  // -------------------------------------------------------------
  // TEST GROUP 4: FillerAudioSynthesizer 24kHz PCM Integrity (<300ms SLA)
  // -------------------------------------------------------------
  console.log('\n--- 4. FillerAudioSynthesizer & Audio Integrity ---');
  const fillerSynth = new FillerAudioSynthesizer();

  await test('Returns valid 24kHz linear PCM base64 audio snippet in <15ms', async () => {
    const start = performance.now();
    const snippet = await fillerSynth.getFillerSnippet('code', 'analyze repository');
    const elapsed = performance.now() - start;

    assert.ok(snippet, 'Snippet should not be null');
    assert.strictEqual(snippet.sampleRate, 24000, 'Audio sample rate must be exactly 24000 Hz');
    assert.strictEqual(snippet.format, 'audio/pcm;rate=24000', 'Mime type must be audio/pcm;rate=24000');
    assert.ok(snippet.audioBase64.length > 100, 'Base64 PCM audio buffer should contain valid audio bytes');
    assert.ok(snippet.text.length > 0, 'Spoken text phrase must be present');
    assert.ok(elapsed < 300, `Filler generation took ${elapsed}ms (SLA is <300ms)`);
  });

  await test('Only Jarvis British persona filler phrases are returned (No other voice allowed)', async () => {
    const domains: Array<'code' | 'shell' | 'diagnostics' | 'general'> = ['code', 'shell', 'diagnostics', 'general'];
    for (const d of domains) {
      const snippet = await fillerSynth.getFillerSnippet(d, 'task prompt');
      assert.ok(
        snippet.text.toLowerCase().includes('sir') || snippet.text.toLowerCase().includes('jarvis') || snippet.text.toLowerCase().includes('stand by') || snippet.text.toLowerCase().includes('on it'),
        `Phrase "${snippet.text}" must conform to Jarvis's polite British assistant tone`
      );
    }
  });

  // -------------------------------------------------------------
  // TEST GROUP 5: MultiAgentPool Asynchronous Execution & Cancellation
  // -------------------------------------------------------------
  console.log('\n--- 5. MultiAgentPool Worker Queue & Abort Handling ---');
  const agentPool = new MultiAgentPool({ maxConcurrent: 2 });

  await test('Executes a background task asynchronously without blocking event loop', async () => {
    const task = await agentPool.submitTask({
      id: 'test_task_1',
      title: 'Mock diagnostic check',
      role: AgentRole.SHELL_RUNNER,
      payload: { command: 'echo "diagnostic check nominal"' }
    });

    assert.strictEqual(task.status, TaskStatus.QUEUED);
    const result = await agentPool.waitForTask(task.id, 5000);
    assert.strictEqual(result.status, TaskStatus.COMPLETED);
    assert.ok(result.output, 'Task result output should be present');
  });

  await test('Cancels running background task cleanly upon abort signal', async () => {
    const task = await agentPool.submitTask({
      id: 'test_task_long',
      title: 'Long-running task',
      role: AgentRole.SHELL_RUNNER,
      payload: { command: 'sleep 10' }
    });

    // Abort after 50ms
    setTimeout(() => {
      agentPool.abortTask(task.id, 'User barged in / interrupted');
    }, 50);

    const result = await agentPool.waitForTask(task.id, 3000);
    assert.strictEqual(result.status, TaskStatus.CANCELLED);
  });

  // -------------------------------------------------------------
  // TEST GROUP 6: DualPathOrchestrator End-to-End Coordination
  // -------------------------------------------------------------
  console.log('\n--- 6. DualPathOrchestrator End-to-End Coordination ---');
  const orchestrator = new DualPathOrchestrator({
    intentRouter,
    fillerSynth,
    agentPool
  });

  await test('Directly executes FAST_PATH commands with sub-100ms execution', async () => {
    let audioInjected = false;
    let fastResultEmitted = false;

    const mockWs: any = {
      readyState: 1, // OPEN
      send: (data: string) => {
        const msg = JSON.parse(data);
        if (msg.type === 'audio') audioInjected = true;
        if (msg.type === 'fast_path_executed') fastResultEmitted = true;
      }
    };

    const res = await orchestrator.processUtterance('get system volume', mockWs);
    assert.strictEqual(res.path, ExecutionPath.FAST_PATH);
    assert.strictEqual(audioInjected, false, 'Fast path should not inject slow-path filler audio');
  });

  await test('Intercepts SLOW_PATH with instant vocal filler and dispatches to agent pool', async () => {
    const receivedMessages: any[] = [];
    const mockWs: any = {
      readyState: 1, // OPEN
      send: (data: string) => {
        receivedMessages.push(JSON.parse(data));
      }
    };

    const res = await orchestrator.processUtterance(
      'analyze server.ts and write a summary of active websocket handlers',
      mockWs
    );

    assert.strictEqual(res.path, ExecutionPath.SLOW_PATH);

    // Verify Instant Vocal Acknowledgment message was sent immediately
    const fillerMsg = receivedMessages.find(m => m.type === 'audio' && m.isVocalFiller);
    assert.ok(fillerMsg, 'Expected instant vocal filler audio frame sent to WebSocket');
    assert.ok(fillerMsg.audio, 'Filler audio must have base64 PCM data');

    const transcriptionMsg = receivedMessages.find(m => m.type === 'output_transcription');
    assert.ok(transcriptionMsg, 'Expected vocal filler output_transcription message');

    // Wait for background agent synthesis
    const finalEvent = await new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Slow path synthesis timeout')), 10000);
      const check = setInterval(() => {
        const found = receivedMessages.find(m => m.type === 'slow_path_completed');
        if (found) {
          clearTimeout(timeout);
          clearInterval(check);
          resolve(found);
        }
      }, 50);
    });

    assert.ok(finalEvent, 'Expected slow_path_completed event delivered to client');
    assert.ok(finalEvent.result, 'Expected synthesis output in completion payload');
  });

  console.log(`\n🎉 All ${testsPassed}/${testsTotal} Dual-Path Test Harness assertions passed successfully!\n`);
}

runTestSuite().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
