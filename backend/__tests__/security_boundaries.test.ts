import assert from 'node:assert/strict';
import path from 'node:path';
import { assertAuthorizedPath, assertAuthorizedWorkspace } from '../system_modules/intelligent_system/workspace_policy';

const projectRoot = process.cwd();

assert.equal(assertAuthorizedWorkspace(projectRoot), projectRoot);
assert.equal(assertAuthorizedPath(path.join(projectRoot, 'backend/server.ts')), path.join(projectRoot, 'backend/server.ts'));

assert.throws(
  () => assertAuthorizedPath('/etc/passwd'),
  /outside J\.A\.R\.V\.I\.S\. authorized roots/
);

console.log('✅ Security boundary tests passed');
