import net from 'node:net';
import { execFile } from 'node:child_process';
import path from 'node:path';

const TELEMETRY_BIN = path.resolve(process.cwd(), 'whole_controls/native_workers/bin/sys_telemetry');

export class AutonomousEngine {
  private timer: NodeJS.Timeout | null = null;
  private hyprSocket: net.Socket | null = null;
  private lastAlertTime = 0;
  public currentWindow = '';
  public currentWorkspace = '';

  start(intervalMs = 10000, onProactiveEvent?: (text: string) => void) {
    this.connectHyprland();
    if (!this.timer) {
      this.timer = setInterval(() => this.pulse(onProactiveEvent), intervalMs);
      console.log('[AutonomousEngine] Heartbeat started (10s interval)');
    }
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    if (this.hyprSocket) this.hyprSocket.destroy();
    this.timer = null;
    this.hyprSocket = null;
  }

  private connectHyprland() {
    const runtimeDir = process.env.XDG_RUNTIME_DIR || `/run/user/${process.getuid?.() ?? 1000}`;
    const sig = process.env.HYPRLAND_INSTANCE_SIGNATURE;
    if (!sig) return;

    const socketPath = `${runtimeDir}/hypr/${sig}/.socket2.sock`;
    try {
      this.hyprSocket = net.connect(socketPath, () => {
        console.log('[AutonomousEngine] Connected to Hyprland socket2');
      });

      this.hyprSocket.on('data', (buf) => {
        const lines = buf.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('activewindow>>')) {
            this.currentWindow = line.replace('activewindow>>', '').trim();
          } else if (line.startsWith('workspace>>')) {
            this.currentWorkspace = line.replace('workspace>>', '').trim();
          }
        }
      });

      this.hyprSocket.on('error', () => {
        setTimeout(() => this.connectHyprland(), 10000);
      });
    } catch {
      // Hyprland not available or socket failed
    }
  }

  private pulse(onProactiveEvent?: (text: string) => void) {
    execFile(TELEMETRY_BIN, (err, stdout) => {
      if (err || !stdout) return;
      try {
        const stats = JSON.parse(stdout);
        const ramPct = stats.ram_usage_percent ?? 0;

        if (ramPct > 92 && Date.now() - this.lastAlertTime > 300000) {
          this.lastAlertTime = Date.now();
          const alert = `Memory pressure critical: RAM usage at ${ramPct.toFixed(1)}%.`;
          execFile('notify-send', ['J.A.R.V.I.S. Warning', alert]);
          onProactiveEvent?.(alert);
        }
      } catch {}
    });
  }
}

export const autonomousEngine = new AutonomousEngine();
