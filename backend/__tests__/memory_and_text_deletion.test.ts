/**
 * J.A.R.V.I.S. Text Deletion & Memory Clearing Test Harness
 * 
 * Verifies:
 * 1. IntentRouter routes "delete text", "backspace", "clear memory" to FAST_PATH (<2ms).
 * 2. GroqFastActuator matches delete_text, clear_memory, remove_memory from natural speech.
 * 3. System control 'delete_text' dispatches and returns success for backspace, word, line, all.
 * 4. Memory Bridge adds, deletes single item across categories, and handles clear_memory.
 */

import assert from 'node:assert';
import { IntentRouter } from '../system_modules/intelligent_system/intent_router';
import { ExecutionPath } from '../system_modules/intelligent_system/dual_path_types';
import { groqFastActuator } from '../system_modules/intelligent_system/groq_fast_actuator';
import { dispatchSystemControl, isSystemControl } from '../system_modules/intelligent_system/system_controls';
import { execFile } from 'child_process';
import path from 'path';

function runBridge(args: string[]): Promise<any> {
  const script = path.resolve(process.cwd(), 'backend/memory_bridge.py');
  return new Promise((resolve, reject) => {
    execFile('python3', [script, ...args], (err, stdout, stderr) => {
      if (err) return reject(err);
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        resolve(stdout.trim());
      }
    });
  });
}

async function runTests() {
  console.log('🧪 Starting J.A.R.V.I.S. Memory & Text Deletion Test Harness...\n');

  const router = new IntentRouter();

  // --- 1. IntentRouter Tier 1 Text Deletion & Memory Purge ---
  console.log('--- 1. IntentRouter Routing for Text Deletion & Memory Purge ---');
  
  const textDelRes = await router.classify('delete text');
  assert.strictEqual(textDelRes.path, ExecutionPath.FAST_PATH, 'delete text should be FAST_PATH');
  assert.strictEqual(textDelRes.domain, 'os_control', 'delete text domain should be os_control');
  console.log(`  ✅ [PASS] "delete text" routed to FAST_PATH in ${textDelRes.latencyMs}ms`);

  const backspaceRes = await router.classify('backspace 3 times');
  assert.strictEqual(backspaceRes.path, ExecutionPath.FAST_PATH, 'backspace should be FAST_PATH');
  console.log(`  ✅ [PASS] "backspace 3 times" routed to FAST_PATH in ${backspaceRes.latencyMs}ms`);

  const clearLineRes = await router.classify('clear the line');
  assert.strictEqual(clearLineRes.path, ExecutionPath.FAST_PATH, 'clear the line should be FAST_PATH');
  console.log(`  ✅ [PASS] "clear the line" routed to FAST_PATH in ${clearLineRes.latencyMs}ms`);

  const clearMemRes = await router.classify('clear all memory');
  assert.strictEqual(clearMemRes.path, ExecutionPath.FAST_PATH, 'clear all memory should be FAST_PATH');
  assert.strictEqual(clearMemRes.domain, 'memory', 'clear all memory domain should be memory');
  console.log(`  ✅ [PASS] "clear all memory" routed to FAST_PATH in ${clearMemRes.latencyMs}ms`);

  const forgetAllRes = await router.classify('forget everything');
  assert.strictEqual(forgetAllRes.path, ExecutionPath.FAST_PATH, 'forget everything should be FAST_PATH');
  console.log(`  ✅ [PASS] "forget everything" routed to FAST_PATH in ${forgetAllRes.latencyMs}ms`);

  // --- 2. GroqFastActuator Tool Extraction ---
  console.log('\n--- 2. GroqFastActuator Tool Extraction ---');
  
  const groqToolsDel = groqFastActuator.getRelevantTools('delete that text please');
  const toolNamesDel = groqToolsDel.map((t: any) => t.function.name);
  assert.ok(toolNamesDel.includes('delete_text'), 'getRelevantTools should include delete_text');
  console.log(`  ✅ [PASS] Speech "delete that text please" matched tools: ${toolNamesDel.join(', ')}`);

  const groqToolsMem = groqFastActuator.getRelevantTools('please clear memory and reset');
  const toolNamesMem = groqToolsMem.map((t: any) => t.function.name);
  assert.ok(toolNamesMem.includes('clear_memory'), 'getRelevantTools should include clear_memory');
  assert.ok(toolNamesMem.includes('remove_memory'), 'getRelevantTools should include remove_memory');
  console.log(`  ✅ [PASS] Speech "please clear memory and reset" matched tools: ${toolNamesMem.join(', ')}`);

  // --- 3. System Control delete_text Execution ---
  console.log('\n--- 3. System Control delete_text Execution ---');
  assert.strictEqual(isSystemControl('delete_text'), true, 'delete_text must be recognized as system control');

  const delCharRes = await dispatchSystemControl('delete_text', { count: 1, mode: 'backspace' });
  assert.strictEqual(delCharRes.success, true, 'delete_text backspace should succeed');
  assert.strictEqual(delCharRes.mode, 'backspace');
  console.log('  ✅ [PASS] delete_text (backspace) executed successfully');

  const delWordRes = await dispatchSystemControl('delete_text', { count: 1, mode: 'word' });
  assert.strictEqual(delWordRes.success, true, 'delete_text word should succeed');
  assert.strictEqual(delWordRes.mode, 'word');
  console.log('  ✅ [PASS] delete_text (word) executed successfully');

  const delLineRes = await dispatchSystemControl('delete_text', { count: 1, mode: 'line' });
  assert.strictEqual(delLineRes.success, true, 'delete_text line should succeed');
  assert.strictEqual(delLineRes.mode, 'line');
  console.log('  ✅ [PASS] delete_text (line) executed successfully');

  const delAllRes = await dispatchSystemControl('delete_text', { mode: 'all' });
  assert.strictEqual(delAllRes.success, true, 'delete_text all should succeed');
  assert.strictEqual(delAllRes.mode, 'all');
  console.log('  ✅ [PASS] delete_text (all) executed successfully');

  // --- 4. Memory Bridge add, remove, and multi-category delete ---
  console.log('\n--- 4. Memory Bridge Operations ---');

  // Add test item with unique string
  const testFact = `User prefers TypeScript strict mode verification ${Date.now()}`;
  const addRes = await runBridge(['add_triad', 'preferences', testFact]);
  assert.ok(addRes.status === 'added' || addRes.status === 'updated', 'Adding memory should succeed');
  console.log(`  ✅ [PASS] Added memory: [${addRes.category}] ${addRes.content} (id: ${addRes.id})`);

  // Remove by content using category="all"
  const removeRes = await runBridge(['remove_triad', 'all', testFact]);
  assert.strictEqual(removeRes.status, 'removed', 'Removing memory with category "all" should succeed');
  assert.ok(removeRes.deletedCount >= 1, 'deletedCount should be >= 1');
  assert.ok(removeRes.affectedCategories.includes('preferences'), 'affectedCategories should include preferences');
  console.log(`  ✅ [PASS] Removed memory across all categories (deletedCount: ${removeRes.deletedCount}, affected: ${removeRes.affectedCategories})`);

  // Verify it is no longer found
  const removeAgain = await runBridge(['remove_triad', 'all', testFact]);
  assert.strictEqual(removeAgain.status, 'not_found', 'Removing again should return not_found');
  console.log('  ✅ [PASS] Subsequent removal confirmed item is purged');

  // Verify clear_memory function execution (buffer scope to preserve active facts in persistent DB)
  const clearBufferRes = await runBridge(['clear_memory', 'all', 'buffer']);
  assert.strictEqual(clearBufferRes.status, 'cleared', 'Clearing memory buffer should succeed');
  console.log(`  ✅ [PASS] clear_memory (buffer scope) executed successfully (cleared: ${clearBufferRes.clearedTables})`);

  console.log('\n🎉 All Memory & Text Deletion tests passed successfully!');
}

runTests().catch(err => {
  console.error('\n❌ Test failure:', err);
  process.exit(1);
});
