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
/**
 * Resolves direct C++ native worker commands for sub-10ms ultra-fast execution,
 * bypassing Python process overhead whenever a compiled native worker exists.
 */
function tryDirectNativeWorker(name: string, args: Record<string, any>, workersBin: string): { bin: string; binArgs: string[] } | null {
  switch (name) {
    case 'get_system_telemetry':
      return { bin: path.join(workersBin, 'sys_telemetry'), binArgs: [] };
    case 'get_pc_specs':
      return { bin: path.join(workersBin, 'pc_spec'), binArgs: [] };
    case 'get_system_volume':
      return { bin: path.join(workersBin, 'hardware_ctrl'), binArgs: ['get_volume'] };
    case 'set_system_volume':
      return { bin: path.join(workersBin, 'hardware_ctrl'), binArgs: ['set_volume', String(args.volume ?? 50)] };
    case 'get_display_brightness':
      return { bin: path.join(workersBin, 'hardware_ctrl'), binArgs: ['get_brightness'] };
    case 'set_display_brightness':
      return { bin: path.join(workersBin, 'hardware_ctrl'), binArgs: ['set_brightness', String(args.brightness ?? 50)] };
    case 'launch_application':
    case 'open_app':
    case 'open_application': {
      const targetApp = args.app_name || args.app || args.target;
      if (targetApp) {
        return { bin: path.join(workersBin, 'open_app'), binArgs: [String(targetApp)] };
      }
      break;
    }
    case 'omarchy_control':
      if (args.domain && args.action) {
        const binArgs = [String(args.domain), String(args.action)];
        if (args.target) binArgs.push(String(args.target));
        return { bin: path.join(workersBin, 'omarchy_ctrl'), binArgs };
      }
      break;
    case 'scan_wifi_networks':
      return { bin: path.join(workersBin, 'wifi_scan'), binArgs: [] };
    case 'inspect_network_sockets':
      return { bin: path.join(workersBin, 'net_inspector'), binArgs: [] };
  }
  return null;
}

/**
 * Dispatches a tool call dynamically. Prioritizes compiled native C++ workers (sub-10ms)
 * and falls back safely to unified_dispatcher.py.
 */
export function dispatchSystemControl(name: string, args: Record<string, any> = {}, timeoutMs: number = 10000): Promise<any> {
  const controlsDir = getControlsDir();
  const workersBin = path.resolve(controlsDir, 'native_workers/bin');

  // 1. Direct Native C++ Fast Path (~2-8ms execution)
  const nativeCmd = tryDirectNativeWorker(name, args, workersBin);
  if (nativeCmd && fs.existsSync(nativeCmd.bin)) {
    return new Promise((resolve) => {
      execFile(
        nativeCmd.bin,
        nativeCmd.binArgs,
        {
          timeout: timeoutMs,
          env: {
            ...process.env,
            JARVIS_WORKERS_BIN: workersBin
          }
        },
        (err, stdout, stderr) => {
          if (!err && stdout) {
            try {
              return resolve(JSON.parse(stdout.trim()));
            } catch {
              return resolve({ success: true, output: stdout.trim() });
            }
          }
          // Fall back to Python dispatcher if native worker encounters an edge case
          fallbackPythonDispatch(controlsDir, workersBin, name, args, timeoutMs, resolve);
        }
      );
    });
  }

  // 2. Standard Python Dispatcher
  return new Promise((resolve) => {
    fallbackPythonDispatch(controlsDir, workersBin, name, args, timeoutMs, resolve);
  });
}

function fallbackPythonDispatch(
  controlsDir: string,
  workersBin: string,
  name: string,
  args: Record<string, any>,
  timeoutMs: number,
  resolve: (val: any) => void
) {
  const dispatcherScript = path.resolve(controlsDir, 'python_actuators/unified_dispatcher.py');
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
      } catch {
        resolve({
          success: true,
          output: stdout.trim()
        });
      }
    }
  );
}
