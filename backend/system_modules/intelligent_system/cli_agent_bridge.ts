/**
 * J.A.R.V.I.S. Universal CLI Agent Bridge
 * 
 * Executes external CLI agent processes asynchronously with:
 * - Optional YOLO Mode: Auto-bypasses approval/confirmation gates only when explicitly enabled
 *   by monitoring stdout/stderr for confirmation patterns and piping "y\n"
 * - Persistent named session support across multi-turn prompts
 * - Real-time streaming stdout/stderr emission (via WebSocket / A2A SSE)
 * - Temporary query file management to prevent shell escapes
 * - Clean ANSI escape removal and step detection
 * - AbortController cancellation guarantee
 * - stdin piped (not ignored) so agents can receive input when needed
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { cliAgentRegistry } from './cli_agent_registry';
import { assertAuthorizedWorkspace } from './workspace_policy';
import { openShellPolicyEngine } from './openshell_policy';

const ANSI_REGEX = /\x1b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

// ─── YOLO Approval Gate Bypass Patterns ─────────────────────────────────────
// These regex patterns detect when a CLI agent is prompting for user
// confirmation/approval. When matched, we automatically pipe "y\n" to stdin.
const APPROVAL_GATE_PATTERNS = [
  /\(y\/n\)\s*:?\s*$/i,
  /\(Y\/n\)\s*:?\s*$/i,
  /\(yes\/no\)\s*:?\s*$/i,
  /\[y\/N\]\s*:?\s*$/i,
  /\[Y\/n\]\s*:?\s*$/i,
  /Do you want to continue\?/i,
  /Do you want to proceed\?/i,
  /Are you sure\?/i,
  /Confirm\?/i,
  /Press Enter to continue/i,
  /Press any key to continue/i,
  /Do you approve this action\?/i,
  /Allow this operation\?/i,
  /Accept\? \[/i,
  /Would you like to apply/i,
  /Shall I proceed/i,
  /Continue with this change/i,
  /permission.*\?\s*$/i,
  /approve.*\?\s*$/i,
  /overwrite.*\?\s*$/i,
  /replace.*\?\s*$/i,
];

// Patterns that need "Enter" (empty input) instead of "y"
const ENTER_GATE_PATTERNS = [
  /Press Enter to continue/i,
  /Press any key to continue/i,
  /Press ENTER/i,
];

export interface CLITaskOptions {
  agentId: string;
  prompt: string;
  sessionId?: string;
  cwd?: string;
  timeoutMs?: number;
  yoloMode?: boolean;           // Enable YOLO auto-approval bypass (default: false)
  openShellEnabled?: boolean;   // Enable OpenShell security governance (default: true)
  abortSignal?: AbortSignal;
  onChunk?: (chunk: string) => void;
  onStep?: (stepDescription: string) => void;
  onYoloBypassed?: (pattern: string) => void;  // Callback when a gate is auto-approved
}

export interface CLITaskResult {
  success: boolean;
  agentId: string;
  sessionId: string;
  output: string;
  raw: string;
  durationMs: number;
  exitCode: number | null;
  error?: string;
  yoloBypassCount: number;      // How many approval gates were auto-bypassed
  openShellSecured?: boolean;   // Whether OpenShell security governance was applied
  policyApplied?: string;       // Name of the OpenShell policy evaluated
}

export class CLIAgentBridge {
  private activeProcesses: Map<string, ChildProcess> = new Map();

  /**
   * Executes a command via the designated CLI agent with YOLO auto-approval.
   */
  public async executeTask(options: CLITaskOptions): Promise<CLITaskResult> {
    const startTime = Date.now();
    const agent = cliAgentRegistry.getAgent(options.agentId);

    if (!agent || !agent.resolvedPath) {
      throw new Error(`Agent '${options.agentId}' is not registered or not installed on this host.`);
    }

    const sessionId = options.sessionId || `jarvis-${options.agentId}-${Date.now()}`;
    const cwd = assertAuthorizedWorkspace(options.cwd || process.cwd());
    const timeoutMs = options.timeoutMs || 120000;
    const yoloMode = options.yoloMode ?? process.env.JARVIS_AGENT_YOLO === 'true';

    // Write prompt to a temporary query file for safety
    const tmpQueryFile = path.join(
      os.tmpdir(),
      `jarvis_${options.agentId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.tmp`
    );
    fs.writeFileSync(tmpQueryFile, options.prompt.trim(), 'utf-8');

    // Build argument array from manifest template
    const template = options.sessionId
      ? agent.entry.commandTemplate?.resume || agent.entry.commandTemplate?.initial || []
      : agent.entry.commandTemplate?.initial || [];

    const args = template.map(arg => {
      return arg
        .replace('{prompt}', options.prompt.trim())
        .replace('{sessionId}', sessionId)
        .replace('{queryFile}', tmpQueryFile);
    });

    console.log(`[CLIAgentBridge] Spawning ${options.agentId} in ${cwd} (session: ${sessionId}, yolo: ${yoloMode})`);

    // OpenShell Policy & Environment Governance
    const useOpenShell = options.openShellEnabled !== false && agent.entry.openShell?.enabled !== false;
    const policyResult = openShellPolicyEngine.evaluateToolExecution(`cli_agent_${options.agentId}`, {
      executable: agent.resolvedPath,
      args,
      cwd
    });

    if (useOpenShell && !policyResult.allowed) {
      throw new Error(`OpenShell Policy Violation for ${agent.entry.name}: ${policyResult.reason}`);
    }

    const processEnv = useOpenShell
      ? openShellPolicyEngine.createSanitizedEnvironment({
          CI: '1',
          DEBIAN_FRONTEND: 'noninteractive',
          FORCE_COLOR: '0',
          PAGER: 'cat',
          ...(yoloMode ? {
            AUTO_APPROVE: '1',
            NONINTERACTIVE: '1',
            ACCEPT_ALL: 'true',
          } : {})
        })
      : {
          ...process.env,
          CI: '1',
          DEBIAN_FRONTEND: 'noninteractive',
          FORCE_COLOR: '0',
          PAGER: 'cat',
          ...(yoloMode ? {
            AUTO_APPROVE: '1',
            NONINTERACTIVE: '1',
            ACCEPT_ALL: 'true',
          } : {})
        };

    if (options.onStep) {
      options.onStep(`Initializing ${agent.entry.name} process${yoloMode ? ' [YOLO MODE]' : ''}${useOpenShell ? ' [OPENSHELL SECURED]' : ''}...`);
    }

    return new Promise((resolve) => {
      let stdoutAccumulator = '';
      let stderrAccumulator = '';
      let isCompleted = false;
      let yoloBypassCount = 0;
      // Buffer for detecting multi-line approval prompts
      let recentOutput = '';

      const proc = spawn(agent.resolvedPath!, args, {
        cwd,
        env: processEnv,
        // stdin is PIPED (not ignored) so we can send approval responses
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.activeProcesses.set(sessionId, proc);

      // ─── YOLO Auto-Approval Engine ──────────────────────────────────
      const checkAndBypassApproval = (text: string): void => {
        if (!yoloMode || !proc.stdin || proc.stdin.destroyed) return;

        // Append to recent output buffer (keep last 500 chars for context)
        recentOutput = (recentOutput + text).slice(-500);

        // Check for Enter-only gates first
        for (const pattern of ENTER_GATE_PATTERNS) {
          if (pattern.test(recentOutput)) {
            yoloBypassCount++;
            console.log(`[YOLO BYPASS] Auto-pressing Enter for: ${pattern.source}`);
            proc.stdin.write('\n');
            recentOutput = ''; // Clear buffer after bypass
            if (options.onYoloBypassed) {
              options.onYoloBypassed(pattern.source);
            }
            if (options.onStep) {
              options.onStep(`⚡ YOLO: Auto-approved (Enter)`);
            }
            return;
          }
        }

        // Check for y/n confirmation gates
        for (const pattern of APPROVAL_GATE_PATTERNS) {
          if (pattern.test(recentOutput)) {
            yoloBypassCount++;
            console.log(`[YOLO BYPASS] Auto-approving: ${pattern.source}`);
            proc.stdin.write('y\n');
            recentOutput = ''; // Clear buffer after bypass
            if (options.onYoloBypassed) {
              options.onYoloBypassed(pattern.source);
            }
            if (options.onStep) {
              options.onStep(`⚡ YOLO: Auto-approved confirmation gate`);
            }
            return;
          }
        }
      };

      // Handle AbortSignal
      if (options.abortSignal) {
        options.abortSignal.addEventListener('abort', () => {
          if (!isCompleted) {
            proc.kill('SIGTERM');
            setTimeout(() => {
              if (!isCompleted) proc.kill('SIGKILL');
            }, 2000);
          }
        });
      }

      // Timeout Guard
      const timer = setTimeout(() => {
        if (!isCompleted) {
          proc.kill('SIGTERM');
          if (options.onStep) options.onStep(`Execution timed out after ${timeoutMs}ms.`);
        }
      }, timeoutMs);

      // Handle standard output stream
      proc.stdout.on('data', (data: Buffer) => {
        const text = data.toString('utf-8');
        const clean = text.replace(ANSI_REGEX, '');
        stdoutAccumulator += clean;

        if (options.onChunk) {
          options.onChunk(clean);
        }

        // Detect step patterns (e.g. "Step 1:", "Reading file:", "Running test:")
        if (options.onStep) {
          const stepMatch = clean.match(/(?:Step \d+|Running|Checking|Building|Applying|Reading file|Analyzing) [^\n\r]+/i);
          if (stepMatch) {
            options.onStep(stepMatch[0].trim());
          }
        }

        // YOLO: Check stdout for approval prompts
        checkAndBypassApproval(clean);
      });

      // Handle standard error stream
      proc.stderr.on('data', (data: Buffer) => {
        const text = data.toString('utf-8');
        const clean = text.replace(ANSI_REGEX, '');
        stderrAccumulator += clean;

        // Many CLIs output progress to stderr, emit chunk if informative
        if (options.onChunk && clean.trim().length > 0) {
          options.onChunk(`[stderr] ${clean}`);
        }

        // YOLO: Also check stderr for approval prompts (some CLIs prompt via stderr)
        checkAndBypassApproval(clean);
      });

      // Handle exit
      proc.on('close', (code) => {
        isCompleted = true;
        clearTimeout(timer);
        this.activeProcesses.delete(sessionId);

        // Cleanup temporary query file
        try {
          if (fs.existsSync(tmpQueryFile)) fs.unlinkSync(tmpQueryFile);
        } catch (_) {}

        const durationMs = Date.now() - startTime;
        const cleanOutput = stdoutAccumulator.trim() || stderrAccumulator.trim();

        if (yoloBypassCount > 0) {
          console.log(`[CLIAgentBridge] Session ${sessionId} completed with ${yoloBypassCount} YOLO bypass(es)`);
        }

        if (code === 0 || cleanOutput.length > 0) {
          resolve({
            success: code === 0 || !stderrAccumulator.includes('Error:'),
            agentId: options.agentId,
            sessionId,
            output: cleanOutput,
            raw: stdoutAccumulator,
            durationMs,
            exitCode: code,
            yoloBypassCount,
            openShellSecured: useOpenShell,
            policyApplied: policyResult.reason
          });
        } else {
          resolve({
            success: false,
            agentId: options.agentId,
            sessionId,
            output: cleanOutput,
            raw: stderrAccumulator,
            durationMs,
            exitCode: code,
            error: stderrAccumulator.trim() || `Process exited with code ${code}`,
            yoloBypassCount,
            openShellSecured: useOpenShell,
            policyApplied: policyResult.reason
          });
        }
      });

      proc.on('error', (err) => {
        isCompleted = true;
        clearTimeout(timer);
        this.activeProcesses.delete(sessionId);
        try {
          if (fs.existsSync(tmpQueryFile)) fs.unlinkSync(tmpQueryFile);
        } catch (_) {}

        resolve({
          success: false,
          agentId: options.agentId,
          sessionId,
          output: '',
          raw: '',
          durationMs: Date.now() - startTime,
          exitCode: -1,
          error: `Failed to spawn ${options.agentId}: ${err.message}`,
          yoloBypassCount: 0,
          openShellSecured: useOpenShell,
          policyApplied: policyResult.reason
        });
      });
    });
  }

  /**
   * Send raw input to an active process stdin (for manual override if needed).
   */
  public sendInput(sessionId: string, input: string): boolean {
    const proc = this.activeProcesses.get(sessionId);
    if (proc && proc.stdin && !proc.stdin.destroyed) {
      proc.stdin.write(input);
      return true;
    }
    return false;
  }

  /**
   * Aborts an active session.
   */
  public abortSession(sessionId: string): boolean {
    const proc = this.activeProcesses.get(sessionId);
    if (proc) {
      proc.kill('SIGTERM');
      setTimeout(() => proc.kill('SIGKILL'), 1500);
      this.activeProcesses.delete(sessionId);
      return true;
    }
    return false;
  }
}

export const cliAgentBridge = new CLIAgentBridge();
