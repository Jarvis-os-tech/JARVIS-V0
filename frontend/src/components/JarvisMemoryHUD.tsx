import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  JarvisMemoryState,
  TriadMemoryItem,
  TriadMemoryCategory
} from '../types';
import { jarvisMemoryEngine } from '../services/memoryEngine';
import {
  Brain,
  Trash2,
  Copy,
  Check,
  X,
  User,
  SlidersHorizontal,
  Terminal,
  Edit2,
  Search,
  Sparkles
} from 'lucide-react';
import { sfx } from '../lib/sfx';

interface JarvisMemoryHUDProps {
  isOpen: boolean;
  onClose: () => void;
  onSendPromptToJarvis?: (prompt: string) => void;
}

interface TabDef {
  id: TriadMemoryCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabDef[] = [
  {
    id: 'personal_data',
    label: 'Personal Data',
    icon: User
  },
  {
    id: 'preferences',
    label: 'Preferences',
    icon: SlidersHorizontal
  },
  {
    id: 'instructions',
    label: 'Instructions',
    icon: Terminal
  }
];

function toPlainText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/\*\*([^\*]+)\*\*/g, '$1')
    .replace(/^-\s+/gm, '')
    .trim();
}

export const JarvisMemoryHUD: React.FC<JarvisMemoryHUDProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<TriadMemoryCategory>('personal_data');
  const [memoryState, setMemoryState] = useState<JarvisMemoryState>(jarvisMemoryEngine.getState());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const refreshState = useCallback(() => {
    setMemoryState(jarvisMemoryEngine.getState());
  }, []);

  useEffect(() => {
    const unsubscribe = jarvisMemoryEngine.subscribe(refreshState);
    return () => unsubscribe();
  }, [refreshState]);

  useEffect(() => {
    if (isOpen) {
      jarvisMemoryEngine.fetchTriadMemory().then(() => {
        refreshState();
      });
      refreshState();
    }
  }, [isOpen, refreshState]);

  const activeConfig = useMemo(() => {
    return TABS.find((t) => t.id === activeTab) || TABS[0];
  }, [activeTab]);

  const currentItems = useMemo((): TriadMemoryItem[] => {
    let items: TriadMemoryItem[] = [];
    if (activeTab === 'personal_data') items = jarvisMemoryEngine.getPersonalData();
    if (activeTab === 'preferences') items = jarvisMemoryEngine.getPreferences();
    if (activeTab === 'instructions') items = jarvisMemoryEngine.getInstructions();

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return items.filter(it => it.content && it.content.toLowerCase().includes(q));
    }
    return items;
  }, [activeTab, memoryState, searchQuery]);

  const tabCounts = useMemo(() => {
    return {
      personal_data: jarvisMemoryEngine.getPersonalData().length,
      preferences: jarvisMemoryEngine.getPreferences().length,
      instructions: jarvisMemoryEngine.getInstructions().length
    };
  }, [memoryState]);

  if (!isOpen) return null;

  const handleDeleteEntry = (item: TriadMemoryItem) => {
    sfx.playWarning();
    jarvisMemoryEngine.removeTriadItem(activeTab, item.content || item.id);
    refreshState();
  };

  const handleStartEdit = (item: TriadMemoryItem) => {
    sfx.playPip(1200);
    setEditingId(item.id);
    setEditContent(toPlainText(item.content));
  };

  const handleSaveEdit = (item: TriadMemoryItem) => {
    if (editContent.trim()) {
      sfx.playPip(1600);
      jarvisMemoryEngine.rewriteTriadItem(activeTab, item.content, editContent.trim());
      setEditingId(null);
      setEditContent('');
      refreshState();
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleCopy = (content: string, id: string) => {
    sfx.playPip(1800);
    navigator.clipboard.writeText(toPlainText(content));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleTabChange = (tId: TriadMemoryCategory) => {
    sfx.playPip(1000);
    setActiveTab(tId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-fade-in select-none">
      <div className="relative w-full max-w-5xl h-[86vh] bg-[#030814] border border-cyan-500/35 rounded-3xl shadow-[0_0_80px_rgba(0,240,255,0.22)] flex flex-col overflow-hidden text-zinc-100 font-sans holo-scanline">
        
        {/* Holographic Corner Targeting Reticles */}
        <div className="corner-bracket-tl" />
        <div className="corner-bracket-tr" />
        <div className="corner-bracket-bl" />
        <div className="corner-bracket-br" />

        {/* Header: J.A.R.V.I.S. Branding, 3 Tabs, Close */}
        <div className="relative px-6 py-3.5 border-b border-cyan-500/20 bg-[#040c1a]/90 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/35 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.3)] shrink-0">
              <Brain className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-mono tracking-wider text-cyan-300">
                  SOVEREIGN MEMORY VAULT
                </h2>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  BLUEPRINT v4
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400 font-mono">
                Persistent cognitive intelligence & semantic triples
              </p>
            </div>
          </div>

          {/* 3 Main Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const count = tabCounts[tab.id];

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-2 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                      : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] ${
                      isActive ? 'bg-slate-950/30 text-slate-950 font-bold' : 'bg-black/40 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Close Button */}
          <button
            onClick={() => {
              sfx.playModalOpen();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Close Memory Vault"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Telemetry Bar */}
        <div className="px-6 py-2.5 bg-slate-950/50 border-b border-white/5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-900/80 px-3 py-1.5 rounded-xl border border-white/10 focus-within:border-cyan-400/50 transition-colors">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeConfig.label} records...`}
              className="w-full bg-transparent text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-slate-300 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
            <span>FILTERED: <strong className="text-cyan-300">{currentItems.length}</strong></span>
            <span className="text-slate-600">//</span>
            <span className="text-emerald-400">SQLITE + VECTOR SYNCED</span>
          </div>
        </div>

        {/* Main Content Area: Plain Text Cards */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 select-text hex-grid">
          {currentItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center font-mono space-y-2">
              <Sparkles className="w-8 h-8 text-cyan-400/40 animate-pulse" />
              <p className="text-xs uppercase tracking-widest text-slate-400">
                [ No records found in {activeConfig.label} ]
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-w-5xl mx-auto">
              {currentItems.map((item, idx) => {
                const plainContent = toPlainText(item.content);
                const isCopied = copiedId === item.id;
                const isEditing = editingId === item.id;

                return (
                  <div
                    key={item.id || idx}
                    className="relative group bg-slate-950/80 border border-cyan-500/20 hover:border-cyan-400/50 rounded-2xl p-4 space-y-2 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_0_20px_rgba(0,240,255,0.15)] text-left flex flex-col justify-between"
                  >
                    <div className="corner-bracket-tl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="corner-bracket-br opacity-0 group-hover:opacity-100 transition-opacity" />

                    {isEditing ? (
                      <div className="space-y-3">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full bg-slate-900/90 border border-cyan-500/50 rounded-xl p-3 text-xs font-mono text-cyan-200 focus:outline-none focus:ring-1 focus:ring-cyan-400 resize-none h-24"
                          autoFocus
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 rounded-lg text-xs font-mono text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEdit(item)}
                            className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors cursor-pointer shadow-sm shadow-cyan-500/30"
                          >
                            Rewrite
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs leading-relaxed text-slate-100 font-mono selection:bg-cyan-500/30 whitespace-pre-wrap">
                          {plainContent}
                        </p>

                        {/* Actions: Edit / Copy / Delete */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Edit memory"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleCopy(item.content, item.id)}
                            className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Copy text"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(item)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Delete memory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-slate-500">
                      <span>ID: {item.id?.substring(0, 8) || 'EPISODIC'}</span>
                      <span className="text-cyan-400/60 uppercase">{item.category}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JarvisMemoryHUD;
