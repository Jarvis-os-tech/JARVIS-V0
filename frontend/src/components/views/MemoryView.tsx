import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  JarvisMemoryState,
  TriadMemoryItem,
  TriadMemoryCategory
} from '../../types';
import { jarvisMemoryEngine } from '../../services/memoryEngine';
import {
  Brain,
  Trash2,
  Copy,
  Check,
  User,
  SlidersHorizontal,
  Terminal,
  Edit2,
  Search,
  Sparkles,
  Plus,
  RefreshCw,
  Database
} from 'lucide-react';
import { sfx } from '../../lib/sfx';
import { toPlainText } from '../../lib/utils';

interface MemoryViewProps {
  onSendPromptToJarvis?: (prompt: string) => void;
  themeColor?: string;
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
    label: 'Directives',
    icon: Terminal
  }
];

export const MemoryView: React.FC<MemoryViewProps> = ({
  onSendPromptToJarvis,
  themeColor = '#00f0ff',
}) => {
  const [activeTab, setActiveTab] = useState<TriadMemoryCategory>('personal_data');
  const [memoryState, setMemoryState] = useState<JarvisMemoryState>(jarvisMemoryEngine.getState());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshState = useCallback(() => {
    setMemoryState(jarvisMemoryEngine.getState());
  }, []);

  useEffect(() => {
    const unsubscribe = jarvisMemoryEngine.subscribe(refreshState);
    return () => unsubscribe();
  }, [refreshState]);

  useEffect(() => {
    jarvisMemoryEngine.fetchTriadMemory().then(() => {
      refreshState();
    });
  }, [refreshState]);

  const currentTriadItems = useMemo((): TriadMemoryItem[] => {
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

  const stats = useMemo(() => {
    const personal = jarvisMemoryEngine.getPersonalData().length;
    const prefs = jarvisMemoryEngine.getPreferences().length;
    const inst = jarvisMemoryEngine.getInstructions().length;
    return {
      personal,
      prefs,
      inst,
      total: personal + prefs + inst,
    };
  }, [memoryState]);

  const handleSync = async () => {
    sfx.playPip(1200);
    setIsSyncing(true);
    await jarvisMemoryEngine.syncWithServer();
    refreshState();
    setIsSyncing(false);
  };

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

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryContent.trim()) return;
    sfx.playPip(1600);
    jarvisMemoryEngine.addTriadItem(activeTab, newMemoryContent.trim());
    setNewMemoryContent('');
    setIsAddingNew(false);
    refreshState();
  };

  const handleCopy = (content: string, id: string) => {
    sfx.playPip(1800);
    navigator.clipboard.writeText(toPlainText(content));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="w-full flex-1 max-w-7xl mx-auto px-4 sm:px-8 py-6 flex flex-col gap-6 animate-fade-in text-slate-100">
      
      {/* Top Holographic Header Bar */}
      <div className="relative p-6 rounded-3xl bg-[#040c1a]/85 border border-cyan-500/30 backdrop-blur-xl shadow-[0_0_50px_rgba(0,240,255,0.12)] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="corner-bracket-tl" />
        <div className="corner-bracket-tr" />
        <div className="corner-bracket-bl" />
        <div className="corner-bracket-br" />

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.35)] shrink-0">
            <Brain className="w-6 h-6 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-['Orbitron',sans-serif] text-xl font-bold tracking-wider text-white">
                SOVEREIGN MEMORY MATRIX
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase tracking-widest font-semibold">
                SQLite + Vector Vault
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-1">
              Deterministic 4-tier memory architecture with bi-directional SQLite synchronization
            </p>
          </div>
        </div>

        {/* Sync & Stats */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-950/80 border border-cyan-500/20 flex flex-col items-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Total Engrams</span>
            <span className="text-lg font-bold font-mono text-cyan-300">{stats.total}</span>
          </div>

          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-3.5 py-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-mono text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            title="Synchronize with Backend Database"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync Vault</span>
          </button>
        </div>
      </div>

      {/* Search Bar & Add Button */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memory entries, personal details, directives, or triples..."
            className="w-full bg-[#060e1d]/90 border border-cyan-500/30 rounded-2xl py-3 pl-11 pr-4 text-xs font-mono text-cyan-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all shadow-[0_0_20px_rgba(0,0,0,0.4)]"
          />
        </div>

        <button
          onClick={() => {
            sfx.playPip(1300);
            setIsAddingNew(!isAddingNew);
          }}
          className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Memory</span>
        </button>
      </div>

      {/* New Memory Input Card if Open */}
      {isAddingNew && (
        <form onSubmit={handleAddMemory} className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-400/50 backdrop-blur-md shadow-[0_0_30px_rgba(0,240,255,0.15)] flex flex-col gap-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Add Entry to {activeTab.replace('_', ' ')}
            </span>
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="text-xs font-mono text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
          <textarea
            rows={2}
            value={newMemoryContent}
            onChange={(e) => setNewMemoryContent(e.target.value)}
            placeholder="e.g. 'Prefers dark mode holographic UI and concise responses'..."
            className="w-full bg-slate-950/90 border border-cyan-500/30 rounded-xl p-3 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <div className="flex justify-end gap-2">
            <button
              type="submit"
              disabled={!newMemoryContent.trim()}
              className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-xs font-mono transition-all cursor-pointer"
            >
              Memorize Engram
            </button>
          </div>
        </form>
      )}

      {/* 4-Tier Memory Category Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-cyan-500/20 pb-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          let count = 0;
          if (tab.id === 'personal_data') count = stats.personal;
          if (tab.id === 'preferences') count = stats.prefs;
          if (tab.id === 'instructions') count = stats.inst;

          return (
            <button
              key={tab.id}
              onClick={() => {
                sfx.playPip(1100);
                setActiveTab(tab.id);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-mono transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 font-bold shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full border ${
                isActive ? 'bg-cyan-500/30 text-cyan-100 border-cyan-400/50' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Triad Memory Items Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {currentTriadItems.map((item) => {
          const isEditing = editingId === item.id;
          const isCopied = copiedId === item.id;

          return (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-[#061022]/80 border border-cyan-500/25 hover:border-cyan-500/40 backdrop-blur-md transition-all flex flex-col justify-between gap-3 shadow-[0_0_20px_rgba(0,0,0,0.3)]"
            >
              {isEditing ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    rows={3}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full bg-slate-950 border border-cyan-400 rounded-xl p-2.5 text-xs font-mono text-cyan-100 focus:outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1 rounded-lg text-xs font-mono text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit(item)}
                      className="px-3 py-1 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs font-mono hover:bg-cyan-400"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs font-mono text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {toPlainText(item.content)}
                </p>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-cyan-500/15 text-[10px] font-mono text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/80" />
                  <span>Engram: {item.learnedDate || 'Verified'}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCopy(item.content, item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors cursor-pointer"
                    title="Copy to clipboard"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleStartEdit(item)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors cursor-pointer"
                    title="Edit engram"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteEntry(item)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Purge engram"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {currentTriadItems.length === 0 && (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <Database className="w-12 h-12 text-slate-600 mb-3" />
          <h3 className="font-['Orbitron',sans-serif] text-sm font-bold text-white tracking-wider">
            NO MEMORY ENGRAMS FOUND
          </h3>
          <p className="text-xs font-mono text-slate-400 max-w-sm mt-1">
            {searchQuery ? 'No engrams match your search criteria.' : 'This tier is currently empty. Click "+ New Memory" or talk to J.A.R.V.I.S. to automatically synthesize knowledge.'}
          </p>
        </div>
      )}

    </div>
  );
};
