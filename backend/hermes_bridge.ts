import { execFile, execFileSync, type ChildProcess } from 'child_process';
import fs from 'fs';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import { Type, type FunctionDeclaration } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

/**
 * Hermes Bridge — J.A.R.V.I.S. OS Sub-Agent Communication Infrastructure
 *
 * Hermes (NousResearch / Hermes-Agent) is an autonomous agent capable of
 * multi-step reasoning, tool execution, deep research, coding, and memory retrieval.
 *
 * This bridge enables J.A.R.V.I.S. to:
 * 1. Headlessly delegate multi-turn tasks via the Hermes CLI.
 * 2. Monitor and interact with the running hermes-gateway.service daemon on port 9119.
 * 3. Synchronize §-delimited long-term memories from ~/.hermes/memories/ into J.A.R.V.I.S.
 * 4. Expose Gemini Live tool declarations (delegate_to_hermes, hermes_chat, sync_hermes_memory).
 */

const TIMEOUT_MS = Number(process.env.HERMES_TIMEOUT_MS) || 180_000;
const MAX_TURNS = Number(process.env.HERMES_MAX_TURNS) || 12;
const GATEWAY_HOST = process.env.HERMES_GATEWAY_HOST || '127.0.0.1';
const GATEWAY_PORT = Number(process.env.HERMES_GATEWAY_PORT) || 9119;
const SERVICE_UNIT = process.env.HERMES_SERVICE_UNIT || 'hermes-gateway.service';
const OMH_TOOLSET_WARN = /Warning:\s*Unknown toolsets:\s*omh/i;

export interface HermesResult {
  success: boolean;
  text: string;
  raw?: string;
  sessionId?: string;
  error?: string;
  durationMs?: number;
  tokens?: {
    input?: number;
    output?: number;
    total?: number;
  };
  model?: string;
  provider?: string;
}

export interface HermesHealth {
  ok: boolean;
  version?: string;
  binary: string;
  connected: boolean;
  delegation: 'ready' | 'unavailable';
  error?: string;
  gateway: {
    url: string;
    reachable: boolean;
    service: string;
    serviceActive: boolean;
    error?: string;
  };
  vault: {
    path: string;
    exists: boolean;
  };
  memories?: {
    hermesHome: string;
    available: boolean;
    memoryMdExists: boolean;
    userMdExists: boolean;
    memoryEntries: number;
    userEntries: number;
  };
}

export interface HermesDisplayCard {
  type: 'hermes_response';
  title: string;
  data: {
    text: string;
    prompt: string;
    sessionId?: string;
    success: boolean;
    error?: string;
    durationMs?: number;
  };
}

/**
 * Automatically locate the Hermes executable across standard Linux / local paths.
 */
export function resolveHermesBin(): string {
  if (process.env.HERMES_BIN && fs.existsSync(process.env.HERMES_BIN)) {
    return process.env.HERMES_BIN;
  }

  try {
    const whichOut = execFileSync('which', ['hermes'], { encoding: 'utf-8', timeout: 2000 }).trim();
    if (whichOut && fs.existsSync(whichOut)) {
      return whichOut;
    }
  } catch {}

  const home = process.env.HOME || '/home/g0pi';
  const candidates = [
    path.join(home, '.local/bin/hermes'),
    path.join(home, '.hermes/hermes-agent/bin/hermes'),
    path.join(home, '.hermes/bin/hermes'),
    path.join(home, '.hermes/hermes-agent/venv/bin/hermes'),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }

  return 'hermes';
}

/**
 * Resolve active memory vault directory in J.A.R.V.I.S.
 */
export function resolveVaultPath(): string {
  const envVault = process.env.JARVIS_VAULT_PATH || process.env.OBSIDIAN_VAULT_PATH;
  if (envVault && fs.existsSync(envVault)) {
    return envVault;
  }

  const candidates = [
    path.join(ROOT_DIR, 'jarvis_memory_bundle', 'vault'),
    path.join(ROOT_DIR, 'memory', 'vault'),
    path.join(ROOT_DIR, 'jarvis-memory'),
    path.join(ROOT_DIR, 'data'),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }

  return candidates[0];
}

/**
 * Sanitize raw output from Hermes CLI execution.
 * Strips ANSI escape codes, toolset warnings, internal cache notices, and box borders.
 */
export function cleanHermesOutput(raw: string): { text: string; sessionId?: string } {
  const ansiCleaned = raw.replace(/\x1b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
  const lines = ansiCleaned.split(/\r?\n/);
  let sessionId: string | undefined;
  const kept: string[] = [];

  for (const line of lines) {
    if (OMH_TOOLSET_WARN.test(line)) continue;
    if (line.includes('found but has no messages. Starting fresh')) continue;
    if (line.includes('Loaded cached tools')) continue;

    const sid = line.match(/^\s*session_id:\s*(\S+)/i);
    if (sid) {
      sessionId = sid[1];
      continue;
    }

    if (line.includes('┊')) {
      const parts = line.split('┊', 2);
      if (parts.length > 1 && parts[1].trim()) {
        kept.push(parts[1].trim());
        continue;
      }
    }

    kept.push(line);
  }

  return { text: kept.join('\n').trim(), sessionId };
}

/**
 * Execute a single delegated task against Hermes headlessly and non-interactively.
 * Uses -z one-shot execution with --usage-file and provider fallback to ensure
 * reliable tool execution, instant responses, and zero deadlocks.
 */
export function execHermes(
  prompt: string,
  opts?: {
    timeout?: number;
    maxTurns?: number;
    yolo?: boolean;
    sessionName?: string;
    sessionId?: string;
    provider?: string;
    model?: string;
    mode?: 'oneshot' | 'chat';
  }
): Promise<HermesResult> {
  const startTime = Date.now();
  const timeout = opts?.timeout ?? TIMEOUT_MS;
  const maxTurns = opts?.maxTurns ?? MAX_TURNS;
  const yolo = opts?.yolo !== false;
  const sessionName = opts?.sessionName || `jarvis-delegated-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const bin = resolveHermesBin();
  const provider = opts?.provider || process.env.HERMES_PROVIDER || 'nvidia';
  const model = opts?.model || process.env.HERMES_MODEL || 'meta/llama-3.3-70b-instruct';
  const mode = opts?.mode || 'oneshot';

  return new Promise<HermesResult>((resolve) => {
    if (!prompt || !prompt.trim()) {
      return resolve({
        success: false,
        text: '',
        error: 'Prompt is required for Hermes delegation',
        durationMs: 0
      });
    }

    const tmpUsageFile = path.join(
      ROOT_DIR,
      `.hermes_usage_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.json`
    );
    const tmpQueryFile = path.join(
      ROOT_DIR,
      `.hermes_query_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.tmp`
    );

    let child: ChildProcess | undefined;
    let settled = false;

    const finish = (r: HermesResult) => {
      if (settled) return;
      settled = true;
      try {
        if (fs.existsSync(tmpUsageFile)) fs.unlinkSync(tmpUsageFile);
      } catch {}
      try {
        if (fs.existsSync(tmpQueryFile)) fs.unlinkSync(tmpQueryFile);
      } catch {}
      r.durationMs = Date.now() - startTime;
      resolve(r);
    };

    const timer = setTimeout(() => {
      try {
        child?.kill('SIGKILL');
      } catch {}
      finish({
        success: false,
        text: '',
        sessionId: opts?.sessionId || sessionName,
        error: `Hermes timed out after ${timeout}ms (task may have looped).`,
      });
    }, timeout);

    try {
      let args: string[] = [];

      if (mode === 'chat') {
        fs.writeFileSync(tmpQueryFile, prompt.trim(), 'utf-8');
        args = [
          '-p', 'default',
          'chat',
          '--continue', sessionName,
          '--create-if-missing',
          '--query-file', tmpQueryFile,
          '--oneshot',
          '--cli',
          '-Q',
          '--max-turns', String(maxTurns),
          '--provider', provider,
          '-m', model
        ];
        if (yolo) args.push('--yolo');
      } else {
        // High-performance one-shot execution with tool execution and session resumption
        args = [
          '-z', prompt.trim(),
          '--usage-file', tmpUsageFile,
          '--provider', provider,
          '-m', model
        ];

        if (opts?.sessionId) {
          args.push('-r', opts.sessionId);
        } else if (opts?.sessionName) {
          args.push('-c', opts.sessionName);
        }

        if (yolo) {
          args.push('--yolo');
        }
      }

      console.log(`[HermesBridge] Spawning task (${provider}/${model}, session: ${opts?.sessionId || sessionName}): "${prompt.slice(0, 70)}..."`);

      child = execFile(bin, args, {
        windowsHide: true,
        maxBuffer: 32 * 1024 * 1024,
        env: { ...process.env, NVIDIA_API_KEY: process.env.NVIDIA_API_KEY },
        cwd: ROOT_DIR
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (d) => {
        stdout += d.toString();
      });

      child.stderr?.on('data', (d) => {
        stderr += d.toString();
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        finish({
          success: false,
          text: '',
          sessionId: opts?.sessionId || sessionName,
          error: `Failed to launch Hermes binary (${bin}): ${err.message}`,
        });
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        const { text, sessionId } = cleanHermesOutput(stdout);

        // Attempt reading usage file for tokens, actual session id, and cost
        let usageData: any = null;
        try {
          if (fs.existsSync(tmpUsageFile)) {
            usageData = JSON.parse(fs.readFileSync(tmpUsageFile, 'utf-8'));
          }
        } catch {}

        const finalSessionId = usageData?.session_id || sessionId || opts?.sessionId || sessionName;
        const tokens = usageData ? {
          input: usageData.input_tokens,
          output: usageData.output_tokens,
          total: usageData.total_tokens
        } : undefined;

        if (code === 0 && text) {
          finish({
            success: true,
            text,
            raw: stdout,
            sessionId: finalSessionId,
            tokens,
            model: usageData?.model || model,
            provider: usageData?.provider || provider
          });
        } else {
          const errMsg = (stderr || stdout || `exit code ${code}`).slice(0, 2000).trim();
          finish({
            success: false,
            text: text || '',
            raw: stdout,
            sessionId: finalSessionId,
            error: errMsg || 'Hermes returned an empty response.',
            tokens,
            model: usageData?.model || model,
            provider: usageData?.provider || provider
          });
        }
      });
    } catch (e: any) {
      clearTimeout(timer);
      finish({
        success: false,
        text: '',
        sessionId: opts?.sessionId || sessionName,
        error: (e?.message || String(e)).slice(0, 500)
      });
    }
  });
}

/**
 * Probe TCP socket connection on port 9119 or check systemd user unit.
 */
export async function probeGateway(): Promise<{ reachable: boolean; serviceActive: boolean; error?: string }> {
  let serviceActive = false;

  try {
    const status = execFileSync('systemctl', ['--user', 'is-active', SERVICE_UNIT], {
      encoding: 'utf-8',
      timeout: 2000,
    }).trim();
    if (status === 'active') {
      serviceActive = true;
    }
  } catch {}

  const socketReachable = await new Promise<boolean>((resolve) => {
    const sock = net.connect({ host: GATEWAY_HOST, port: GATEWAY_PORT });
    const timer = setTimeout(() => {
      sock.destroy();
      resolve(false);
    }, 800);

    sock.setTimeout(800);
    sock.once('connect', () => {
      clearTimeout(timer);
      sock.destroy();
      resolve(true);
    });
    sock.once('error', () => {
      clearTimeout(timer);
      resolve(false);
    });
  });

  return {
    reachable: serviceActive || socketReachable,
    serviceActive
  };
}

let cachedVersion: string | undefined;
let lastVersionCheck = 0;

/**
 * Complete health and diagnostic assessment of Hermes environment.
 */
export async function checkHermesHealth(): Promise<HermesHealth> {
  const bin = resolveHermesBin();
  const now = Date.now();

  let binExists = false;
  if (!cachedVersion || now - lastVersionCheck > 300_000) {
    try {
      const out = execFileSync(bin, ['--version'], {
        windowsHide: true,
        timeout: 10_000,
        encoding: 'utf-8',
      });
      cachedVersion = out.trim().split('\n')[0]?.slice(0, 120);
      lastVersionCheck = now;
      binExists = true;
    } catch (e: any) {
      try {
        const whichOut = execFileSync('which', [bin], { encoding: 'utf-8', timeout: 2000 });
        if (whichOut.trim()) {
          cachedVersion = 'Hermes Agent (verified executable)';
          lastVersionCheck = now;
          binExists = true;
        }
      } catch {
        binExists = false;
      }
    }
  } else {
    binExists = true;
  }

  const gateway = await probeGateway();
  const vaultPath = resolveVaultPath();
  const vaultExists = fs.existsSync(vaultPath);

  const home = process.env.HOME || '/home/g0pi';
  const hermesHome = path.join(home, '.hermes');
  const memoriesDir = path.join(hermesHome, 'memories');
  const memFile = path.join(memoriesDir, 'MEMORY.md');
  const userFile = path.join(memoriesDir, 'USER.md');

  const memExists = fs.existsSync(memFile);
  const userExists = fs.existsSync(userFile);

  const countBlocks = (filePath: string) => {
    if (!fs.existsSync(filePath)) return 0;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return content.split('§').filter(b => b.trim().length > 10).length;
    } catch {
      return 0;
    }
  };

  const isConnected = binExists && (gateway.reachable || gateway.serviceActive);

  return {
    ok: binExists,
    version: cachedVersion,
    binary: bin,
    connected: isConnected,
    delegation: binExists ? 'ready' : 'unavailable',
    gateway: {
      url: `${GATEWAY_HOST}:${GATEWAY_PORT}`,
      reachable: gateway.reachable,
      service: SERVICE_UNIT,
      serviceActive: gateway.serviceActive
    },
    vault: {
      path: vaultPath,
      exists: vaultExists
    },
    memories: {
      hermesHome,
      available: fs.existsSync(hermesHome),
      memoryMdExists: memExists,
      userMdExists: userExists,
      memoryEntries: countBlocks(memFile),
      userEntries: countBlocks(userFile)
    }
  };
}

/**
 * Reads and returns parsed Hermes long-term memories.
 */
export function getHermesMemories(): { facts: any[]; entities: any[]; total: number } {
  const home = process.env.HOME || '/home/g0pi';
  const memoriesDir = path.join(home, '.hermes', 'memories');
  const memFile = path.join(memoriesDir, 'MEMORY.md');
  const userFile = path.join(memoriesDir, 'USER.md');

  const parseBlocks = (filePath: string, kind: string, source: string) => {
    if (!fs.existsSync(filePath)) return [];
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return content
        .split('§')
        .map(b => b.trim())
        .filter(b => b.length > 10)
        .map(text => ({
          kind,
          source,
          content: text,
          summary: text.length > 200 ? text.slice(0, 200) + '...' : text
        }));
    } catch {
      return [];
    }
  };

  const facts = parseBlocks(memFile, 'fact', 'MEMORY.md');
  const entities = parseBlocks(userFile, 'entity', 'USER.md');

  return {
    facts,
    entities,
    total: facts.length + entities.length
  };
}

/**
 * Synchronize Hermes memories into J.A.R.V.I.S. memory engine and vault.
 */
export function syncHermesMemories(): Promise<{ success: boolean; imported: number; total: number; error?: string }> {
  return new Promise((resolve) => {
    const runnerScript = `
import sys, os, json
sys.path.insert(0, ${JSON.stringify(path.join(ROOT_DIR, 'hermes-connection'))})
from memory_bridge import HermesMemoryBridge
from config import HermesConfig

cfg = HermesConfig()
bridge = HermesMemoryBridge(config=cfg)
memories = bridge.read_all_memories()

vault_agents_dir = os.path.join(cfg.vault_path, "agents", "hermes")
os.makedirs(vault_agents_dir, exist_ok=True)
sync_file = os.path.join(vault_agents_dir, "hermes_memories_sync.md")

with open(sync_file, "w", encoding="utf-8") as f:
    f.write("# Synchronized Hermes Long-Term Memories\\n\\n")
    for m in memories:
        f.write(f"§ [{m['kind'].upper()}] ({m['source']})\\n{m['content']}\\n\\n")

print(json.dumps({"success": True, "count": len(memories)}))
`;

    const pythonBin = fs.existsSync('/usr/bin/python3') ? '/usr/bin/python3' : 'python3';
    execFile(pythonBin, ['-c', runnerScript], { cwd: ROOT_DIR, timeout: 15_000 }, (err, stdout, stderr) => {
      if (err) {
        return resolve({
          success: false,
          imported: 0,
          total: 0,
          error: stderr || err.message
        });
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve({
          success: true,
          imported: parsed.count,
          total: parsed.count
        });
      } catch (e: any) {
        resolve({
          success: true,
          imported: 0,
          total: 0
        });
      }
    });
  });
}

/**
 * Tool declarations exposed to Gemini Live.
 */
export function getHermesToolDeclarations(): FunctionDeclaration[] {
  return [
    {
      name: 'delegate_to_hermes',
      description: 'Delegate a complex reasoning, coding, research, or system execution task to the background Hermes autonomous agent.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          prompt: {
            type: Type.STRING,
            description: 'The detailed technical directive or task description to execute.',
          },
          sessionName: {
            type: Type.STRING,
            description: 'Optional session thread name to continue or track multi-turn state.',
          }
        },
        required: ['prompt'],
      },
    },
    {
      name: 'hermes_chat',
      description: 'Send a quick query or question to the Hermes agent for background analysis.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          message: {
            type: Type.STRING,
            description: 'The question or prompt to ask Hermes.',
          },
        },
        required: ['message'],
      },
    },
    {
      name: 'sync_hermes_memory',
      description: 'Synchronize long-term learned facts from ~/.hermes/memories into the J.A.R.V.I.S. Obsidian Memory Vault.',
      parameters: {
        type: Type.OBJECT,
        properties: {},
      },
    },
  ];
}

/**
 * Formatting directive for J.A.R.V.I.S. system prompts.
 */
export function getHermesPromptDirective(): string {
  return `\n\n[SUB-AGENT DELEGATION: HERMES]
You have access to Hermes Agent, a specialized headless sub-agent with full filesystem, coding, research, and command actuation capabilities.
- When asked to write complex code, conduct deep research, inspect git branches, or run multi-step terminal tasks, call 'delegate_to_hermes'.
- Speak to the user immediately with a brief confirmation in your natural British tone ("Right away, Sir", "Consulting Hermes now"), then delegate the heavy work to Hermes.
- When Hermes completes, summarize the outcome concisely for the user.`;
}
