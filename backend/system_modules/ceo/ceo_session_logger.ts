import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_ROOT = path.resolve(__dirname, '../../..');

const AGENTS_VAULT_DIR = path.resolve(WORKSPACE_ROOT, 'jarvis_memory_bundle/vault/agents');
const INDEX_JSON_PATH = path.resolve(AGENTS_VAULT_DIR, 'session_index.json');
const INDEX_MD_PATH = path.resolve(AGENTS_VAULT_DIR, 'session_index.md');

// Ensure directory exists
if (!fs.existsSync(AGENTS_VAULT_DIR)) {
  fs.mkdirSync(AGENTS_VAULT_DIR, { recursive: true });
}

export interface SessionEntry {
  sessionId: number;
  topic: string;
  summary: string;
  artifacts?: string[];
  timestamp: string;
}

export interface AgentSessionsMap {
  role: string;
  status: string;
  dates: Record<string, SessionEntry[]>;
}

export interface MasterSessionIndex {
  version: string;
  lastUpdated: string;
  agents: Record<string, AgentSessionsMap>;
}

function getFormattedDate(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

const DEFAULT_INDEX: MasterSessionIndex = {
  version: "1.0.0",
  lastUpdated: new Date().toISOString(),
  agents: {
    "Hermes": {
      "role": "CTO / Lead Software Engineer",
      "status": "ACTIVE_WORKER",
      "dates": {}
    },
    "Opencode": {
      "role": "Browser & System Actuator",
      "status": "PLANNED",
      "dates": {}
    },
    "Ultron": {
      "role": "Infrastructure & Security Guardian",
      "status": "PLANNED",
      "dates": {}
    }
  }
};

/**
 * Load the master single-index file
 */
export function loadMasterSessionIndex(): MasterSessionIndex {
  if (fs.existsSync(INDEX_JSON_PATH)) {
    try {
      const raw = fs.readFileSync(INDEX_JSON_PATH, 'utf-8');
      return JSON.parse(raw);
    } catch (e: any) {
      console.warn('[CeoSessionLogger] Error parsing session index JSON:', e.message);
    }
  }
  return JSON.parse(JSON.stringify(DEFAULT_INDEX));
}

/**
 * Save master single-index and update markdown mirror
 */
export function saveMasterSessionIndex(index: MasterSessionIndex): void {
  try {
    index.lastUpdated = new Date().toISOString();
    fs.writeFileSync(INDEX_JSON_PATH, JSON.stringify(index, null, 2), 'utf-8');
    syncMarkdownView(index);
  } catch (err: any) {
    console.error('[CeoSessionLogger] Failed to save session index:', err.message);
  }
}

/**
 * Format markdown view matching user's specification
 */
export function syncMarkdownView(index: MasterSessionIndex): void {
  try {
    let md = `# Central Memory Index\n\n`;
    md += `> Last Updated: ${index.lastUpdated}\n\n`;

    for (const [agentName, agentData] of Object.entries(index.agents)) {
      md += `## ${agentName}\n`;
      const dateKeys = Object.keys(agentData.dates || {});
      if (dateKeys.length === 0) {
        md += `*No recorded sessions yet.*\n\n`;
        continue;
      }

      for (const dateKey of dateKeys) {
        md += `### ${dateKey}\n`;
        const sessions = agentData.dates[dateKey] || [];
        for (const s of sessions) {
          md += `- **Session ${s.sessionId}**: ${s.topic}\n`;
          if (s.summary && s.summary !== s.topic) {
            md += `  - *Summary*: ${s.summary}\n`;
          }
          if (s.artifacts && s.artifacts.length > 0) {
            md += `  - *Artifacts*: ${s.artifacts.join(', ')}\n`;
          }
        }
        md += `\n`;
      }
    }

    fs.writeFileSync(INDEX_MD_PATH, md, 'utf-8');
  } catch (err: any) {
    console.warn('[CeoSessionLogger] Failed to write markdown index view:', err.message);
  }
}

/**
 * Record a session into the single index file
 */
export function recordAgentSession(
  agentName: string,
  topic: string,
  summary: string,
  artifacts: string[] = []
): SessionEntry {
  const index = loadMasterSessionIndex();
  const normalizedAgent = Object.keys(index.agents).find(
    k => k.toLowerCase() === agentName.toLowerCase()
  ) || agentName;

  if (!index.agents[normalizedAgent]) {
    index.agents[normalizedAgent] = {
      role: "Specialist Subagent",
      status: "ACTIVE_WORKER",
      dates: {}
    };
  }

  const today = getFormattedDate();
  if (!index.agents[normalizedAgent].dates[today]) {
    index.agents[normalizedAgent].dates[today] = [];
  }

  const existingSessions = index.agents[normalizedAgent].dates[today];
  const newSessionId = existingSessions.length + 1;

  const newEntry: SessionEntry = {
    sessionId: newSessionId,
    topic,
    summary,
    artifacts,
    timestamp: new Date().toISOString()
  };

  existingSessions.push(newEntry);
  saveMasterSessionIndex(index);

  return newEntry;
}

export interface SessionSearchResult {
  agent: string;
  date: string;
  session: SessionEntry;
  matchScore: number;
}

/**
 * Contextual retrieval: searches sessions by agent name and query
 */
export function findAgentSessions(agentName?: string, query?: string): SessionSearchResult[] {
  const index = loadMasterSessionIndex();
  const results: SessionSearchResult[] = [];
  const q = (query || '').toLowerCase().trim();

  for (const [name, agentData] of Object.entries(index.agents)) {
    if (agentName && name.toLowerCase() !== agentName.toLowerCase()) {
      continue;
    }

    for (const [date, sessions] of Object.entries(agentData.dates || {})) {
      for (const session of sessions) {
        let score = 0;
        if (!q) {
          score = 1;
        } else {
          const inTopic = session.topic.toLowerCase().includes(q);
          const inSummary = session.summary.toLowerCase().includes(q);
          const inArtifacts = (session.artifacts || []).some(a => a.toLowerCase().includes(q));

          if (inTopic) score += 3;
          if (inSummary) score += 2;
          if (inArtifacts) score += 1;
        }

        if (score > 0) {
          results.push({
            agent: name,
            date,
            session,
            matchScore: score
          });
        }
      }
    }
  }

  // Sort descending by matchScore then timestamp
  return results.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return new Date(b.session.timestamp).getTime() - new Date(a.session.timestamp).getTime();
  });
}
