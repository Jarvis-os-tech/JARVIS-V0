import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function splitRoots(value?: string): string[] {
  return (value || '')
    .split(path.delimiter)
    .map(root => root.trim())
    .filter(Boolean);
}

function realpathOrAbsolute(target: string): string {
  try {
    return fs.realpathSync.native(target);
  } catch {
    return path.resolve(target);
  }
}

/**
 * Workspace boundary for delegated agents and file-backed automation.
 * The current project plus common user work folders are allowed by default;
 * deployments can replace that list with JARVIS_AUTHORIZED_ROOTS.
 */
export function getAuthorizedRoots(): string[] {
  const configured = splitRoots(process.env.JARVIS_AUTHORIZED_ROOTS);
  const defaults = [
    process.cwd(),
    path.join(os.homedir(), 'Downloads'),
    path.join(os.homedir(), 'Documents'),
    path.join(os.homedir(), 'Desktop')
  ];
  return Array.from(new Set([...configured, ...defaults].map(realpathOrAbsolute)));
}

export function isPathWithinRoot(target: string, root: string): boolean {
  const relative = path.relative(root, target);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

export function assertAuthorizedWorkspace(cwd: string): string {
  const resolved = realpathOrAbsolute(cwd);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error(`Delegated working directory does not exist: ${cwd}`);
  }
  const allowed = getAuthorizedRoots().some(root => isPathWithinRoot(resolved, root));
  if (!allowed) {
    throw new Error(`Working directory is outside J.A.R.V.I.S. authorized roots: ${resolved}`);
  }
  return resolved;
}

export function assertAuthorizedPath(targetPath: string): string {
  const absolute = path.isAbsolute(targetPath) ? targetPath : path.resolve(process.cwd(), targetPath);
  const existingTarget = fs.existsSync(absolute) ? absolute : path.dirname(absolute);
  const resolved = realpathOrAbsolute(existingTarget);
  if (!getAuthorizedRoots().some(root => isPathWithinRoot(resolved, root))) {
    throw new Error(`Path is outside J.A.R.V.I.S. authorized roots: ${absolute}`);
  }
  return absolute;
}
