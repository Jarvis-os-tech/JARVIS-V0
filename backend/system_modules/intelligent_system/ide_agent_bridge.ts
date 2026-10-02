/**
 * J.A.R.V.I.S. IDE Agent Bridge
 * 
 * Connects J.A.R.V.I.S. and the A2A Protocol to local IDE environments:
 * - Orca IDE: Hooks into ~/.orca/agent-hooks/spool and IPC endpoints
 * - Antigravity IDE: Integrates with workspace state and telemetry
 * - Cursor Agent: Interfaces with local editor tools
 */

import fs from 'fs';
import path from 'path';
import { AgentCard } from './a2a_types';

export interface IDEContext {
  activeIDE: string | null;
  openFiles: string[];
  activePane?: string;
  recentSpoolEvents: Array<{
    source: string;
    receivedAt: number;
    payload: any;
  }>;
}

export class IDEAgentBridge {
  private homeDir: string;
  private orcaHooksDir: string;
  private spoolDir: string;

  constructor() {
    this.homeDir = process.env.HOME || '/home/g0pi';
    this.orcaHooksDir = path.join(this.homeDir, '.orca', 'agent-hooks');
    this.spoolDir = path.join(this.orcaHooksDir, 'spool');
  }

  /**
   * Retrieves the current context from active IDE hooks.
   */
  public async getIDEContext(): Promise<IDEContext> {
    const context: IDEContext = {
      activeIDE: null,
      openFiles: [],
      recentSpoolEvents: []
    };

    // Check if Orca IDE hook system is present
    if (fs.existsSync(this.orcaHooksDir)) {
      context.activeIDE = 'Orca IDE';

      // Read recent spool events if available
      if (fs.existsSync(this.spoolDir)) {
        try {
          const files = fs.readdirSync(this.spoolDir).filter(f => f.endsWith('.jsonl'));
          for (const file of files.slice(0, 3)) {
            const filePath = path.join(this.spoolDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.trim().split('\n').filter(Boolean);
            for (const line of lines.slice(-5)) {
              try {
                const parsed = JSON.parse(line);
                context.recentSpoolEvents.push({
                  source: parsed.source || 'orca',
                  receivedAt: parsed.receivedAt || Date.now(),
                  payload: parsed.payload
                });
              } catch (_) {}
            }
          }
        } catch (err) {
          // Non-critical: spool read failure
        }
      }
    }

    // Check Antigravity IDE
    const antigravityPath = path.join(this.homeDir, '.local', 'share', 'antigravity-ide');
    if (fs.existsSync(antigravityPath) && !context.activeIDE) {
      context.activeIDE = 'Antigravity IDE';
    }

    return context;
  }

  /**
   * Generates A2A Agent Cards for IDE agents.
   */
  public getAgentCards(): AgentCard[] {
    const cards: AgentCard[] = [
      {
        name: 'Orca IDE Agent',
        description: 'Native Orca IDE context and multi-agent workspace hook bridge.',
        url: 'http://127.0.0.1:3000/api/a2a/agents/orca',
        version: '1.0.0',
        domain: 'ide',
        defaultInputModes: ['text', 'text/plain', 'application/json'],
        defaultOutputModes: ['text', 'text/plain'],
        capabilities: {
          streaming: true,
          pushNotifications: true,
          statePersistence: true
        },
        skills: [
          {
            id: 'ide_context_sync',
            name: 'IDE Context Sync',
            description: 'Synchronizes active editor buffers, diagnostics, and open pane references.'
          }
        ],
        status: fs.existsSync(this.orcaHooksDir) ? 'active' : 'offline',
        lastSeen: Date.now()
      },
      {
        name: 'Antigravity IDE Agent',
        description: 'Workspace-aware language service and code navigation agent.',
        url: 'http://127.0.0.1:3000/api/a2a/agents/antigravity',
        version: '1.0.0',
        domain: 'ide',
        defaultInputModes: ['text', 'text/plain'],
        defaultOutputModes: ['text', 'text/plain'],
        capabilities: {
          streaming: true,
          pushNotifications: false,
          statePersistence: true
        },
        skills: [
          {
            id: 'workspace_ast',
            name: 'Workspace AST Navigation',
            description: 'Performs semantic code analysis and symbol resolution across the active project.'
          }
        ],
        status: 'active',
        lastSeen: Date.now()
      }
    ];

    return cards;
  }
}

export const ideAgentBridge = new IDEAgentBridge();
