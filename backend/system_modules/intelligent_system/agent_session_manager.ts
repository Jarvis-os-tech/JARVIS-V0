/**
 * J.A.R.V.I.S. Agent Session Manager
 * 
 * Persistent session lifecycle for external CLI agents:
 * - Opens named sessions that persist across multiple commands
 * - Routes follow-up commands using each agent's native resume flags
 *   (Claude: --resume, Hermes: --continue, OpenCode: --session)
 * - Tracks full conversation history per session
 * - Persists sessions to disk (JSON) so they survive server restarts
 * - Streams real-time output to connected WebSocket clients
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cliAgentBridge, CLITaskResult } from './cli_agent_bridge';
import { cliAgentRegistry } from './cli_agent_registry';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SessionMessage {
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
  durationMs?: number;
  exitCode?: number | null;
}

export interface AgentSession {
  sessionId: string;
  agentId: string;
  agentName: string;
  status: 'active' | 'busy' | 'closed' | 'error';
  history: SessionMessage[];
  createdAt: number;
  lastActiveAt: number;
  commandCount: number;
  error?: string;
}

export interface SessionStore {
  version: number;
  sessions: Record<string, AgentSession>;
}

// ─── Manager ────────────────────────────────────────────────────────────────

export class AgentSessionManager {
  private sessions: Map<string, AgentSession> = new Map();
  private activeAbortControllers: Map<string, AbortController> = new Map();
  private storePath: string;
  private broadcastFn: ((payload: any) => void) | null = null;

  constructor() {
    // Store session history alongside the project
    const dataDir = path.resolve(__dirname, '../../../.jarvis_data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.storePath = path.join(dataDir, 'agent_sessions.json');
    this.loadFromDisk();
  }

  /**
   * Register the WebSocket broadcast function for real-time streaming.
   */
  public setBroadcast(fn: (payload: any) => void): void {
    this.broadcastFn = fn;
  }

  // ─── Session Lifecycle ──────────────────────────────────────────────────

  /**
   * Opens a new session with the specified agent.
   * Returns the session object.
   */
  public openSession(agentId: string): AgentSession {
    const agent = cliAgentRegistry.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent '${agentId}' is not registered.`);
    }
    if (!agent.isAvailable) {
      throw new Error(`Agent '${agentId}' (${agent.entry.name}) is not available on this system.`);
    }

    const sessionId = `jarvis-${agentId}-${Date.now()}`;
    const session: AgentSession = {
      sessionId,
      agentId,
      agentName: agent.entry.name,
      status: 'active',
      history: [],
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      commandCount: 0
    };

    this.sessions.set(sessionId, session);
    this.saveToDisk();

    console.log(`[SessionManager] Opened session ${sessionId} with ${agent.entry.name}`);
    this.broadcast({
      type: 'agent_session_opened',
      sessionId,
      agentId,
      agentName: agent.entry.name
    });

    return session;
  }

  /**
   * Sends a command to an active session.
   * Uses the agent's native session resume mechanism for multi-turn persistence.
   */
  public async sendCommand(
    sessionId: string,
    prompt: string,
    options?: { cwd?: string; timeoutMs?: number }
  ): Promise<CLITaskResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session '${sessionId}' not found.`);
    }
    if (session.status === 'closed') {
      throw new Error(`Session '${sessionId}' is closed. Open a new session.`);
    }
    if (session.status === 'busy') {
      throw new Error(`Session '${sessionId}' is busy with another command. Wait or abort.`);
    }

    // Mark as busy
    session.status = 'busy';
    session.lastActiveAt = Date.now();

    // Add user message to history
    session.history.push({
      role: 'user',
      content: prompt,
      timestamp: Date.now()
    });

    // Create abort controller for this execution
    const abortController = new AbortController();
    this.activeAbortControllers.set(sessionId, abortController);

    this.broadcast({
      type: 'agent_session_busy',
      sessionId,
      agentId: session.agentId,
      prompt
    });

    try {
      // The key: pass the sessionId so the bridge uses resume flags
      // For the first command (commandCount === 0), no sessionId is passed → uses initial template
      // For subsequent commands, sessionId is passed → uses resume template
      const useSessionId = session.commandCount > 0 ? sessionId : undefined;

      const result = await cliAgentBridge.executeTask({
        agentId: session.agentId,
        prompt,
        sessionId: useSessionId,
        cwd: options?.cwd || process.cwd(),
        timeoutMs: options?.timeoutMs || 300000, // 5 min default for agent work
        abortSignal: abortController.signal,
        onChunk: (chunk: string) => {
          // Stream each chunk to frontend in real-time
          this.broadcast({
            type: 'cli_agent_stream',
            sessionId,
            agentId: session.agentId,
            chunk
          });
        },
        onStep: (step: string) => {
          this.broadcast({
            type: 'cli_agent_step',
            sessionId,
            agentId: session.agentId,
            step
          });
        }
      });

      // Record agent response in history
      session.history.push({
        role: 'agent',
        content: result.output,
        timestamp: Date.now(),
        durationMs: result.durationMs,
        exitCode: result.exitCode
      });

      session.commandCount++;
      session.status = 'active';
      session.lastActiveAt = Date.now();

      this.activeAbortControllers.delete(sessionId);
      this.saveToDisk();

      this.broadcast({
        type: 'cli_agent_status',
        sessionId,
        agentId: session.agentId,
        status: result.success ? 'completed' : 'error',
        output: result.output,
        durationMs: result.durationMs
      });

      return result;
    } catch (err: any) {
      session.status = 'error';
      session.error = err.message;
      this.activeAbortControllers.delete(sessionId);
      this.saveToDisk();

      this.broadcast({
        type: 'cli_agent_status',
        sessionId,
        agentId: session.agentId,
        status: 'error',
        error: err.message
      });

      throw err;
    }
  }

  /**
   * Closes an active session. The session stays in history but becomes inactive.
   */
  public closeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    // Abort any running command
    this.abortCommand(sessionId);

    session.status = 'closed';
    session.lastActiveAt = Date.now();
    this.saveToDisk();

    console.log(`[SessionManager] Closed session ${sessionId}`);
    this.broadcast({
      type: 'agent_session_closed',
      sessionId,
      agentId: session.agentId
    });

    return true;
  }

  /**
   * Aborts a running command within a session without closing the session.
   */
  public abortCommand(sessionId: string): boolean {
    const controller = this.activeAbortControllers.get(sessionId);
    if (controller) {
      controller.abort();
      this.activeAbortControllers.delete(sessionId);

      const session = this.sessions.get(sessionId);
      if (session && session.status === 'busy') {
        session.status = 'active';
        this.saveToDisk();
      }

      // Also tell the bridge to kill the subprocess
      cliAgentBridge.abortSession(sessionId);

      this.broadcast({
        type: 'cli_agent_status',
        sessionId,
        agentId: session?.agentId || 'unknown',
        status: 'aborted'
      });

      return true;
    }
    return false;
  }

  // ─── Queries ────────────────────────────────────────────────────────────

  public getSession(sessionId: string): AgentSession | undefined {
    return this.sessions.get(sessionId);
  }

  public getActiveSessions(): AgentSession[] {
    return Array.from(this.sessions.values()).filter(
      s => s.status === 'active' || s.status === 'busy'
    );
  }

  public getAllSessions(): AgentSession[] {
    return Array.from(this.sessions.values());
  }

  public getSessionsByAgent(agentId: string): AgentSession[] {
    return Array.from(this.sessions.values()).filter(s => s.agentId === agentId);
  }

  // ─── Persistence ───────────────────────────────────────────────────────

  private saveToDisk(): void {
    try {
      const store: SessionStore = {
        version: 1,
        sessions: Object.fromEntries(this.sessions)
      };
      fs.writeFileSync(this.storePath, JSON.stringify(store, null, 2), 'utf-8');
    } catch (err: any) {
      console.warn('[SessionManager] Failed to persist sessions:', err.message);
    }
  }

  private loadFromDisk(): void {
    try {
      if (!fs.existsSync(this.storePath)) return;

      const raw = fs.readFileSync(this.storePath, 'utf-8');
      const store: SessionStore = JSON.parse(raw);

      if (store.version === 1 && store.sessions) {
        for (const [id, session] of Object.entries(store.sessions)) {
          // Mark any previously-busy sessions as active (server restarted mid-execution)
          if (session.status === 'busy') {
            session.status = 'active';
          }
          this.sessions.set(id, session);
        }
        console.log(`[SessionManager] Restored ${this.sessions.size} sessions from disk`);
      }
    } catch (err: any) {
      console.warn('[SessionManager] Failed to load sessions from disk:', err.message);
    }
  }

  // ─── Internal ──────────────────────────────────────────────────────────

  private broadcast(payload: any): void {
    if (this.broadcastFn) {
      this.broadcastFn(payload);
    }
  }
}

// Global Singleton
export const agentSessionManager = new AgentSessionManager();
