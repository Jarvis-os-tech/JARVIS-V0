import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_ROOT = path.resolve(__dirname, '../../..');
const ROSTER_FILE = path.resolve(WORKSPACE_ROOT, 'agents_roster.yaml');

export type AgentStatus = 'ACTIVE_CEO' | 'ACTIVE_WORKER' | 'PLANNED' | 'STANDBY';

export interface AgentBridgeConfig {
  type: string;
  script?: string;
  binary?: string;
  timeout_seconds?: number;
}

export interface AgentDefinition {
  id: string;
  name: string;
  title: string;
  status: AgentStatus;
  primary: boolean;
  description: string;
  capabilities: string[];
  skills: string[];
  bridge?: AgentBridgeConfig;
}

export interface AgentRoster {
  organization: {
    name: string;
    headquarters: string;
    version: string;
  };
  agents: Record<string, AgentDefinition>;
}

// Fallback default roster if file is not found
const DEFAULT_ROSTER: AgentRoster = {
  organization: {
    name: "J.A.R.V.I.S. Autonomous Operations",
    headquarters: "Stark Tower OS",
    version: "1.0.0"
  },
  agents: {
    jarvis: {
      id: "jarvis",
      name: "J.A.R.V.I.S.",
      title: "Chief Executive Officer (CEO) & Master Orchestrator",
      status: "ACTIVE_CEO",
      primary: true,
      description: "Autonomous strategic leader who interprets user directives, prescribes multi-step workflows, delegates tasks to specialist agents, enforces code quality gates, and reports back with British executive precision.",
      capabilities: [
        "mission_planning",
        "workflow_prescription",
        "quality_gate_enforcement",
        "executive_voice_reporting",
        "central_memory_indexing"
      ],
      skills: [
        "using-ceo",
        "speckit-plan",
        "speckit-tasks",
        "speckit-specify",
        "code-quality-check",
        "verification-before-completion"
      ]
    },
    hermes: {
      id: "hermes",
      name: "Hermes",
      title: "Chief Technology Officer (CTO) & Lead Software Engineer",
      status: "ACTIVE_WORKER",
      primary: true,
      description: "Deep engineering actuator with terminal access, responsible for full-stack code implementation, automated testing, bug remediation, and architecture execution.",
      capabilities: [
        "full_stack_development",
        "deep_code_reasoning",
        "systematic_debugging",
        "test_driven_development",
        "terminal_execution"
      ],
      bridge: {
        type: "cli",
        script: "hermes-connection/cli_bridge.py",
        binary: "hermes",
        timeout_seconds: 180
      },
      skills: [
        "systematic-debugging",
        "test-driven-development",
        "subagent-driven-development",
        "finishing-a-development-branch"
      ]
    },
    opencode: {
      id: "opencode",
      name: "OpenCode",
      title: "Browser & System Actuation Specialist",
      status: "PLANNED",
      primary: false,
      description: "Autonomous browser interaction, web scraping, visual validation, and external documentation discovery.",
      capabilities: [
        "browser_automation",
        "web_scraping",
        "visual_qa"
      ],
      skills: []
    },
    ultron: {
      id: "ultron",
      name: "Ultron",
      title: "Infrastructure & Security Guardian",
      status: "PLANNED",
      primary: false,
      description: "Container management, infrastructure automation, penetration testing, and security compliance verification.",
      capabilities: [
        "devops_automation",
        "security_audit",
        "performance_benchmarking"
      ],
      skills: []
    }
  }
};

/**
 * Lightweight parser for agents_roster.yaml
 */
function parseRosterYaml(raw: string): AgentRoster {
  try {
    const lines = raw.split('\n');
    const roster: AgentRoster = JSON.parse(JSON.stringify(DEFAULT_ROSTER));
    let currentAgent: AgentDefinition | null = null;
    let inCapabilities = false;
    let inSkills = false;
    let inBridge = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const indent = line.search(/\S/);

      // Top level agents section
      if (line.startsWith('  ') && !line.startsWith('    ') && trimmed.endsWith(':')) {
        const agentKey = trimmed.slice(0, -1).trim();
        if (agentKey !== 'organization') {
          if (!roster.agents[agentKey]) {
            roster.agents[agentKey] = {
              id: agentKey,
              name: agentKey,
              title: 'Specialist Agent',
              status: 'PLANNED',
              primary: false,
              description: '',
              capabilities: [],
              skills: []
            };
          }
          currentAgent = roster.agents[agentKey];
          inCapabilities = false;
          inSkills = false;
          inBridge = false;
        }
      } else if (currentAgent && indent >= 4) {
        if (trimmed.startsWith('capabilities:')) {
          inCapabilities = true;
          inSkills = false;
          inBridge = false;
          currentAgent.capabilities = [];
        } else if (trimmed.startsWith('skills:')) {
          inSkills = true;
          inCapabilities = false;
          inBridge = false;
          currentAgent.skills = [];
        } else if (trimmed.startsWith('bridge:')) {
          inBridge = true;
          inCapabilities = false;
          inSkills = false;
          if (!currentAgent.bridge) {
            currentAgent.bridge = { type: 'cli' };
          }
        } else if (trimmed.startsWith('- ') && inCapabilities) {
          const item = trimmed.slice(2).replace(/^["']|["']$/g, '');
          currentAgent.capabilities.push(item);
        } else if (trimmed.startsWith('- ') && inSkills) {
          const item = trimmed.slice(2).replace(/^["']|["']$/g, '');
          currentAgent.skills.push(item);
        } else if (inBridge && trimmed.includes(':')) {
          const [k, ...v] = trimmed.split(':');
          const val = v.join(':').trim().replace(/^["']|["']$/g, '');
          if (currentAgent.bridge) {
            if (k.trim() === 'type') currentAgent.bridge.type = val;
            if (k.trim() === 'script') currentAgent.bridge.script = val;
            if (k.trim() === 'binary') currentAgent.bridge.binary = val;
            if (k.trim() === 'timeout_seconds') currentAgent.bridge.timeout_seconds = parseInt(val, 10);
          }
        } else if (trimmed.includes(':')) {
          const colonIdx = trimmed.indexOf(':');
          const key = trimmed.slice(0, colonIdx).trim();
          let val = trimmed.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');

          if (key === 'id') currentAgent.id = val;
          if (key === 'name') currentAgent.name = val;
          if (key === 'title') currentAgent.title = val;
          if (key === 'status') currentAgent.status = val as AgentStatus;
          if (key === 'primary') currentAgent.primary = val.toLowerCase() === 'true';
          if (key === 'description') currentAgent.description = val;

          inCapabilities = false;
          inSkills = false;
          inBridge = false;
        }
      }
    }

    return roster;
  } catch (err: any) {
    console.warn('[CeoRoster] Error parsing YAML, using default roster:', err.message);
    return DEFAULT_ROSTER;
  }
}

/**
 * Load agent roster from agents_roster.yaml
 */
export function loadAgentRoster(): AgentRoster {
  if (fs.existsSync(ROSTER_FILE)) {
    try {
      const content = fs.readFileSync(ROSTER_FILE, 'utf-8');
      return parseRosterYaml(content);
    } catch (err: any) {
      console.warn('[CeoRoster] Failed to read agents_roster.yaml:', err.message);
    }
  }
  return DEFAULT_ROSTER;
}

/**
 * Get specific agent by ID (case-insensitive)
 */
export function getAgent(id: string): AgentDefinition | undefined {
  const roster = loadAgentRoster();
  const lower = id.toLowerCase().trim();
  return roster.agents[lower];
}

/**
 * List all active workers (excluding CEO)
 */
export function getActiveWorkers(): AgentDefinition[] {
  const roster = loadAgentRoster();
  return Object.values(roster.agents).filter(a => a.status === 'ACTIVE_WORKER');
}

/**
 * Dynamic registration of an agent
 */
export function registerAgent(agent: Partial<AgentDefinition> & { id: string; name: string }): AgentDefinition {
  const roster = loadAgentRoster();
  const lower = agent.id.toLowerCase().trim();
  const existing = roster.agents[lower] || {
    id: lower,
    name: agent.name,
    title: 'Specialist Agent',
    status: 'PLANNED',
    primary: false,
    description: '',
    capabilities: [],
    skills: []
  };

  const updated: AgentDefinition = {
    ...existing,
    ...agent,
    id: lower
  };

  roster.agents[lower] = updated;
  return updated;
}
