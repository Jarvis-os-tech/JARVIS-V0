import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import { BrainLedgerRecord } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../../data');

/**
 * Synchronizes SQLite ledger entries to dual-format filesystem indices:
 * 1. master_index.json (Machine-readable array)
 * 2. master_index.md (Human-readable markdown timeline)
 * Uses atomic tmp file write + renameSync to ensure zero read-corruption.
 * Fulfills Gap 2 / Fixture B.
 */
export function syncMasterIndexFiles(): { success: boolean; durationMs: number; recordCount: number } {
  const start = performance.now();
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const allLogs = db.prepare('SELECT * FROM brain_ledger ORDER BY timestamp DESC').all() as BrainLedgerRecord[];

  // 1. Prepare JSON format
  const jsonPath = path.join(DATA_DIR, 'master_index.json');
  const jsonTmp = path.join(DATA_DIR, 'master_index.json.tmp');
  const jsonPayload = JSON.stringify(allLogs, null, 2);
  fs.writeFileSync(jsonTmp, jsonPayload, 'utf8');
  fs.renameSync(jsonTmp, jsonPath);

  // 2. Prepare Markdown format
  const mdPath = path.join(DATA_DIR, 'master_index.md');
  const mdTmp = path.join(DATA_DIR, 'master_index.md.tmp');

  let totalRaw = 0;
  let totalDistilled = 0;
  for (const log of allLogs) {
    totalRaw += log.raw_tokens || 0;
    totalDistilled += log.distilled_tokens || 0;
  }
  const overallSavings = totalRaw > 0 ? (((totalRaw - totalDistilled) / totalRaw) * 100).toFixed(1) : '0.0';

  let markdownContent = `# Central Brain Memory Master Index Ledger\n\n`;
  markdownContent += `> **Last Synchronized**: ${new Date().toISOString()}  \n`;
  markdownContent += `> **Total Indexed Sessions**: ${allLogs.length}  \n`;
  markdownContent += `> **Overall Token Efficiency**: -${overallSavings}% (Raw: ${totalRaw.toLocaleString()} tokens → Stored: ${totalDistilled.toLocaleString()} tokens)  \n\n`;
  markdownContent += `---\n\n`;

  if (allLogs.length === 0) {
    markdownContent += `*No sessions recorded yet. Autonomous ingestion sentinel is standing by.*\n`;
  } else {
    for (const log of allLogs) {
      const savings = log.raw_tokens > 0 
        ? (((log.raw_tokens - log.distilled_tokens) / log.raw_tokens) * 100).toFixed(1)
        : '0.0';
      
      let artifactsList = '';
      try {
        const parsed = JSON.parse(log.artifacts || '[]');
        if (Array.isArray(parsed) && parsed.length > 0) {
          artifactsList = ` | **Artifacts**: \`${parsed.join('`, `')}\``;
        }
      } catch (e) {
        // ignore artifact parsing error
      }

      markdownContent += `### 🤖 Agent: \`${log.agent_id}\` | Session: \`${log.session_id}\`\n`;
      markdownContent += `- **Timestamp**: ${log.timestamp}\n`;
      markdownContent += `- **Token Compression**: ${log.raw_tokens} raw → ${log.distilled_tokens} distilled (-${savings}%)\n`;
      markdownContent += `- **Summary**: ${log.summary}${artifactsList}\n\n---\n\n`;
    }
  }

  fs.writeFileSync(mdTmp, markdownContent, 'utf8');
  fs.renameSync(mdTmp, mdPath);

  const durationMs = Math.round((performance.now() - start) * 100) / 100;
  return { success: true, durationMs, recordCount: allLogs.length };
}
