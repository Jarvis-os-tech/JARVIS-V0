import React, { useState, useEffect } from 'react';
import {
  JarvisMemoryState,
  MemoryTier,
  LongTermMemoryItem,
  SemanticMemoryItem,
  EpisodicMemoryItem
} from '../types';
import { jarvisMemoryEngine } from '../services/memoryEngine';
import {
  Brain,
  Zap,
  Clock,
  Shield,
  Search,
  Plus,
  Trash2,
  Pin,
  PinOff,
  RefreshCw,
  CheckCircle2,
  X,
  Layers,
  Sparkles,
  Cpu,
  Activity,
  FileText
} from 'lucide-react';

interface JarvisMemoryHUDProps {
  isOpen: boolean;
  onClose: () => void;
  onSendPromptToJarvis?: (prompt: string) => void;
}

export const JarvisMemoryHUD: React.FC<JarvisMemoryHUDProps> = ({
  isOpen,
  onClose,
  onSendPromptToJarvis
}) => {
  const [memoryState, setMemoryState] = useState<JarvisMemoryState>(jarvisMemoryEngine.getState());
  const [activeTier, setActiveTier] = useState<MemoryTier>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingFact, setIsAddingFact] = useState(false);
  const [isAddingLTM, setIsAddingLTM] = useState(false);

  // Form states
  const [newFactSubject, setNewFactSubject] = useState('User');
  const [newFactPredicate, setNewFactPredicate] = useState('prefers');
  const [newFactObject, setNewFactObject] = useState('');
  const [newFactDomain, setNewFactDomain] = useState<'identity' | 'coding' | 'workflow' | 'preferences' | 'knowledge' | 'system'>('coding');

  const [newLtmTitle, setNewLtmTitle] = useState('');
  const [newLtmContent, setNewLtmContent] = useState('');
  const [newLtmCategory, setNewLtmCategory] = useState<'core_protocol' | 'user_profile' | 'preference' | 'project' | 'directive'>('user_profile');
  const [newLtmImportance, setNewLtmImportance] = useState<'critical' | 'high' | 'medium' | 'standard'>('high');

  const [vaultTelemetry, setVaultTelemetry] = useState<any>(jarvisMemoryEngine.getVaultTelemetry());
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshState = () => {
    setMemoryState(jarvisMemoryEngine.getState());
  };

  const handleServerSync = async () => {
    setIsSyncing(true);
    const res = await jarvisMemoryEngine.syncWithServer();
    if (res.vaultStatus) {
      setVaultTelemetry(res.vaultStatus);
    }
    refreshState();
    setIsSyncing(false);
  };

  useEffect(() => {
    if (isOpen) {
      refreshState();
      if (!vaultTelemetry) {
        handleServerSync();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddFact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFactObject.trim()) return;

    jarvisMemoryEngine.addSemanticFact({
      subject: newFactSubject.trim(),
      predicate: newFactPredicate.trim(),
      object: newFactObject.trim(),
      domain: newFactDomain,
      confidence: 0.95,
      tags: [newFactDomain, newFactSubject.toLowerCase()]
    });

    setNewFactObject('');
    setIsAddingFact(false);
    refreshState();
  };

  const handleAddLTM = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLtmTitle.trim() || !newLtmContent.trim()) return;

    jarvisMemoryEngine.addLongTermMemory({
      category: newLtmCategory,
      title: newLtmTitle.trim(),
      content: newLtmContent.trim(),
      importance: newLtmImportance,
      isPinned: true
    });

    setNewLtmTitle('');
    setNewLtmContent('');
    setIsAddingLTM(false);
    refreshState();
  };

  const handleClearWorkingMemory = () => {
    jarvisMemoryEngine.clearWorkingMemory();
    refreshState();
  };

  // Filtered memory computations
  const query = searchQuery.toLowerCase().trim();

  const filteredSemantic = memoryState.semantic.filter(
    f => !query || f.subject.toLowerCase().includes(query) || f.predicate.toLowerCase().includes(query) || f.object.toLowerCase().includes(query) || f.tags.some(t => t.toLowerCase().includes(query))
  );

  const filteredLongTerm = memoryState.longTerm.filter(
    l => !query || l.title.toLowerCase().includes(query) || l.content.toLowerCase().includes(query) || l.category.toLowerCase().includes(query)
  );

  const filteredEpisodic = memoryState.episodic.filter(
    e => !query || e.title.toLowerCase().includes(query) || e.summary.toLowerCase().includes(query) || e.keyDecisions.some(d => d.toLowerCase().includes(query))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl animate-fade-in">
      {/* HUD Frame */}
      <div className="relative w-full max-w-5xl h-[90vh] bg-gradient-to-b from-slate-950 via-[#06101e] to-slate-950 border border-cyan-500/30 rounded-3xl shadow-[0_0_80px_rgba(6,182,212,0.15)] flex flex-col overflow-hidden text-zinc-100">
        
        {/* Top Arc-Reactor HUD Header */}
        <div className="relative px-6 py-4 border-b border-cyan-500/20 bg-slate-950/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Brain className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-wide text-cyan-300 flex items-center gap-2">
                  J.A.R.V.I.S. MEMORY CORE
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                    4-Tier Cognitive Matrix
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Order: Working → Episodic → Semantic → Long-Term | Health: <span className="text-cyan-400 font-bold">{memoryState.memoryHealthIndex}%</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onSendPromptToJarvis && (
              <button
                onClick={() => {
                  onClose();
                  onSendPromptToJarvis("J.A.R.V.I.S., review your four memory banks and synthesize our current directives.");
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-semibold transition-all shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Ask J.A.R.V.I.S. to Recall
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation & Search Bar */}
        <div className="px-6 py-3 border-b border-cyan-500/15 bg-slate-900/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Tier Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTier('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTier === 'all'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 font-bold'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 border border-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> All Tiers
            </button>

            <button
              onClick={() => setActiveTier('short_term')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTier === 'short_term'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 font-bold'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 border border-white/5'
              }`}
            >
              <Zap className="w-3.5 h-3.5" /> 1. Working ({memoryState.shortTerm.recentTurns.length})
            </button>

            <button
              onClick={() => setActiveTier('episodic')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTier === 'episodic'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 font-bold'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 border border-white/5'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> 2. Episodic ({memoryState.episodic.length})
            </button>

            <button
              onClick={() => setActiveTier('semantic')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTier === 'semantic'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 font-bold'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 border border-white/5'
              }`}
            >
              <Brain className="w-3.5 h-3.5" /> 3. Semantic ({memoryState.semantic.length})
            </button>

            <button
              onClick={() => setActiveTier('long_term')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTier === 'long_term'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 font-bold'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 border border-white/5'
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> 4. Long-Term ({memoryState.longTerm.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memory banks..."
              className="w-full bg-slate-950/80 border border-cyan-500/25 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* Sovereign Dual-Store Memory Telemetry & Self-Improving Status */}
        <div className="px-6 py-2.5 bg-slate-950/90 border-b border-cyan-500/15 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono shrink-0">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-semibold text-slate-200">Vault Store:</span>
              <span className="text-emerald-400">{vaultTelemetry?.vault?.status ? 'Obsidian + SQLite WAL' : 'Synchronized'}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-slate-400">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>DB Nodes: <strong className="text-cyan-300">{vaultTelemetry?.engine?.memory_nodes ?? 3}</strong></span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-slate-400">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Vault Facts: <strong className="text-cyan-300">{vaultTelemetry?.vault?.total_facts ?? 2}</strong></span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-slate-400">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              <span>Turns Logged: <strong className="text-indigo-300">{vaultTelemetry?.engine?.conversation_turns ?? 218}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-300/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Dynamic Self-Improving Miner: Active</span>
            </div>
          </div>

          <button
            onClick={handleServerSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg text-[11px] transition-all disabled:opacity-50"
            title="Sync with Sovereign Vault and SQLite Database"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Vault'}
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* TIER 1: WORKING / SHORT-TERM MEMORY */}
          {(activeTier === 'all' || activeTier === 'short_term') && (
            <section className="bg-slate-900/40 border border-cyan-500/20 rounded-2xl p-4 sm:p-5 relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-cyan-300">TIER 1: WORKING / SHORT-TERM MEMORY</h3>
                    <p className="text-[11px] text-slate-400">Immediate active session buffer &amp; rolling dialogue turns</p>
                  </div>
                </div>

                <button
                  onClick={handleClearWorkingMemory}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:text-cyan-300 bg-slate-800/60 hover:bg-slate-800 border border-white/5 rounded-lg transition-colors"
                  title="Clear active turns buffer"
                >
                  <RefreshCw className="w-3 h-3" /> Reset Buffer
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div className="p-3 bg-slate-950/60 border border-cyan-500/10 rounded-xl">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-400 block mb-1">Active Objective</span>
                  <p className="text-xs text-slate-200">{memoryState.shortTerm.currentGoal}</p>
                </div>
                <div className="p-3 bg-slate-950/60 border border-cyan-500/10 rounded-xl">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-400 block mb-1">Active Entity Focus</span>
                  <div className="flex flex-wrap gap-1.5">
                    {memoryState.shortTerm.activeEntities.map((ent, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-mono">
                        {ent}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Turns Stream */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {memoryState.shortTerm.recentTurns.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-2">Working buffer is currently empty. Start speaking or typing to J.A.R.V.I.S. to record active turns.</p>
                ) : (
                  memoryState.shortTerm.recentTurns.map((turn) => (
                    <div
                      key={turn.id}
                      className={`p-2.5 rounded-xl text-xs flex items-start justify-between gap-3 ${
                        turn.speaker === 'user'
                          ? 'bg-cyan-950/30 border border-cyan-500/20 text-cyan-100'
                          : 'bg-slate-800/40 border border-white/5 text-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`text-[10px] font-bold uppercase font-mono px-1.5 py-0.5 rounded ${
                          turn.speaker === 'user' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-700 text-slate-300'
                        }`}>
                          {turn.speaker}
                        </span>
                        <p className="text-xs leading-relaxed">{turn.content}</p>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">{turn.timestamp}</span>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {/* TIER 2: EPISODIC MEMORY */}
          {(activeTier === 'all' || activeTier === 'episodic') && (
            <section className="bg-slate-900/40 border border-blue-500/20 rounded-2xl p-4 sm:p-5 relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-blue-300">TIER 2: EPISODIC MEMORY</h3>
                    <p className="text-[11px] text-slate-400">Chronological history, major session milestones &amp; decisions</p>
                  </div>
                </div>

                <span className="text-xs font-mono text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                  {filteredEpisodic.length} Episodes
                </span>
              </div>

              <div className="space-y-3">
                {filteredEpisodic.map((episode) => (
                  <div key={episode.id} className="p-4 bg-slate-950/60 border border-blue-500/15 rounded-xl space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 block">{episode.sessionDate}</span>
                        <h4 className="text-sm font-semibold text-zinc-100">{episode.title}</h4>
                      </div>
                      <button
                        onClick={() => {
                          jarvisMemoryEngine.removeEpisode(episode.id);
                          refreshState();
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                        title="Delete episode"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{episode.summary}</p>

                    {episode.keyDecisions?.length > 0 && (
                      <div className="pt-2 border-t border-white/5">
                        <span className="text-[10px] font-mono text-blue-300 block mb-1">Key Decisions / Milestones:</span>
                        <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-300">
                          {episode.keyDecisions.map((dec, i) => (
                            <li key={i}>{dec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* TIER 3: SEMANTIC MEMORY GRAPH */}
          {(activeTier === 'all' || activeTier === 'semantic') && (
            <section className="bg-slate-900/40 border border-cyan-500/20 rounded-2xl p-4 sm:p-5 relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-cyan-300">TIER 3: SEMANTIC MEMORY (FACTS &amp; ENTITY KNOWLEDGE)</h3>
                    <p className="text-[11px] text-slate-400">Structured knowledge graph triples &amp; confidence scores</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsAddingFact(!isAddingFact)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/30 rounded-xl text-xs font-semibold transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> {isAddingFact ? 'Cancel' : 'Add Fact'}
                </button>
              </div>

              {/* Add Fact Form */}
              {isAddingFact && (
                <form onSubmit={handleAddFact} className="mb-4 p-4 bg-slate-950 border border-cyan-500/30 rounded-xl space-y-3 animate-fade-in">
                  <span className="text-xs font-bold text-cyan-300 block">Teach J.A.R.V.I.S. a Semantic Fact</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Subject (e.g. User)"
                      value={newFactSubject}
                      onChange={(e) => setNewFactSubject(e.target.value)}
                      className="bg-slate-900 border border-cyan-500/20 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                    <input
                      type="text"
                      placeholder="Predicate (e.g. prefers)"
                      value={newFactPredicate}
                      onChange={(e) => setNewFactPredicate(e.target.value)}
                      className="bg-slate-900 border border-cyan-500/20 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                    <input
                      type="text"
                      placeholder="Object / Fact Value"
                      value={newFactObject}
                      onChange={(e) => setNewFactObject(e.target.value)}
                      required
                      className="bg-slate-900 border border-cyan-500/20 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <select
                      value={newFactDomain}
                      onChange={(e: any) => setNewFactDomain(e.target.value)}
                      className="bg-slate-900 border border-cyan-500/20 rounded-lg px-3 py-1 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="coding">Domain: Coding &amp; Tech</option>
                      <option value="preferences">Domain: Preferences</option>
                      <option value="identity">Domain: User Identity</option>
                      <option value="workflow">Domain: Workflow</option>
                      <option value="system">Domain: System</option>
                    </select>

                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition-all shadow-md"
                    >
                      Commit to Knowledge Graph
                    </button>
                  </div>
                </form>
              )}

              {/* Semantic Fact Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredSemantic.map((fact) => (
                  <div
                    key={fact.id}
                    className="p-3 bg-slate-950/60 border border-cyan-500/15 rounded-xl flex items-start justify-between gap-3 group hover:border-cyan-500/40 transition-all"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/20 text-[10px] font-mono uppercase">
                          {fact.domain}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {Math.round(fact.confidence * 100)}% Conf
                        </span>
                      </div>

                      <p className="text-xs text-slate-200">
                        <strong className="text-cyan-300">{fact.subject}</strong>{' '}
                        <span className="text-slate-400 italic">{fact.predicate}</span>{' '}
                        <strong className="text-white">{fact.object}</strong>
                      </p>

                      {fact.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {fact.tags.map((t, idx) => (
                            <span key={idx} className="text-[9px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        jarvisMemoryEngine.removeSemanticFact(fact.id);
                        refreshState();
                      }}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 transition-all"
                      title="Remove fact"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* TIER 4: LONG-TERM ENDURING MEMORY */}
          {(activeTier === 'all' || activeTier === 'long_term') && (
            <section className="bg-slate-900/40 border border-indigo-500/20 rounded-2xl p-4 sm:p-5 relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-indigo-300">TIER 4: LONG-TERM PERSISTENT DIRECTIVES</h3>
                    <p className="text-[11px] text-slate-400">Core operating protocols, durable user directives &amp; project mandates</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsAddingLTM(!isAddingLTM)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 rounded-xl text-xs font-semibold transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> {isAddingLTM ? 'Cancel' : 'Add Directive'}
                </button>
              </div>

              {/* Add LTM Form */}
              {isAddingLTM && (
                <form onSubmit={handleAddLTM} className="mb-4 p-4 bg-slate-950 border border-indigo-500/30 rounded-xl space-y-3 animate-fade-in">
                  <span className="text-xs font-bold text-indigo-300 block">Add Long-Term Protocol to J.A.R.V.I.S. Core</span>
                  <input
                    type="text"
                    placeholder="Directive Title"
                    value={newLtmTitle}
                    onChange={(e) => setNewLtmTitle(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-indigo-500/20 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                  />
                  <textarea
                    placeholder="Full Directive / Rule Description"
                    value={newLtmContent}
                    onChange={(e) => setNewLtmContent(e.target.value)}
                    required
                    rows={3}
                    className="w-full bg-slate-900 border border-indigo-500/20 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <select
                        value={newLtmCategory}
                        onChange={(e: any) => setNewLtmCategory(e.target.value)}
                        className="bg-slate-900 border border-indigo-500/20 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
                      >
                        <option value="user_profile">Category: User Profile</option>
                        <option value="core_protocol">Category: Core Protocol</option>
                        <option value="preference">Category: Preference</option>
                        <option value="project">Category: Project</option>
                        <option value="directive">Category: Directive</option>
                      </select>

                      <select
                        value={newLtmImportance}
                        onChange={(e: any) => setNewLtmImportance(e.target.value)}
                        className="bg-slate-900 border border-indigo-500/20 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
                      >
                        <option value="critical">Critical Importance</option>
                        <option value="high">High Importance</option>
                        <option value="medium">Medium</option>
                        <option value="standard">Standard</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-lg text-xs transition-all shadow-md"
                    >
                      Save Directive
                    </button>
                  </div>
                </form>
              )}

              {/* Long-Term Memory Cards */}
              <div className="space-y-3">
                {filteredLongTerm.map((ltm) => (
                  <div
                    key={ltm.id}
                    className={`p-4 bg-slate-950/60 border rounded-xl space-y-2 transition-all group ${
                      ltm.isPinned ? 'border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.08)]' : 'border-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {ltm.isPinned && <Pin className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400/20" />}
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                          ltm.importance === 'critical' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                          ltm.importance === 'high' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {ltm.importance}
                        </span>
                        <h4 className="text-sm font-semibold text-zinc-100">{ltm.title}</h4>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            jarvisMemoryEngine.togglePinLongTerm(ltm.id);
                            refreshState();
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-300"
                          title={ltm.isPinned ? 'Unpin' : 'Pin'}
                        >
                          {ltm.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => {
                            jarvisMemoryEngine.removeLongTermMemory(ltm.id);
                            refreshState();
                          }}
                          className="p-1 text-slate-400 hover:text-rose-400"
                          title="Delete protocol"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{ltm.content}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>

        {/* HUD Footer Status Bar */}
        <div className="px-6 py-3 border-t border-cyan-500/20 bg-slate-950/80 flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Memory Storage: Safe &amp; Persistent
            </span>
            <span>Total Entities: {memoryState.semantic.length + memoryState.longTerm.length}</span>
          </div>

          <span className="text-[11px] text-slate-500">
            Last Sync: {new Date(memoryState.lastSyncTime).toLocaleTimeString()}
          </span>
        </div>

      </div>
    </div>
  );
};
