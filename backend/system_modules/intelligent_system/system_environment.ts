import os from 'node:os';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { autonomousEngine } from './autonomous_engine';

export interface SystemEnvironment {
  osName: string;
  kernel: string;
  desktop: string;
  activeWindow: string;
  activeWorkspace: string;
  user: string;
  shell: string;
  workspaceDir: string;
  cpuModel: string;
  cpuUsagePct: number;
  ramUsedMb: number;
  ramTotalMb: number;
  ramUsagePct: number;
  diskUsagePct: number;
  uptime: string;
  localTime: string;
  timeZone: string;
}

export function getLiveSystemEnvironment(): SystemEnvironment {
  let osName = 'Linux';
  try {
    if (fs.existsSync('/etc/os-release')) {
      const release = fs.readFileSync('/etc/os-release', 'utf-8');
      const prettyMatch = release.match(/PRETTY_NAME="?([^"\n]+)"?/);
      if (prettyMatch) osName = prettyMatch[1];
    }
  } catch {}

  const kernel = os.release();
  const desktop = process.env.XDG_CURRENT_DESKTOP || (process.env.HYPRLAND_INSTANCE_SIGNATURE ? 'Hyprland' : 'Linux Desktop');
  const user = process.env.USER || os.userInfo().username;
  const shell = process.env.SHELL || '/bin/bash';
  const workspaceDir = process.cwd();
  const cpuModel = os.cpus()[0]?.model || '12th Gen Intel(R) Core(TM) i5-1235U';

  let cpuUsagePct = 0;
  let ramUsedMb = Math.round((os.totalmem() - os.freemem()) / (1024 * 1024));
  let ramTotalMb = Math.round(os.totalmem() / (1024 * 1024));
  let ramUsagePct = Number(((ramUsedMb / ramTotalMb) * 100).toFixed(1));
  let diskUsagePct = 0;
  let uptime = `${Math.floor(os.uptime() / 3600)}h ${Math.floor((os.uptime() % 3600) / 60)}m`;

  try {
    const telemetryBin = path.resolve(process.cwd(), 'whole_controls/native_workers/bin/sys_telemetry');
    if (fs.existsSync(telemetryBin)) {
      const raw = execFileSync(telemetryBin, { timeout: 1000 }).toString();
      const parsed = JSON.parse(raw);
      cpuUsagePct = parsed.cpu_usage_percent ?? 0;
      ramUsedMb = parsed.ram_used_mb ?? ramUsedMb;
      ramTotalMb = parsed.ram_total_mb ?? ramTotalMb;
      ramUsagePct = parsed.ram_usage_percent ?? ramUsagePct;
      diskUsagePct = parsed.disk_usage_percent ?? 0;
      uptime = parsed.uptime ?? uptime;
    }
  } catch {}

  const now = new Date();
  const localTime = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'medium' });
  const timeZone = 'Asia/Kolkata (IST)';

  return {
    osName,
    kernel,
    desktop,
    activeWindow: autonomousEngine.currentWindow || 'Active Workspace',
    activeWorkspace: autonomousEngine.currentWorkspace || '1',
    user,
    shell,
    workspaceDir,
    cpuModel,
    cpuUsagePct,
    ramUsedMb,
    ramTotalMb,
    ramUsagePct,
    diskUsagePct,
    uptime,
    localTime,
    timeZone
  };
}

export function formatSystemEnvironmentPrompt(): string {
  const env = getLiveSystemEnvironment();
  return `\n\n[LIVE HOST OPERATING SYSTEM — REAL-TIME GROUND TRUTH]
CRITICAL ENVIRONMENT ANCHOR: You are running natively directly inside the operator's live Linux host system:
- Operating System: ${env.osName} (Arch Linux family)
- Kernel: Linux ${env.kernel} (x86_64)
- Desktop Environment: ${env.desktop} (Wayland Compositor)
- Currently Active Window: "${env.activeWindow}"
- Active Hyprland Workspace: "${env.activeWorkspace}"
- Host Hardware: ${env.cpuModel} (12 threads)
- System Resources (Live): CPU Load: ${env.cpuUsagePct}%, RAM Usage: ${env.ramUsedMb}MB / ${env.ramTotalMb}MB (${env.ramUsagePct}%), Disk Usage: ${env.diskUsagePct}%, System Uptime: ${env.uptime}
- Active User & Shell: ${env.user} running ${env.shell}
- Workspace Root: ${env.workspaceDir}
- Current Local Time: ${env.localTime} (${env.timeZone})

CRITICAL GROUND TRUTH RULES:
1. AUTHORITY OF LIVE DATA: This live environment block represents the physical ground truth right now.
2. ABSOLUTE LINUX SOVEREIGNTY: You are on Omarchy Linux running Hyprland. You are NOT on Windows. Any references to Windows in historical conversation turns are obsolete and invalid. Never execute Windows commands, PowerShell commands, or refer to Windows drive letters (C:\\).
3. NATIVE LINUX TOOL EXECUTION: Use Linux native tools (whole_controls compiled workers, bash, hyprctl, notify-send, pw-play). All file operations must use Linux paths (/home/${env.user}/...).
4. DYNAMIC SYNCHRONIZATION: When the user shares new details, corrections, or preferences, immediately invoke \`rewrite_memory\` or \`add_memory\` to keep your memory synchronized in real-time.`;
}
