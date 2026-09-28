#!/usr/bin/env node

/**
 * J.A.R.V.I.S. — Global CLI Entrypoint
 * 
 * Usage: jarvis
 * 
 * What happens when you type `jarvis`:
 *   1. Checks GitHub main branch for updates
 *   2. If update available → prompts you interactively
 *   3. Merges main into current branch (no branch switch!)
 *   4. Builds production bundle if needed
 *   5. Starts the server on port 3000
 *   6. Opens your browser automatically (once, not twice)
 * 
 * Jarvis handles everything internally. No subcommands needed.
 */

import { execSync, spawn } from 'child_process';
import { createInterface } from 'readline';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

// ─── ANSI Colors ────────────────────────────────────────────────────────────
const c = {
  cyan:    (s) => `\x1b[36m${s}\x1b[0m`,
  green:   (s) => `\x1b[32m${s}\x1b[0m`,
  yellow:  (s) => `\x1b[33m${s}\x1b[0m`,
  red:     (s) => `\x1b[31m${s}\x1b[0m`,
  dim:     (s) => `\x1b[2m${s}\x1b[0m`,
  bold:    (s) => `\x1b[1m${s}\x1b[0m`,
  magenta: (s) => `\x1b[35m${s}\x1b[0m`,
};

const RELEASE_FILE = resolve(PROJECT_ROOT, '.release_commit');
const REPO = 'Jarvis-os-tech/JARVIS-V0';
const PORT = 3000;

// ─── Helpers ────────────────────────────────────────────────────────────────

function banner() {
  console.log('');
  console.log(c.cyan('  ╔══════════════════════════════════════════════╗'));
  console.log(c.cyan('  ║') + c.bold('   J.A.R.V.I.S. — Autonomous AI OS            ') + c.cyan('║'));
  console.log(c.cyan('  ║') + c.dim('   Just A Rather Very Intelligent System       ') + c.cyan('║'));
  console.log(c.cyan('  ╚══════════════════════════════════════════════╝'));
  console.log('');
}

function getCurrentCommit() {
  try {
    return readFileSync(RELEASE_FILE, 'utf-8').trim();
  } catch {
    try {
      return execSync('git rev-parse HEAD', { cwd: PROJECT_ROOT, encoding: 'utf-8' }).trim();
    } catch {
      return null;
    }
  }
}

function saveCurrentCommit(sha) {
  writeFileSync(RELEASE_FILE, sha + '\n', 'utf-8');
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'jarvis-os-cli', 'Accept': 'application/vnd.github.v3+json' }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse GitHub response'));
        }
      });
    }).on('error', reject);
  });
}

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

function run(cmd, opts = {}) {
  try {
    execSync(cmd, {
      cwd: PROJECT_ROOT,
      stdio: opts.silent ? 'pipe' : 'inherit',
      encoding: 'utf-8',
      ...opts
    });
    return true;
  } catch (e) {
    if (!opts.silent) console.error(c.red(`  ✗ Command failed: ${cmd}`));
    return false;
  }
}

function runCapture(cmd) {
  try {
    return execSync(cmd, { cwd: PROJECT_ROOT, encoding: 'utf-8', stdio: 'pipe' }).trim();
  } catch {
    return '';
  }
}

function killPort(port) {
  try {
    execSync(`fuser -k ${port}/tcp 2>/dev/null`, { stdio: 'pipe' });
  } catch {
    // Port wasn't in use, that's fine
  }
}

function openBrowser(url) {
  const platform = process.platform;
  let cmd;
  if (platform === 'darwin') cmd = `open "${url}"`;
  else if (platform === 'win32') cmd = `start "" "${url}"`;
  else cmd = `xdg-open "${url}"`;

  try {
    execSync(cmd, { stdio: 'pipe' });
  } catch {
    console.log(c.dim(`  → Could not auto-open browser. Navigate to ${url}`));
  }
}

function hasDist() {
  return existsSync(resolve(PROJECT_ROOT, 'dist', 'server.js')) &&
         existsSync(resolve(PROJECT_ROOT, 'dist', 'index.html'));
}

// ─── Update Check ───────────────────────────────────────────────────────────

async function checkForUpdates() {
  const currentCommit = getCurrentCommit();
  console.log(c.dim('  ⟳ Checking for updates on main branch...'));

  try {
    const data = await fetchJSON(`https://api.github.com/repos/${REPO}/commits/main`);
    const remoteSha = data.sha;
    const remoteMsg = data.commit?.message?.split('\n')[0] || '';
    const remoteDate = data.commit?.committer?.date
      ? new Date(data.commit.committer.date).toLocaleDateString()
      : '';

    if (!remoteSha) {
      console.log(c.yellow('  ⚠ Could not read remote commit. Continuing with current version.'));
      return false;
    }

    if (currentCommit && remoteSha.startsWith(currentCommit.substring(0, 7))) {
      console.log(c.green('  ✓ You are on the latest version.'));
      return false;
    }

    // Update available!
    console.log('');
    console.log(c.yellow('  ╭──────────────────────────────────────────────╮'));
    console.log(c.yellow('  │') + c.bold('  ✨ A new update is available!                ') + c.yellow('│'));
    console.log(c.yellow('  ├──────────────────────────────────────────────┤'));
    console.log(c.yellow('  │') + `  Commit: ${c.cyan(remoteSha.substring(0, 8))}                             ` + c.yellow('│'));
    console.log(c.yellow('  │') + `  ${c.dim(remoteMsg.substring(0, 42).padEnd(42))}  ` + c.yellow('│'));
    if (remoteDate) {
      console.log(c.yellow('  │') + `  Date:   ${c.dim(remoteDate.padEnd(34))}  ` + c.yellow('│'));
    }
    console.log(c.yellow('  ╰──────────────────────────────────────────────╯'));
    console.log('');

    const answer = await ask(c.cyan('  → Apply this update? ') + c.dim('(y/n) '));

    if (answer === 'y' || answer === 'yes') {
      console.log('');
      console.log(c.cyan('  ⟳ Pulling latest from main...'));

      // Fetch main without switching branches
      if (!run('git fetch origin main')) {
        console.log(c.red('  ✗ Failed to fetch. Check your network connection.'));
        return false;
      }

      // Merge main into current branch (keeps user on their branch)
      const currentBranch = runCapture('git branch --show-current');
      console.log(c.dim(`  → Merging main into ${currentBranch || 'current branch'}...`));
      
      if (!run('git merge origin/main --no-edit', { silent: true })) {
        // If merge conflicts, abort and inform
        run('git merge --abort', { silent: true });
        console.log(c.yellow('  ⚠ Merge conflict detected. Skipping update — running current version.'));
        return false;
      }

      console.log(c.cyan('  ⟳ Installing dependencies...'));
      run('npm install');

      console.log(c.cyan('  ⟳ Building production bundle...'));
      if (!run('npm run build')) {
        console.log(c.red('  ✗ Build failed. Check logs above.'));
        return false;
      }

      // Save new commit
      saveCurrentCommit(remoteSha);

      console.log(c.green('  ✓ Updated to ' + remoteSha.substring(0, 8) + ' successfully!'));
      console.log('');
      return true;
    } else {
      console.log(c.dim('  → Skipped update. Running current version.'));
      return false;
    }
  } catch (err) {
    console.log(c.yellow('  ⚠ Could not check for updates: ' + (err.message || err)));
    console.log(c.dim('  → Continuing with current version.'));
    return false;
  }
}

// ─── Build if Needed ────────────────────────────────────────────────────────

function ensureBuild() {
  if (hasDist()) {
    console.log(c.dim('  ✓ Production build found.'));
    return true;
  }

  console.log(c.cyan('  ⟳ No production build found. Building...'));
  if (!run('npm run build')) {
    console.log(c.red('  ✗ Build failed. Cannot start Jarvis.'));
    console.log(c.dim('  → Run "npm run build" manually in the project directory to debug.'));
    return false;
  }

  // Record current commit
  try {
    const sha = execSync('git rev-parse HEAD', { cwd: PROJECT_ROOT, encoding: 'utf-8' }).trim();
    saveCurrentCommit(sha);
  } catch {
    // Non-fatal
  }

  console.log(c.green('  ✓ Build complete.'));
  return true;
}

// ─── Start Server ───────────────────────────────────────────────────────────

function startServer() {
  killPort(PORT);

  console.log(c.cyan(`  ⟳ Starting J.A.R.V.I.S. on port ${PORT}...`));
  console.log('');

  const serverPath = resolve(PROJECT_ROOT, 'dist', 'server.js');
  const child = spawn('node', [serverPath], {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(PORT),
      // Tell the server NOT to auto-launch browser — the CLI handles it
      AUTO_LAUNCH: 'false',
    },
    stdio: 'inherit',
  });

  // Give server a moment to bind, then open browser (ONCE, from CLI only)
  setTimeout(() => {
    const url = `http://localhost:${PORT}`;
    openBrowser(url);
    console.log('');
    console.log(c.green(`  ✓ J.A.R.V.I.S. is live at ${c.bold(url)}`));
    console.log(c.dim('  → Press Ctrl+C to shut down.'));
    console.log('');
  }, 2000);

  child.on('error', (err) => {
    console.error(c.red('  ✗ Failed to start server:'), err.message);
    process.exit(1);
  });

  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.log(c.red(`  ✗ Server exited with code ${code}`));
    }
    process.exit(code || 0);
  });

  // Forward signals for clean shutdown
  process.on('SIGINT', () => {
    console.log('');
    console.log(c.dim('  → Shutting down J.A.R.V.I.S....'));
    child.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    child.kill('SIGTERM');
  });
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  banner();

  // Step 1: Check for updates from main branch
  await checkForUpdates();

  // Step 2: Ensure production build exists
  if (!ensureBuild()) {
    process.exit(1);
  }

  // Step 3: Start the server and open browser
  startServer();
}

main().catch((err) => {
  console.error(c.red('  ✗ Fatal error:'), err);
  process.exit(1);
});
