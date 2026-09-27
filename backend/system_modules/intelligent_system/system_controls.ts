import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Dynamically resolves the whole_controls vault directory across development and bundled production runtimes.
 */
export function getControlsDir(): string {
  if (process.env.JARVIS_CONTROLS_DIR && fs.existsSync(process.env.JARVIS_CONTROLS_DIR)) {
    return process.env.JARVIS_CONTROLS_DIR;
  }
  const candidates = [
    path.resolve(__dirname, '../../../whole_controls'),
    path.resolve(__dirname, '../../whole_controls'),
    path.resolve(__dirname, '../whole_controls'),
    path.resolve(process.cwd(), 'whole_controls'),
    path.resolve(process.cwd(), 'whole controls')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return path.resolve(process.cwd(), 'whole_controls');
}

let cachedDeclarations: any[] | null = null;
let systemControlNameSet: Set<string> | null = null;

/**
 * Loads and returns all Gemini Live tool declarations from the whole_controls vault.
 */
export function getSystemControlDeclarations(): any[] {
  if (cachedDeclarations) {
    return cachedDeclarations;
  }
  try {
    const controlsDir = getControlsDir();
    const declPath = path.resolve(controlsDir, 'voice_agent_bridge/tool_declarations.json');
    if (fs.existsSync(declPath)) {
      const parsed = JSON.parse(fs.readFileSync(declPath, 'utf-8'));
      cachedDeclarations = parsed.tools?.[0]?.functionDeclarations || [];
      systemControlNameSet = new Set(cachedDeclarations?.map((d: any) => d.name));
      return cachedDeclarations || [];
    }
  } catch (err: any) {
    console.warn('[System Controls] Could not load tool_declarations.json:', err.message);
  }
  return [];
}

/**
 * Checks whether a given tool name is handled by the whole_controls vault.
 */
export function isSystemControl(toolName: string): boolean {
  if (!systemControlNameSet) {
    getSystemControlDeclarations();
  }
  return systemControlNameSet ? systemControlNameSet.has(toolName) : false;
}

/**
 * Dispatches a tool call dynamically to whole_controls via unified_dispatcher.py.
 * Non-blocking, safe execution with timeout and structured JSON output.
 */
export function dispatchSystemControl(name: string, args: Record<string, any> = {}, timeoutMs: number = 10000): Promise<any> {
  const controlsDir = getControlsDir();
  const dispatcherScript = path.resolve(controlsDir, 'python_actuators/unified_dispatcher.py');
  const workersBin = path.resolve(controlsDir, 'native_workers/bin');

  return new Promise((resolve) => {
    const rawArgs = JSON.stringify(args || {});
    execFile(
      'python3',
      [dispatcherScript, name, rawArgs],
      {
        timeout: timeoutMs,
        env: {
          ...process.env,
          JARVIS_WORKERS_BIN: workersBin,
          PYTHONUNBUFFERED: '1'
        }
      },
      (err, stdout, stderr) => {
        if (err) {
          console.warn(`[System Control] Execution warning for '${name}':`, err.message);
          return resolve({
            success: false,
            error: err.message,
            stderr: stderr ? stderr.trim() : undefined
          });
        }
        try {
          const parsed = JSON.parse(stdout.trim());
          resolve(parsed);
        } catch (parseErr) {
          resolve({
            success: true,
            output: stdout.trim()
          });
        }
      }
    );
  });
}
