import fs from 'fs';
import path from 'path';
import os from 'os';
import { AgentStatus } from './types.js';
import { upsertAgent, getAllRegisteredAgents } from './db.js';

interface DiscoveredTarget {
  agentId: string;
  role: string;
  targetPaths: string[];
}

const KNOWN_TARGETS: DiscoveredTarget[] = [
  {
    agentId: 'Hermes',
    role: 'CTO / Lead Software Engineer',
    targetPaths: [
      path.join(os.homedir(), '.hermes'),
      path.join(os.homedir(), '.local/bin/hermes'),
    ]
  },
  {
    agentId: 'Claude',
    role: 'Code Architecture Specialist',
    targetPaths: [
      path.join(os.homedir(), '.claude'),
      path.join(os.homedir(), '.claude/history.jsonl'),
    ]
  },
  {
    agentId: 'Codex',
    role: 'Autonomous CLI Actuator',
    targetPaths: [
      path.join(os.homedir(), '.codex'),
    ]
  },
  {
    agentId: 'Antigravity',
    role: 'Autonomous Development Platform',
    targetPaths: [
      path.join(os.homedir(), '.gemini/antigravity'),
    ]
  },
  {
    agentId: 'Browser',
    role: 'Web Research & External Tools Gateway',
    targetPaths: [
      'http://localhost:8200/api/ingest/browser'
    ]
  }
];

/**
 * Scans the local system and environment to auto-discover installed agent runtimes
 */
export function discoverAgentRuntimes(): AgentStatus[] {
  const discovered: AgentStatus[] = [];

  for (const target of KNOWN_TARGETS) {
    let exists = false;
    let foundPath = target.targetPaths[0];

    if (target.agentId === 'Browser') {
      exists = true; // Virtual network adapter is always listening
    } else {
      for (const p of target.targetPaths) {
        if (fs.existsSync(p)) {
          exists = true;
          foundPath = p;
          break;
        }
      }
    }

    const agent: AgentStatus = {
      agentId: target.agentId,
      role: target.role,
      status: exists ? (target.agentId === 'Browser' ? 'LISTENING' : 'AUTO_CONNECTED') : 'OFFLINE',
      runtimePath: foundPath,
      lastActive: new Date().toISOString()
    };

    upsertAgent(agent);
    discovered.push(agent);
  }

  // Scan ~/.local/bin for any custom dynamic agent binaries
  try {
    const localBin = path.join(os.homedir(), '.local/bin');
    if (fs.existsSync(localBin)) {
      const files = fs.readdirSync(localBin);
      for (const file of files) {
        const lower = file.toLowerCase();
        if ((lower.includes('agent') || lower.includes('ai') || lower.includes('bot')) && !KNOWN_TARGETS.some(t => t.agentId.toLowerCase() === lower)) {
          const dynamicAgent: AgentStatus = {
            agentId: file,
            role: 'Dynamically Discovered Local CLI Tool',
            status: 'AUTO_CONNECTED',
            runtimePath: path.join(localBin, file),
            lastActive: new Date().toISOString()
          };
          upsertAgent(dynamicAgent);
          discovered.push(dynamicAgent);
        }
      }
    }
  } catch (err) {
    // Non-fatal scanning exception
  }

  return getAllRegisteredAgents();
}
