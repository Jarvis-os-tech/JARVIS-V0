import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import {
  handleWriteFile,
  handleAppendFile,
  handleRewriteFile,
  handleReadFile,
  handleRemoveFile,
  handleListDirectory
} from './file_controls';

const TEST_FILE = path.resolve(process.cwd(), 'scratch_test_file.txt');

try {
  console.log('[Test] Running file_controls checks...');

  // 1. Write file
  const w = handleWriteFile(TEST_FILE, 'Line 1\nLine 2\n');
  assert.strictEqual(w.success, true);
  assert.ok(fs.existsSync(TEST_FILE));

  // 2. Append file
  const a = handleAppendFile(TEST_FILE, 'Line 3\n');
  assert.strictEqual(a.success, true);

  // 3. Read file
  const r = handleReadFile(TEST_FILE);
  assert.strictEqual(r.content, 'Line 1\nLine 2\nLine 3\n');

  // 4. Rewrite file
  const rw = handleRewriteFile(TEST_FILE, 'Line 2', 'Line 2 Mod');
  assert.strictEqual(rw.success, true);
  const r2 = handleReadFile(TEST_FILE);
  assert.strictEqual(r2.content, 'Line 1\nLine 2 Mod\nLine 3\n');

  // 5. List directory
  const l = handleListDirectory('.');
  assert.ok(l.items.some((i) => i.name === 'scratch_test_file.txt'));

  // 6. Remove file
  const rm = handleRemoveFile(TEST_FILE);
  assert.strictEqual(rm.success, true);
  assert.strictEqual(fs.existsSync(TEST_FILE), false);

  console.log('[Test] PASSED: file_controls write, append, rewrite, read, list, and remove verified successfully.');
  process.exit(0);
} catch (err) {
  console.error('[Test] FAILED:', err);
  if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
  process.exit(1);
}
