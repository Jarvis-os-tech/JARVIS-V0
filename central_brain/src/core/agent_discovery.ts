import fs from 'fs';
import path from 'path';
import os from 'os';
import { AgentStatus } from './types.js';
import { upsertAgent, getAllRegisteredAgents } from './db.js';

interface DiscoveredTarget {
  agentId: string;
  role: string;
  description: string;
  targetPaths: string[];
}

const KNOWN_TARGETS: DiscoveredTarget[] = [
  {
    agentId: 'OpenCode',
    role: 'Autonomous Terminal & System Actuator',
    description: 'Executes direct terminal workflows, file modifications, and OS-level operations.',
    targetPaths: [
      path.join(os.homedir(), '.local/bin/opencode'),
      path.join(os.homedir(), '.opencode'),
    ]
  },
  {
    agentId: 'Antigravity IDE',
    role: 'Autonomous Antigravity Visual IDE',
    description: 'Visual developer environment, React frontend compilation, and live workspace editing.',
    targetPaths: [
      path.join(os.homedir(), '.local/bin/antigravity-ide'),
      path.join(os.homedir(), '.antigravity-ide'),
    ]
  },
  {
    agentId: 'Antigravity CLI',
    role: 'Autonomous CLI Agent & Coding Platform',
    description: 'Agentic coding CLI tool, terminal task executor, and workspace inspector.',
    targetPaths: [
      path.join(os.homedir(), '.local/bin/antigravity'),
      path.join(os.homedir(), '.local/bin/agy'),
      path.join(os.homedir(), '.antigravity'),
    ]
  },
  {
    agentId: 'Hermes',
    role: 'CTO / Lead Software Engineer',
    description: 'Technical lead orchestrator managing backend architecture, SQLite WAL databases, and code quality.',
    targetPaths: [
      path.join(os.homedir(), '.local/bin/hermes'),
      path.join(os.homedir(), '.local/bin/hermes-agent'),
      path.join(os.homedir(), '.hermes'),
    ]
  },
  {
    agentId: 'Claude',
    role: 'Code Architecture Specialist',
    description: 'Anthropic Claude Code CLI assistant specializing in refactoring, design patterns, and deep code reviews.',
    targetPaths: [
      path.join(os.homedir(), '.local/bin/claude'),
      path.join(os.homedir(), '.claude'),
      path.join(os.homedir(), '.claude.json'),
    ]
  },
  {
    agentId: 'Codex',
    role: 'Autonomous CLI Actuator & Script Builder',
    description: 'OpenAI Codex CLI engine for script synthesis, native shell execution, and hardware diagnostics.',
    targetPaths: [
      path.join(os.homedir(), '.local/bin/codex'),
      path.join(os.homedir(), '.codex'),
    ]
  },
  {
    agentId: 'Cursor',
    role: 'Cursor AI Workspace Engine',
    description: 'In-editor AI coding assistant managing multi-file edits, hooks, and codebase index caching.',
    targetPaths: [
      path.join(os.homedir(), '.local/bin/cursor-agent'),
      path.join(os.homedir(), '.cursor'),
    ]
  },
  {
    agentId: 'Cline',
    role: 'Autonomous Coding & Automation Agent',
    description: 'Visual Studio Code autonomous coding agent for direct project task execution.',
    targetPaths: [
      path.join(os.homedir(), '.cline'),
    ]
  },
  {
    agentId: 'GitHub Copilot',
    role: 'CLI & Workspace Agent',
    description: 'GitHub Copilot agentic tool for code suggestions and automated terminal task completions.',
    targetPaths: [
      path.join(os.homedir(), '.local/bin/copilot'),
      path.join(os.homedir(), '.copilot'),
    ]
  },
  {
    agentId: 'Grok',
    role: 'xAI Grok Terminal Assistant',
    description: 'Real-time terminal research agent and external knowledge validator.',
    targetPaths: [
      path.join(os.homedir(), '.local/bin/grok'),
      path.join(os.homedir(), '.grok'),
    ]
  },
  {
    agentId: 'Orca',
    role: 'Orca Autonomous Multi-Agent Workspace',
    description: 'Multi-agent orchestration environment and agent-hook pipeline manager.',
    targetPaths: [
      path.join(os.homedir(), '.local/bin/orca'),
      path.join(os.homedir(), '.local/bin/orca-ide'),
      path.join(os.homedir(), '.orca'),
      path.join(os.homedir(), 'orca'),
    ]
  },
  {
    agentId: 'Pi Agent',
    role: 'Autonomous Personal Intelligence Agent',
    description: 'Autonomous reasoning, memory synthesis, and user goal management agent.',
    targetPaths: [
      path.join(os.homedir(), '.local/bin/pi'),
      path.join(os.homedir(), '.pi'),
    ]
  },
  {
    agentId: 'Friday AI',
    role: 'Personal AI Assistant Engine',
    description: 'Long-term conversational memory store and personal notification assistant.',
    targetPaths: [
      path.join(os.homedir(), '.friday'),
    ]
  },
  {
    agentId: 'OpenClaw',
    role: 'System Autonomous Automation Agent',
    description: 'Desktop automation and system cron agent monitoring device status and logs.',
    targetPaths: [
      path.join(os.homedir(), '.openclaw'),
    ]
  },
  {
    agentId: 'OmniRush',
    role: 'OmniRush High-Speed AI Engine',
    description: 'Local high-performance inference engine for ultra-low latency token generation.',
    targetPaths: [
      path.join(os.homedir(), '.local/bin/omnirush'),
      path.join(os.homedir(), '.omnirush'),
    ]
  },
  {
    agentId: 'Browser',
    role: 'Web Research & External Tools Gateway',
    description: 'Captures web research, ChatGPT sessions, Claude web chats, and Colab runs via 1-click bookmarklet.',
    targetPaths: [
      'http://localhost:8200/api/ingest/browser'
    ]
  }
];

/**
 * Scans the local system to auto-discover all real installed agents on Gopi's machine
 */
export function discoverAgentRuntimes(): AgentStatus[] {
  const discovered: AgentStatus[] = [];

  for (const target of KNOWN_TARGETS) {
    let exists = false;
    let foundPath = target.targetPaths[0];

    if (target.agentId === 'Browser') {
      exists = true; // Virtual network adapter is always active
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

  // Scan ~/.local/bin for any custom dynamic agent binaries not yet cataloged
  try {
    const localBin = path.join(os.homedir(), '.local/bin');
    if (fs.existsSync(localBin)) {
      const files = fs.readdirSync(localBin);
      for (const file of files) {
        const lower = file.toLowerCase();
        const alreadyCovered = KNOWN_TARGETS.some(t => 
          t.agentId.toLowerCase() === lower || 
          t.targetPaths.some(tp => tp.endsWith(file))
        );

        if (!alreadyCovered && (lower.includes('agent') || lower.includes('ai') || lower.includes('bot') || lower.includes('voice'))) {
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
