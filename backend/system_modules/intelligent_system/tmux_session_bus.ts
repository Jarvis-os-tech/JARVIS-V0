/**
 * J.A.R.V.I.S. Tmux Multi-Agent Session Bus
 * 
 * Enables true concurrent execution of external CLI agents (AGY, OMH, Codex, Hermes, OpenClaw)
 * inside persistent, isolated tmux sessions/panes.
 * 
 * Key Capabilities:
 * 1. Concurrent Isolation: Each agent runs in its own detached tmux session (e.g. `jarvis-<agentId>-<id>`).
 * 2. Real-Time Streaming: Polls and diffs tmux capture-pane output, streaming chunks over WebSocket.
 * 3. Bidirectional Input: Supports forwarding keystrokes/commands to running agents (e.g. confirmation prompts).
 * 4. Human Terminal Attachable: Users can attach directly via terminal (`tmux attach -t <session>`).
 * 5. Clean Exit Code Tracking: Injects completion markers to detect task completion and exit codes.
 */

import { exec, execFile, execFileSync } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);
const ANSI_REGEX = /\x1b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

export interface TmuxSessionOptions {
  sessionName: string;
  command: string;
  cwd?: string;
  env?: Record<string, string>;
  linesToKeep?: number;
}

export interface TmuxSessionInfo {
  name: string;
  created: number;
  windows: number;
  active: boolean;
}

export interface TmuxStreamSubscription {
  sessionName: string;
  stop: () => void;
}

export class TmuxSessionBus {
  private isTmuxInstalled: boolean | null = null;
  private tmuxPath: string = 'tmux';
  private activeStreams: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.checkInstallation();
  }

  /**
   * Check if tmux is installed on the host.
   */
  public checkInstallation(): boolean {
    if (this.isTmuxInstalled !== null) {
      return this.isTmuxInstalled;
    }
    try {
      const out = execFileSync('which', ['tmux'], { encoding: 'utf-8', timeout: 2000 }).trim();
      if (out && fs.existsSync(out)) {
        this.tmuxPath = out;
        this.isTmuxInstalled = true;
        return true;
      }
    } catch {}

    const candidates = ['/usr/bin/tmux', '/usr/local/bin/tmux', '/bin/tmux'];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        this.tmuxPath = c;
        this.isTmuxInstalled = true;
        return true;
      }
    }

    this.isTmuxInstalled = false;
    return false;
  }

  public getTmuxPath(): string {
    return this.tmuxPath;
  }

  /**
   * Checks if a specific tmux session is currently active.
   */
  public async hasSession(sessionName: string): Promise<boolean> {
    try {
      await execFileAsync(this.tmuxPath, ['has-session', '-t', sessionName]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Creates an isolated tmux session and executes the agent command.
   */
  public async createAgentSession(options: TmuxSessionOptions): Promise<{ success: boolean; sessionName: string; error?: string }> {
    if (!this.checkInstallation()) {
      return { success: false, sessionName: options.sessionName, error: 'tmux is not installed on this system' };
    }

    const sessionName = options.sessionName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const cwd = options.cwd || process.cwd();

    // Kill any existing session with the same name
    if (await this.hasSession(sessionName)) {
      await this.killSession(sessionName);
    }

    // Prepare wrapper script to execute command and capture exit code
    const scriptPath = path.join(
      os.tmpdir(),
      `jarvis_tmux_${sessionName}_${Date.now()}.sh`
    );

    // Export environment variables if provided
    let envExports = '';
    if (options.env) {
      for (const [k, v] of Object.entries(options.env)) {
        if (typeof v === 'string' && !v.includes('\n')) {
          envExports += `export ${k}="${v.replace(/"/g, '\\"')}"\n`;
        }
      }
    }

    const scriptContent = `#!/usr/bin/env bash
${envExports}
cd "${cwd}" || exit 1
echo "[JARVIS_TMUX_INIT:START]"
${options.command}
EXIT_CODE=$?
echo ""
echo "[JARVIS_EXIT_CODE:\${EXIT_CODE}]"
`;

    fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });

    try {
      // Create detached tmux session running the wrapper script
      await execFileAsync(this.tmuxPath, [
        'new-session',
        '-d',
        '-s',
        sessionName,
        '-c',
        cwd,
        'bash',
        scriptPath
      ]);

      return { success: true, sessionName };
    } catch (err: any) {
      try {
        if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
      } catch {}
      return {
        success: false,
        sessionName,
        error: `Failed to create tmux session: ${err.message}`
      };
    }
  }

  /**
   * Captures the full or recent visible output of a tmux pane.
   */
  public async capturePaneOutput(sessionName: string, lines: number = 300): Promise<string> {
    try {
      const { stdout } = await execFileAsync(this.tmuxPath, [
        'capture-pane',
        '-pt',
        sessionName,
        '-S',
        `-${lines}`
      ]);
      return stdout.replace(ANSI_REGEX, '');
    } catch (err: any) {
      return '';
    }
  }

  /**
   * Sends user or programmatic input to an active tmux session.
   */
  public async sendInput(sessionName: string, input: string): Promise<boolean> {
    try {
      await execFileAsync(this.tmuxPath, [
        'send-keys',
        '-t',
        sessionName,
        input,
        'Enter'
      ]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gracefully terminates a tmux session.
   */
  public async killSession(sessionName: string): Promise<boolean> {
    // Stop any active stream timer
    if (this.activeStreams.has(sessionName)) {
      clearInterval(this.activeStreams.get(sessionName)!);
      this.activeStreams.delete(sessionName);
    }

    try {
      await execFileAsync(this.tmuxPath, ['kill-session', '-t', sessionName]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Lists all active jarvis-related tmux sessions.
   */
  public async listJarvisSessions(): Promise<TmuxSessionInfo[]> {
    if (!this.checkInstallation()) return [];

    try {
      const { stdout } = await execFileAsync(this.tmuxPath, [
        'list-sessions',
        '-F',
        '#{session_name}:#{session_windows}:#{session_created}'
      ]);

      const lines = stdout.trim().split('\n').filter(Boolean);
      const results: TmuxSessionInfo[] = [];

      for (const line of lines) {
        const [name, windows, created] = line.split(':');
        if (name && name.startsWith('jarvis')) {
          results.push({
            name,
            windows: parseInt(windows, 10) || 1,
            created: parseInt(created, 10) * 1000 || Date.now(),
            active: true
          });
        }
      }

      return results;
    } catch {
      return [];
    }
  }

  /**
   * Streams the output of an active tmux session until completion.
   * Periodically diffs pane capture and notifies callbacks.
   */
  public streamSessionOutput(
    sessionName: string,
    onChunk: (chunk: string) => void,
    onExit: (exitCode: number, finalOutput: string) => void,
    options: { intervalMs?: number; timeoutMs?: number } = {}
  ): TmuxStreamSubscription {
    const intervalMs = options.intervalMs || 250;
    const timeoutMs = options.timeoutMs || 300000; // 5 min default
    const startTime = Date.now();

    let lastOutputLength = 0;
    let accumulatedCleanOutput = '';

    const timer = setInterval(async () => {
      // 1. Check timeout
      if (Date.now() - startTime > timeoutMs) {
        clearInterval(timer);
        this.activeStreams.delete(sessionName);
        await this.killSession(sessionName);
        onExit(-1, accumulatedCleanOutput + '\n[JARVIS] Tmux task timed out.');
        return;
      }

      // 2. Check if session still exists
      const alive = await this.hasSession(sessionName);
      const rawCapture = await this.capturePaneOutput(sessionName, 500);

      if (rawCapture.length > lastOutputLength) {
        const newText = rawCapture.slice(lastOutputLength);
        lastOutputLength = rawCapture.length;
        accumulatedCleanOutput = rawCapture;

        // Clean out internal harness tags for caller chunk
        const sanitizedChunk = newText
          .replace(/\[JARVIS_TMUX_INIT:START\]\r?\n?/g, '')
          .replace(/\[JARVIS_EXIT_CODE:\d+\]\r?\n?/g, '');

        if (sanitizedChunk.trim().length > 0) {
          onChunk(sanitizedChunk);
        }
      }

      // 3. Check for exit code marker in capture
      const exitMatch = rawCapture.match(/\[JARVIS_EXIT_CODE:(\d+)\]/);
      if (exitMatch) {
        const exitCode = parseInt(exitMatch[1], 10);
        clearInterval(timer);
        this.activeStreams.delete(sessionName);

        const finalClean = accumulatedCleanOutput
          .replace(/\[JARVIS_TMUX_INIT:START\]\r?\n?/g, '')
          .replace(/\[JARVIS_EXIT_CODE:\d+\]\r?\n?/g, '')
          .trim();

        await this.killSession(sessionName);
        onExit(exitCode, finalClean);
        return;
      }

      // 4. If session disappeared without exit code
      if (!alive) {
        clearInterval(timer);
        this.activeStreams.delete(sessionName);
        const finalClean = accumulatedCleanOutput
          .replace(/\[JARVIS_TMUX_INIT:START\]\r?\n?/g, '')
          .replace(/\[JARVIS_EXIT_CODE:\d+\]\r?\n?/g, '')
          .trim();
        onExit(0, finalClean);
      }
    }, intervalMs);

    this.activeStreams.set(sessionName, timer);

    return {
      sessionName,
      stop: () => {
        clearInterval(timer);
        this.activeStreams.delete(sessionName);
      }
    };
  }
}

export const tmuxSessionBus = new TmuxSessionBus();
