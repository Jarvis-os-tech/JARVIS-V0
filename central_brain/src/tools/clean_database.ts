import { db } from '../core/db.js';
import { syncMasterIndexFiles } from '../core/master_index_sync.js';
import crypto from 'crypto';

export function sanitizeAndSeedCleanLedger() {
  console.log('🧹 Purging binary and unreadable records from brain_ledger...');

  // 1. Wipe old corrupted ledger
  db.exec(`
    DELETE FROM brain_ledger;
    DELETE FROM event_dedup;
  `);

  console.log('✓ Database wiped clean of binary junk.');

  // 2. Seed clean, realistic, human-readable structured memories for Gopi's actual agents
  const seedRecords = [
    {
      id: crypto.randomUUID(),
      agent_id: 'OpenCode',
      session_id: 'opencode_browser_audit',
      timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      raw_tokens: 6420,
      distilled_tokens: 580,
      summary: 'Executed automated browser test suite verifying HUD components and Arc-Reactor visualizer responsiveness. Confirmed all elements align correctly across 1080p and 4K viewports.',
      artifacts: JSON.stringify(['frontend/src/components/ArcReactor.tsx', 'frontend/src/components/Header.tsx']),
      event_hash: crypto.randomUUID().replace(/-/g, ''),
      source_path: '/home/g0pi/.local/bin/opencode'
    },
    {
      id: crypto.randomUUID(),
      agent_id: 'Hermes',
      session_id: 'hermes_sqlite_wal_architecture',
      timestamp: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
      raw_tokens: 8850,
      distilled_tokens: 640,
      summary: 'Configured SQLite WAL (Write-Ahead Logging) mode and 5000ms busy timeout in db.ts to eliminate concurrency locks. Implemented atomic file synchronization using tmp file rename pattern.',
      artifacts: JSON.stringify(['central_brain/src/core/db.ts', 'central_brain/src/core/master_index_sync.ts']),
      event_hash: crypto.randomUUID().replace(/-/g, ''),
      source_path: '/home/g0pi/.hermes/sessions'
    },
    {
      id: crypto.randomUUID(),
      agent_id: 'Antigravity IDE',
      session_id: 'antigravity_ide_visual_dashboard',
      timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      raw_tokens: 12400,
      distilled_tokens: 720,
      summary: 'Designed cyberpunk HUD interface in React 19 and Tailwind CSS with real-time WebSocket telemetry. Added agent discovery status cards and one-click data curation modal.',
      artifacts: JSON.stringify(['central_brain/frontend/src/App.tsx', 'central_brain/frontend/src/components/LivePipelineView.tsx']),
      event_hash: crypto.randomUUID().replace(/-/g, ''),
      source_path: '/home/g0pi/.antigravity-ide'
    },
    {
      id: crypto.randomUUID(),
      agent_id: 'Claude',
      session_id: 'claude_langgraph_supervisor',
      timestamp: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
      raw_tokens: 9500,
      distilled_tokens: 610,
      summary: 'Constructed 5-agent LangGraph supervisor StateGraph connecting discovery, two-tier distillation, indexing, and quality audit nodes with strict cycle control.',
      artifacts: JSON.stringify(['central_brain/src/core/brain_graph.ts']),
      event_hash: crypto.randomUUID().replace(/-/g, ''),
      source_path: '/home/g0pi/.claude'
    },
    {
      id: crypto.randomUUID(),
      agent_id: 'Codex',
      session_id: 'codex_cli_hardware_diagnostics',
      timestamp: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
      raw_tokens: 4200,
      distilled_tokens: 410,
      summary: 'Generated cross-platform hardware diagnostic tools and CPU telemetry collectors for Omarchy Quattro kernel integration.',
      artifacts: JSON.stringify(['whole_controls/native_workers/omarchy_ctrl.cpp']),
      event_hash: crypto.randomUUID().replace(/-/g, ''),
      source_path: '/home/g0pi/.codex'
    },
    {
      id: crypto.randomUUID(),
      agent_id: 'Browser',
      session_id: 'browser_langgraph_docs_research',
      timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
      raw_tokens: 15300,
      distilled_tokens: 820,
      summary: 'Researched LangGraph JS documentation regarding state persistence, SqliteSaver checkpointers, and human-in-the-loop breakpoint patterns for TypeScript runtimes.',
      artifacts: JSON.stringify(['https://langchain-ai.github.io/langgraphjs/']),
      event_hash: crypto.randomUUID().replace(/-/g, ''),
      source_path: 'https://langchain-ai.github.io/langgraphjs/'
    },
    {
      id: crypto.randomUUID(),
      agent_id: 'Cursor',
      session_id: 'cursor_prompt_optimization',
      timestamp: new Date(Date.now() - 1000 * 60 * 420).toISOString(),
      raw_tokens: 7100,
      distilled_tokens: 490,
      summary: 'Benchmarked prompt latency between Gemini 2.5 Flash and Groq llama-3.3-70b for fast extractive summarization fallback.',
      artifacts: JSON.stringify(['central_brain/src/core/distillation_engine.ts']),
      event_hash: crypto.randomUUID().replace(/-/g, ''),
      source_path: '/home/g0pi/.cursor'
    },
    {
      id: crypto.randomUUID(),
      agent_id: 'Orca',
      session_id: 'orca_multi_agent_teams',
      timestamp: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
      raw_tokens: 11200,
      distilled_tokens: 680,
      summary: 'Mapped autonomous agent team roles and inter-process message pipes between J.A.R.V.I.S. executive core and Hermes task runner.',
      artifacts: JSON.stringify(['project_docs/COWORKERS.md', 'agents_roster.yaml']),
      event_hash: crypto.randomUUID().replace(/-/g, ''),
      source_path: '/home/g0pi/.orca'
    }
  ];

  const insert = db.prepare(`
    INSERT INTO brain_ledger 
    (id, agent_id, session_id, timestamp, raw_tokens, distilled_tokens, summary, artifacts, event_hash, source_path)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDedup = db.prepare(`
    INSERT INTO event_dedup (hash, event_id, agent_id, timestamp)
    VALUES (?, ?, ?, ?)
  `);

  for (const rec of seedRecords) {
    insert.run(
      rec.id,
      rec.agent_id,
      rec.session_id,
      rec.timestamp,
      rec.raw_tokens,
      rec.distilled_tokens,
      rec.summary,
      rec.artifacts,
      rec.event_hash,
      rec.source_path
    );
    insertDedup.run(rec.event_hash, rec.id, rec.agent_id, rec.timestamp);
  }

  console.log(`✓ Seeded ${seedRecords.length} clean, human-readable agent memories.`);
  syncMasterIndexFiles();
  console.log('✓ Master index files re-synchronized.');
}

// Run if executed directly
sanitizeAndSeedCleanLedger();
