/**
 * J.A.R.V.I.S. A2A Service Bridge
 * Coordinates the local Python A2A Protocol service (a2a-protocol/jarvis_a2a_agent.py),
 * queries agent cards, and dispatches tasks across the A2A mesh.
 */

import path from 'path';
import fs from 'fs';
import { spawn, execFile, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface A2AServiceStatus {
  available: boolean;
  pythonVenvPath: string | null;
  sdkInstalled: boolean;
  sdkVersion?: string;
  serverRunning: boolean;
  port: number;
  agentCardUrl: string;
  error?: string;
}

export class A2AServiceBridge {
  private venvPythonPath: string | null = null;
  private scriptPath: string | null = null;
  private serverProcess: ChildProcess | null = null;
  private port: number = 3001;
  private isRunning: boolean = false;

  constructor() {
    this.detectEnvironment();
  }

  public detectEnvironment(): void {
    const candidatePythons = [
      path.resolve(process.cwd(), 'a2a-protocol/.venv/bin/python'),
      path.resolve(__dirname, '../../../a2a-protocol/.venv/bin/python'),
      path.resolve(process.cwd(), 'a2a/.venv/bin/python'),
      path.resolve(__dirname, '../../../a2a/.venv/bin/python')
    ];

    for (const p of candidatePythons) {
      if (fs.existsSync(p)) {
        this.venvPythonPath = p;
        break;
      }
    }

    const candidateScripts = [
      path.resolve(process.cwd(), 'a2a-protocol/jarvis_a2a_agent.py'),
      path.resolve(__dirname, '../../../a2a-protocol/jarvis_a2a_agent.py'),
      path.resolve(process.cwd(), 'a2a/jarvis_a2a_agent.py')
    ];

    for (const s of candidateScripts) {
      if (fs.existsSync(s)) {
        this.scriptPath = s;
        break;
      }
    }
  }

  public async getStatus(): Promise<A2AServiceStatus> {
    this.detectEnvironment();

    const isAvailable = Boolean(this.venvPythonPath && this.scriptPath);
    let sdkVersion: string | undefined;
    let sdkInstalled = false;

    if (this.venvPythonPath) {
      try {
        const ver = await this.getSdkVersion();
        if (ver) {
          sdkInstalled = true;
          sdkVersion = ver;
        }
      } catch {
        sdkInstalled = false;
      }
    }

    // Check if port is responding
    let running = this.isRunning;
    if (!running) {
      try {
        const resp = await fetch(`http://127.0.0.1:${this.port}/health`, { signal: AbortSignal.timeout(1000) });
        if (resp.ok) running = true;
      } catch {
        running = false;
      }
    }

    return {
      available: isAvailable,
      pythonVenvPath: this.venvPythonPath,
      sdkInstalled,
      sdkVersion,
      serverRunning: running,
      port: this.port,
      agentCardUrl: `http://127.0.0.1:${this.port}/.well-known/agent-card.json`
    };
  }

  private getSdkVersion(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.venvPythonPath) return reject(new Error('Python venv not found'));
      execFile(
        this.venvPythonPath,
        ['-c', 'import a2a; import importlib.metadata; print(importlib.metadata.version("a2a-sdk"))'],
        { timeout: 3000 },
        (err, stdout) => {
          if (err) return reject(err);
          resolve(stdout.trim());
        }
      );
    });
  }

  /**
   * Starts the A2A Python background service if not already active.
   */
  public async startServer(port: number = 3001): Promise<{ success: boolean; message: string }> {
    this.port = port;
    this.detectEnvironment();

    if (!this.venvPythonPath || !this.scriptPath) {
      return {
        success: false,
        message: 'A2A Python virtual environment or jarvis_a2a_agent.py script not found.'
      };
    }

    // Check if already active
    try {
      const ping = await fetch(`http://127.0.0.1:${this.port}/health`, { signal: AbortSignal.timeout(1000) });
      if (ping.ok) {
        this.isRunning = true;
        return { success: true, message: `A2A Service is already running on port ${this.port}` };
      }
    } catch {
      // not running yet
    }

    return new Promise((resolve) => {
      const proc = spawn(this.venvPythonPath!, [this.scriptPath!, '--port', String(this.port)], {
        detached: true,
        stdio: 'ignore'
      });

      proc.unref();
      this.serverProcess = proc;
      this.isRunning = true;

      // Give it 1.5s to bind
      setTimeout(async () => {
        try {
          const check = await fetch(`http://127.0.0.1:${this.port}/health`, { signal: AbortSignal.timeout(2000) });
          if (check.ok) {
            resolve({
              success: true,
              message: `A2A Protocol Service started successfully on port ${this.port}. Agent card: http://127.0.0.1:${this.port}/.well-known/agent-card.json`
            });
          } else {
            resolve({ success: false, message: `Server process spawned but health check returned ${check.status}` });
          }
        } catch (err: any) {
          resolve({ success: false, message: `Failed to confirm A2A server startup: ${err.message}` });
        }
      }, 1500);
    });
  }

  /**
   * Fetches the Agent Card from the running A2A service.
   */
  public async fetchAgentCard(): Promise<any> {
    try {
      const resp = await fetch(`http://127.0.0.1:${this.port}/.well-known/agent-card.json`, {
        signal: AbortSignal.timeout(3000)
      });
      if (resp.ok) {
        return await resp.json();
      }
      throw new Error(`Failed with status: ${resp.status}`);
    } catch (err: any) {
      return { error: `Could not fetch A2A Agent Card: ${err.message}` };
    }
  }

  /**
   * Sends a task delegation request to the A2A server using standard A2A 1.0 protocol.
   */
  public async sendTask(prompt: string, contextId?: string): Promise<any> {
    const url = `http://127.0.0.1:${this.port}/a2a/rest/message:send`;
    const messageId = `msg-${Date.now()}`;
    const ctxId = contextId || `ctx-${Date.now()}`;
    const payload = {
      message: {
        message_id: messageId,
        context_id: ctxId,
        role: 'ROLE_USER',
        parts: [{ text: prompt }]
      }
    };

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'A2A-Version': '1.0'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000)
      });
      return await resp.json();
    } catch (err: any) {
      return { error: `Failed to dispatch A2A task: ${err.message}` };
    }
  }
}

export const a2aServiceBridge = new A2AServiceBridge();
