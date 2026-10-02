/**
 * J.A.R.V.I.S. CLI Agent Registry & Discovery Engine
 * 
 * Auto-detects external CLI agents, validates installation status,
 * maps them to official A2A Agent Cards, and exposes them to J.A.R.V.I.S.
 */

import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { AgentCard, AgentDomain } from './a2a_types';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ManifestAgentEntry {
  id: string;
  name: string;
  binary: string;
  role: string;
  domain: AgentDomain;
  description: string;
  color?: string;
  preferredPaths?: string[];
  endpointUrl?: string;
  healthArgs: string[];
  commandTemplate?: {
    initial: string[];
    resume: string[];
  };
  skills: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}

export interface RegisteredAgent {
  entry: ManifestAgentEntry;
  resolvedPath: string | null;
  isAvailable: boolean;
  version?: string;
  lastChecked: number;
  agentCard: AgentCard;
}

export class CLIAgentRegistry {
  private agents: Map<string, RegisteredAgent> = new Map();
  private manifestPath: string;
  private isInitialized = false;

  constructor(manifestPath?: string) {
    this.manifestPath = manifestPath || path.resolve(__dirname, 'cli_agents_manifest.json');
  }

  /**
   * Initializes the registry, discovers binaries on the host, and runs health probes.
   */
  public async initialize(): Promise<void> {
    try {
      if (!fs.existsSync(this.manifestPath)) {
        console.warn(`[CLIAgentRegistry] Manifest not found at: ${this.manifestPath}`);
        return;
      }

      const raw = fs.readFileSync(this.manifestPath, 'utf-8');
      const manifest: { agents: ManifestAgentEntry[] } = JSON.parse(raw);

      for (const entry of manifest.agents) {
        const resolvedPath = await this.resolveBinary(entry);
        let isAvailable = false;
        let version: string | undefined = undefined;

        if (resolvedPath) {
          try {
            const { stdout } = await execFileAsync(resolvedPath, entry.healthArgs, { timeout: 3000 });
            isAvailable = true;
            version = stdout.trim().split('\n')[0].slice(0, 40);
          } catch (e: any) {
            // Even if health check exited with 1 (some tools output help to stderr), binary exists
            if (fs.existsSync(resolvedPath)) {
              isAvailable = true;
            }
          }
        }

        const agentCard: AgentCard = {
          name: entry.name,
          description: entry.description,
          url: entry.endpointUrl || `http://127.0.0.1:3000/api/a2a/agents/${entry.id}`,
          version: version || '1.0.0',
          domain: entry.domain,
          defaultInputModes: ['text', 'text/plain'],
          defaultOutputModes: ['text', 'text/plain'],
          capabilities: {
            streaming: true,
            pushNotifications: true,
            statePersistence: true,
            multiTurn: true
          },
          skills: entry.skills.map(s => ({
            id: s.id,
            name: s.name,
            description: s.description
          })),
          status: isAvailable ? 'active' : 'offline',
          lastSeen: Date.now()
        };

        this.agents.set(entry.id, {
          entry,
          resolvedPath,
          isAvailable,
          version,
          lastChecked: Date.now(),
          agentCard
        });

        console.log(`[CLIAgentRegistry] Agent '${entry.name}' (${entry.id}) -> ${isAvailable ? `READY (${resolvedPath})` : 'UNAVAILABLE'}`);
      }

      this.isInitialized = true;
    } catch (err: any) {
      console.error('[CLIAgentRegistry] Initialization failed:', err?.message || err);
    }
  }

  /**
   * Resolves the absolute path of an agent executable.
   */
  private async resolveBinary(entry: ManifestAgentEntry): Promise<string | null> {
    const home = process.env.HOME || '/home/g0pi';

    // 1. Check preferred paths
    if (entry.preferredPaths) {
      for (const p of entry.preferredPaths) {
        const expanded = p.replace(/^~/, home);
        if (fs.existsSync(expanded)) {
          return expanded;
        }
      }
    }

    // 2. Check system PATH via 'which'
    try {
      const { stdout } = await execFileAsync('which', [entry.binary]);
      const found = stdout.trim();
      if (found && fs.existsSync(found)) {
        return found;
      }
    } catch (e) {
      // not in standard PATH
    }

    return null;
  }

  public getAgent(id: string): RegisteredAgent | undefined {
    return this.agents.get(id);
  }

  public getAllAgents(): RegisteredAgent[] {
    return Array.from(this.agents.values());
  }

  public getAvailableAgents(): RegisteredAgent[] {
    return Array.from(this.agents.values()).filter(a => a.isAvailable);
  }

  public getAgentCards(): AgentCard[] {
    return Array.from(this.agents.values()).map(a => a.agentCard);
  }
}

// Global Singleton
export const cliAgentRegistry = new CLIAgentRegistry();
