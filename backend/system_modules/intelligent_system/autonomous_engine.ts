import net from 'node:net';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { omarchyQuattro, DiagnosticResult } from './omarchy_quattro_core';
import { experienceLearner } from './experience_learner';

export class AutonomousEngine {
  private timer: NodeJS.Timeout | null = null;
  private hyprSocket: net.Socket | null = null;
  private lastAlertTime = 0;
  private lastDiagnostics: DiagnosticResult | null = null;
  public currentWindow = '';
  public currentWorkspace = '';

  start(intervalMs = 10000, onProactiveEvent?: (text: string, data?: any) => void) {
    this.connectHyprland();
    if (!this.timer) {
      this.timer = setInterval(() => this.pulse(onProactiveEvent), intervalMs);
      console.log('[AutonomousEngine] Autonomous AGI Heartbeat active (10s pulse cycle)');
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
        console.log('[AutonomousEngine] Connected to Hyprland socket2 event stream');
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

  private async pulse(onProactiveEvent?: (text: string, data?: any) => void) {
    try {
      // 1. Run dynamic system diagnostics sweep
      const diag = await omarchyQuattro.runSystemDiagnostics();
      this.lastDiagnostics = diag;

      // 2. High memory pressure evaluation
      if (diag.ramUsagePct > 92 && Date.now() - this.lastAlertTime > 300000) {
        this.lastAlertTime = Date.now();
        const alert = `Memory pressure critical: RAM usage at ${diag.ramUsagePct.toFixed(1)}%.`;
        execFile('notify-send', ['J.A.R.V.I.S. Warning', alert]);
        onProactiveEvent?.(alert, { type: 'memory_warning', diagnostics: diag });
      }

      // 3. Thermal threshold evaluation
      const hotZone = diag.thermals.find(t => t.tempC > 88);
      if (hotZone && Date.now() - this.lastAlertTime > 300000) {
        this.lastAlertTime = Date.now();
        const alert = `Thermal warning: Zone ${hotZone.zone} reached ${hotZone.tempC}°C.`;
        execFile('notify-send', ['J.A.R.V.I.S. Thermal Alert', alert]);
        onProactiveEvent?.(alert, { type: 'thermal_warning', diagnostics: diag });
      }

      // 4. Emit proactive telemetry
      onProactiveEvent?.('heartbeat_telemetry', {
        type: 'autonomous_heartbeat',
        diagnostics: diag,
        metrics: experienceLearner.getMetrics(),
        currentWindow: this.currentWindow,
        currentWorkspace: this.currentWorkspace
      });
    } catch (err: any) {
      console.warn('[AutonomousEngine] Pulse error:', err.message);
    }
  }

  public getLastDiagnostics(): DiagnosticResult | null {
    return this.lastDiagnostics;
  }
}

export const autonomousEngine = new AutonomousEngine();
