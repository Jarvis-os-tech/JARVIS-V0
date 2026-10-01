import React, { useState } from 'react';

interface LedgerRecord {
  id: string;
  agent_id: string;
  session_id: string;
  timestamp: string;
  raw_tokens: number;
  distilled_tokens: number;
  summary: string;
  artifacts: string;
  source_path?: string;
  event_hash?: string;
}

interface MemoryLedgerViewProps {
  records: LedgerRecord[];
  onInspect: (record: LedgerRecord) => void;
  onPurge: (id: string) => void;
}

export const MemoryLedgerView: React.FC<MemoryLedgerViewProps> = ({
  records,
  onInspect,
  onPurge,
}) => {
  const [filterAgent, setFilterAgent] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = records.filter((r) => {
    const matchesAgent = filterAgent === 'ALL' || r.agent_id.toLowerCase() === filterAgent.toLowerCase();
    const matchesSearch =
      searchTerm.trim() === '' ||
      r.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.session_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.agent_id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesAgent && matchesSearch;
  });

  const agentsList = ['ALL', ...Array.from(new Set(records.map((r) => r.agent_id)))];

  return (
    <div className="space-y-5">
      {/* Search & Agent Filter Controls */}
      <div className="bg-[#0a0f1d] border border-[#15233e] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono mr-1">
            Agent:
          </span>
          {agentsList.map((agent) => (
            <button
              key={agent}
              onClick={() => setFilterAgent(agent)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                filterAgent === agent
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 shadow-sm'
                  : 'bg-[#05070d] text-slate-400 border border-[#1a2c4e] hover:text-slate-200'
              }`}
            >
              {agent}
            </button>
          ))}
        </div>

        <div className="w-full md:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search memory ledger..."
            className="w-full bg-[#05070d] border border-[#1a2c4e] rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>
      </div>

      {/* Memory Ledger Cards Grid */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-[#0a0f1d] border border-[#15233e] rounded-xl p-12 text-center text-slate-500 font-mono">
            {records.length === 0
              ? 'No memory records registered yet. Ingest activity from an agent or browser to populate the ledger.'
              : 'No memories match your search filter.'}
          </div>
        ) : (
          filtered.map((record) => {
            const savings =
              record.raw_tokens > 0
                ? (((record.raw_tokens - record.distilled_tokens) / record.raw_tokens) * 100).toFixed(1)
                : '0.0';

            let artifactsList: string[] = [];
            try {
              artifactsList = JSON.parse(record.artifacts || '[]');
            } catch (e) {
              artifactsList = [];
            }

            return (
              <div
                key={record.id}
                className="bg-[#0a0f1d] border border-[#15233e] hover:border-cyan-500/40 rounded-xl p-4 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-[#121c32]">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 font-mono text-xs font-bold">
                      {record.agent_id}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Session: <code className="text-slate-200">{record.session_id}</code>
                    </span>
                    <span className="text-xs text-slate-500 font-mono hidden md:inline">
                      • {new Date(record.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 font-mono text-[11px] font-semibold">
                      {record.raw_tokens} → {record.distilled_tokens} tokens (-{savings}%)
                    </span>
                    <button
                      onClick={() => onInspect(record)}
                      className="px-2.5 py-1 rounded bg-[#05070d] border border-slate-700 hover:border-cyan-500 text-xs text-slate-300 transition-colors"
                    >
                      Inspect / Edit
                    </button>
                    <button
                      onClick={() => onPurge(record.id)}
                      title="Cascade Purge: Removes from SQLite and clears dedup hash"
                      className="px-2.5 py-1 rounded bg-red-950/60 border border-red-800/70 hover:bg-red-900/60 text-xs text-red-300 transition-colors"
                    >
                      🗑️ Purge
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed font-mono">
                  {record.summary}
                </p>

                {artifactsList.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#121c32]/50">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                      Artifacts:
                    </span>
                    {artifactsList.map((art, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-cyan-400/90 font-mono"
                      >
                        {art}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
