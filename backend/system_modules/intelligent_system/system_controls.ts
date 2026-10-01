import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';
import { omarchyQuattro } from './omarchy_quattro_core';
import { resolveFolderNavigation, resolveWallpaperPath } from './dynamic_resolver';
import { selfRepairEngine } from './self_repair';
import { experienceLearner } from './experience_learner';
import { getSelectionContext, actOnSelection, describeSelection } from './selection_awareness';

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
 * Checks whether a given tool name is handled by the whole_controls vault or Omarchy Quattro.
 */
export function isSystemControl(toolName: string): boolean {
  const builtInControls = new Set([
    'set_wallpaper',
    'change_wallpaper',
    'open_folder',
    'navigate_file_manager',
    'omarchy_quattro_command',
    'run_system_diagnostics',
    'get_current_selection',
    'act_on_selection'
  ]);
  if (builtInControls.has(toolName)) return true;

  if (!systemControlNameSet) {
    getSystemControlDeclarations();
  }
  return systemControlNameSet ? systemControlNameSet.has(toolName) : false;
}

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
        const binArgs = [String(targetApp)];
        if (args.args) {
          binArgs.push(String(args.args));
        }
        return { bin: path.join(workersBin, 'open_app'), binArgs };
      }
      break;
    }
    case 'open_folder':
    case 'navigate_file_manager': {
      const folderTarget = args.folder_path || args.section_name || args.path || args.target || 'downloads';
      const resolved = resolveFolderNavigation(folderTarget);
      return { bin: path.join(workersBin, 'open_app'), binArgs: [resolved.path] };
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
 * and Omarchy Quattro core, wrapped in autonomous self-repair and experience learning.
 */
export async function dispatchSystemControl(name: string, args: Record<string, any> = {}, timeoutMs: number = 10000): Promise<any> {
  const controlsDir = getControlsDir();
  const workersBin = path.resolve(controlsDir, 'native_workers/bin');

  let rawResult: any = null;
  let executionError: any = null;

  try {
    // 1. Direct Omarchy Quattro Integration High-Level Fast Paths
    if (name === 'set_wallpaper' || name === 'change_wallpaper') {
      const target = args.path || args.image || args.filename || args.target || 'downloads';
      rawResult = await omarchyQuattro.setWallpaper(target);
    } else if (name === 'run_system_diagnostics') {
      rawResult = await omarchyQuattro.runSystemDiagnostics();
    } else if (name === 'omarchy_quattro_command') {
      rawResult = await omarchyQuattro.executeOmarchyCommand(args.group, args.action, args.target ? [args.target] : []);
    } else if (name === 'open_folder' || name === 'navigate_file_manager') {
      const folderTarget = args.folder_path || args.section_name || args.path || args.target || 'downloads';
      const nav = resolveFolderNavigation(folderTarget);
      const openAppBin = path.join(workersBin, 'open_app');
      if (fs.existsSync(openAppBin)) {
        rawResult = await new Promise((res) => {
          execFile(openAppBin, [nav.path], (err, stdout) => {
            if (err) res({ success: false, error: err.message });
            else {
              try { res(JSON.parse(stdout.trim())); }
              catch { res({ success: true, folder: nav.path, command: nav.command }); }
            }
          });
        });
      }
    } else if (name === 'get_current_selection') {
      const useKeySim = args.use_key_simulation === true;
      const ctx = await getSelectionContext(useKeySim, false);
      rawResult = {
        success: true,
        selection: ctx,
        description: describeSelection(ctx),
      };
    } else if (name === 'act_on_selection') {
      const action = args.action || 'info';
      const destination = args.destination;
      const newName = args.new_name;
      rawResult = await actOnSelection(action, destination, newName);
    }

    // 2. Direct Native C++ Fast Path (~2-8ms execution)
    if (!rawResult) {
      const nativeCmd = tryDirectNativeWorker(name, args, workersBin);
      if (nativeCmd && fs.existsSync(nativeCmd.bin)) {
        rawResult = await new Promise((resolve) => {
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
    }

    // 3. Standard Python Dispatcher
    if (!rawResult) {
      rawResult = await new Promise((resolve) => {
        fallbackPythonDispatch(controlsDir, workersBin, name, args, timeoutMs, resolve);
      });
    }
  } catch (err: any) {
    executionError = err;
    rawResult = { success: false, error: err.message };
  }

  // 4. Autonomous Self-Repair & Recovery Loop
  let finalResult = rawResult;
  let repairApplied = false;
  let repairStrategy = 'none';
  let repairLesson: string | undefined;

  const isFailed = executionError || (rawResult && rawResult.success === false) || (rawResult && rawResult.error);
  if (isFailed) {
    const errToRepair = executionError || rawResult.error || 'Execution returned failure';
    const repairOutcome = await selfRepairEngine.interceptAndRepair(name, args, errToRepair);
    if (repairOutcome.repaired) {
      finalResult = repairOutcome.result || { success: true, message: 'Self-repaired successfully' };
      repairApplied = true;
      repairStrategy = repairOutcome.strategy;
      repairLesson = repairOutcome.lesson;
    }
  }

  // 5. Continuous Experience Logging
  experienceLearner.logEpisode({
    tool: name,
    args,
    success: finalResult && finalResult.success !== false && !finalResult.error,
    error: isFailed && !repairApplied ? String(rawResult?.error || executionError?.message) : undefined,
    repaired: repairApplied,
    strategy: repairApplied ? repairStrategy : undefined,
    lesson: repairLesson
  });

  return finalResult;
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
