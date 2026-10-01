import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  FileText, 
  ArrowUpDown, 
  Calendar, 
  Layers, 
  CheckCircle2, 
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Terminal,
  Cpu,
  Code,
  Globe,
  Bot
} from 'lucide-react';

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
  selectedAgentFilter?: string;
}

export const MemoryLedgerView: React.FC<MemoryLedgerViewProps> = ({
  records,
  onInspect,
  onPurge,
  selectedAgentFilter = 'ALL',
}) => {
  const [filterAgent, setFilterAgent] = useState(selectedAgentFilter);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST' | 'SAVINGS'>('NEWEST');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Sync prop changes
  React.useEffect(() => {
    if (selectedAgentFilter) setFilterAgent(selectedAgentFilter);
  }, [selectedAgentFilter]);

  // Compute agent counts
  const agentCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: records.length };
    records.forEach((r) => {
      counts[r.agent_id] = (counts[r.agent_id] || 0) + 1;
    });
    return counts;
  }, [records]);

  const uniqueAgents = useMemo(() => {
    return ['ALL', ...Array.from(new Set(records.map((r) => r.agent_id)))];
  }, [records]);

  // Filter & Sort
  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => {
        const matchesAgent = filterAgent === 'ALL' || r.agent_id.toLowerCase() === filterAgent.toLowerCase();
        const matchesSearch =
          searchTerm.trim() === '' ||
          r.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.session_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.agent_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (r.source_path && r.source_path.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesAgent && matchesSearch;
      })
      .sort((a, b) => {
        if (sortOrder === 'NEWEST') return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        if (sortOrder === 'OLDEST') return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        if (sortOrder === 'SAVINGS') {
          const savingsA = a.raw_tokens > 0 ? (a.raw_tokens - a.distilled_tokens) / a.raw_tokens : 0;
          const savingsB = b.raw_tokens > 0 ? (b.raw_tokens - b.distilled_tokens) / b.raw_tokens : 0;
          return savingsB - savingsA;
        }
        return 0;
      });
  }, [records, filterAgent, searchTerm, sortOrder]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  const getAgentVisual = (id: string) => {
    switch (id.toLowerCase()) {
      case 'hermes':
        return { icon: Terminal, color: 'text-amber-400', badge: 'bg-amber-950/80 text-amber-300 border-amber-800' };
      case 'claude':
        return { icon: Cpu, color: 'text-purple-400', badge: 'bg-purple-950/80 text-purple-300 border-purple-800' };
      case 'codex':
        return { icon: Code, color: 'text-emerald-400', badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-800' };
      case 'antigravity':
        return { icon: Sparkles, color: 'text-cyan-400', badge: 'bg-cyan-950/80 text-cyan-300 border-cyan-800' };
      case 'browser':
        return { icon: Globe, color: 'text-blue-400', badge: 'bg-blue-950/80 text-blue-300 border-blue-800' };
      default:
        return { icon: Bot, color: 'text-slate-300', badge: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  return (
    <div className="space-y-5">
      {/* Search, Filter & Sort Toolbar */}
      <div className="bg-[#0a0f1d] border border-[#162342] rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search decisions, files, or sessions..."
            className="w-full bg-[#060a14] border border-[#1a2c4e] focus:border-cyan-500 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter by Agent Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {uniqueAgents.map((agent) => (
            <button
              key={agent}
              onClick={() => {
                setFilterAgent(agent);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                filterAgent === agent
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 shadow-sm'
                  : 'bg-[#060a14] text-slate-400 border border-[#162342] hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <span>{agent}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#0a0f1d] border border-[#162342] text-slate-400">
                {agentCounts[agent] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Sort Order Selector */}
        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="bg-[#060a14] border border-[#1a2c4e] rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
          >
            <option value="NEWEST">Newest First</option>
            <option value="OLDEST">Oldest First</option>
            <option value="SAVINGS">Highest Savings</option>
          </select>
        </div>
      </div>

      {/* Memory Cards Feed */}
      <div className="space-y-3.5">
        {filteredRecords.length === 0 ? (
          <div className="bg-[#0a0f1d] border border-[#162342] rounded-2xl p-16 text-center shadow-lg">
            <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3 opacity-60" />
            <h3 className="text-base font-semibold text-slate-200 mb-1">
              No Memory Records Found
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {records.length === 0
                ? 'Your central ledger is currently empty. Run an agent or use the browser bookmarklet to start logging memories.'
                : 'No memory cells match your current filter or search criteria.'}
            </p>
          </div>
        ) : (
          paginatedRecords.map((record) => {
            const visual = getAgentVisual(record.agent_id);
            const Icon = visual.icon;

            const savingsRatio =
              record.raw_tokens > 0
                ? (record.raw_tokens - record.distilled_tokens) / record.raw_tokens
                : 0;
            const savingsPercent = (savingsRatio * 100).toFixed(1);

            let artifactsList: string[] = [];
            try {
              artifactsList = JSON.parse(record.artifacts || '[]');
            } catch (e) {
              artifactsList = [];
            }

            return (
              <div
                key={record.id}
                className="bg-[#0a0f1d] border border-[#162342] hover:border-cyan-500/40 rounded-2xl p-4.5 transition-all shadow-md group"
              >
                {/* Card Top Line */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[#141e36]">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Agent Pill */}
                    <div className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 ${visual.badge}`}>
                      <Icon className="w-3.5 h-3.5" />
                      <span>{record.agent_id}</span>
                    </div>

                    {/* Session ID */}
                    <span className="text-xs font-mono text-slate-400 bg-[#060a14] px-2 py-0.5 rounded-md border border-[#162342]">
                      Session: <span className="text-slate-200 font-semibold">{record.session_id}</span>
                    </span>

                    {/* Timestamp */}
                    <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {new Date(record.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Token Compression Badge & Actions */}
                  <div className="flex items-center gap-2">
                    <div className="px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-800/80 text-emerald-400 font-mono text-xs font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>-{savingsPercent}% Tokens</span>
                      <span className="text-[10px] text-emerald-500/80 hidden sm:inline">
                        ({record.raw_tokens} → {record.distilled_tokens})
                      </span>
                    </div>

                    <button
                      onClick={() => onInspect(record)}
                      className="px-2.5 py-1 rounded-lg bg-[#060a14] hover:bg-slate-800 border border-[#1a2c4e] text-xs text-slate-300 hover:text-slate-100 flex items-center gap-1 transition-colors"
                      title="Inspect & Edit Summary"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>

                    <button
                      onClick={() => onPurge(record.id)}
                      className="px-2.5 py-1 rounded-lg bg-red-950/50 hover:bg-red-900/60 border border-red-800/70 text-xs text-red-300 hover:text-red-100 flex items-center gap-1 transition-colors"
                      title="Cascade Purge: Drops record and wipes dedup hash"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span className="hidden sm:inline">Purge</span>
                    </button>
                  </div>
                </div>

                {/* Distilled Summary Text */}
                <p className="text-sm text-slate-200 leading-relaxed mb-3 font-sans">
                  {record.summary}
                </p>

                {/* Deliverables / Artifacts */}
                {artifactsList.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#121c32]/50 text-xs">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                      Deliverables:
                    </span>
                    {artifactsList.map((art, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-[#060a14] border border-[#162342] text-[11px] font-mono text-cyan-300"
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

      {/* Pagination Footer */}
      {filteredRecords.length > itemsPerPage && (
        <div className="bg-[#0a0f1d] border border-[#162342] rounded-2xl p-4 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <strong className="text-slate-200">{(currentPage - 1) * itemsPerPage + 1}</strong> to{' '}
            <strong className="text-slate-200">
              {Math.min(currentPage * itemsPerPage, filteredRecords.length)}
            </strong>{' '}
            of <strong className="text-slate-200">{filteredRecords.length}</strong> memory records
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-[#060a14] border border-[#162342] text-slate-300 disabled:opacity-30 hover:border-cyan-500 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-mono text-xs px-2 text-slate-300">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-[#060a14] border border-[#162342] text-slate-300 disabled:opacity-30 hover:border-cyan-500 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
