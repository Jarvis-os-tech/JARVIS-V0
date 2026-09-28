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
  Edit2
} from 'lucide-react';

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
    if (activeTab === 'personal_data') return jarvisMemoryEngine.getPersonalData();
    if (activeTab === 'preferences') return jarvisMemoryEngine.getPreferences();
    if (activeTab === 'instructions') return jarvisMemoryEngine.getInstructions();
    return [];
  }, [activeTab, memoryState]);

  const tabCounts = useMemo(() => {
    return {
      personal_data: jarvisMemoryEngine.getPersonalData().length,
      preferences: jarvisMemoryEngine.getPreferences().length,
      instructions: jarvisMemoryEngine.getInstructions().length
    };
  }, [memoryState]);

  if (!isOpen) return null;

  const handleDeleteEntry = (item: TriadMemoryItem) => {
    jarvisMemoryEngine.removeTriadItem(activeTab, item.content || item.id);
    refreshState();
  };

  const handleStartEdit = (item: TriadMemoryItem) => {
    setEditingId(item.id);
    setEditContent(toPlainText(item.content));
  };

  const handleSaveEdit = (item: TriadMemoryItem) => {
    if (editContent.trim()) {
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
    navigator.clipboard.writeText(toPlainText(content));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-fade-in select-none">
      <div className="relative w-full max-w-5xl h-[86vh] bg-[#030814] border border-cyan-500/30 rounded-3xl shadow-[0_0_80px_rgba(6,182,212,0.18)] flex flex-col overflow-hidden text-zinc-100 font-sans">
        
        {/* Header: J.A.R.V.I.S. Branding, 3 Tabs, Close */}
        <div className="relative px-6 py-4 border-b border-cyan-500/20 bg-[#040c1a] flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)] shrink-0">
              <Brain className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-mono tracking-wider text-cyan-300">
                J.A.R.V.I.S. MEMORY CORE
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Plain text cognitive memory bank
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
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-2 cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                      : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] ${
                      isActive ? 'bg-slate-950/30 text-slate-950' : 'bg-black/40 text-slate-400'
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
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Close Memory Core"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content Area: Plain Text Cards */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 select-text">
          {currentItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center font-mono space-y-2">
              <p className="text-xs uppercase tracking-widest text-slate-400">
                [ No records in {activeConfig.label} ]
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
                    className="relative group bg-slate-950/80 border border-cyan-500/20 hover:border-cyan-400/50 rounded-2xl p-4.5 space-y-2 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_0_20px_rgba(6,182,212,0.12)] text-left flex flex-col justify-between"
                  >
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
                            className="p-1.5 text-slate-400 hover:text-amber-300 rounded-lg hover:bg-amber-500/10 transition-colors cursor-pointer"
                            title="Rewrite / Edit entry"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleCopy(item.content, item.id)}
                            className="p-1.5 text-slate-400 hover:text-cyan-300 rounded-lg hover:bg-cyan-500/10 transition-colors cursor-pointer"
                            title="Copy plain text"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Clean Minimal Footer */}
        <div className="px-6 py-2.5 border-t border-cyan-500/20 bg-slate-950/90 flex items-center justify-between text-xs text-slate-400 font-mono shrink-0">
          <span>Category: <strong className="text-cyan-300">{activeConfig.label}</strong></span>
          <span>{currentItems.length} {currentItems.length === 1 ? 'Entry' : 'Entries'}</span>
        </div>

      </div>
    </div>
  );
};
