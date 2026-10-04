import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Terminal,
  X,
  Play,
  Square,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Cpu,
  Globe,
  Radio,
  Trash2,
  Shield,
  Zap,
  CheckSquare
} from 'lucide-react';
import { AgentCardItem } from '../types';
import { fetchRegisteredAgents } from '../lib/utils';


interface AgentSquadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  streamLogs: string[];
  supervisorStatus: {
    status: 'idle' | 'running' | 'step' | 'verification' | 'completed' | 'failed';
    goal?: string;
    primaryAgentId?: string;
    step?: string;
    verificationStatus?: string;
    attempt?: number;
    details?: string;
  };
  onClearLogs: () => void;
}

export const AgentSquadDrawer: React.FC<AgentSquadDrawerProps> = ({
  isOpen,
  onClose,
  streamLogs,
  supervisorStatus,
  onClearLogs
}) => {
  const [activeTab, setActiveTab] = useState<'cli' | 'ide' | 'web' | 'a2a'>('cli');
  const [agents, setAgents] = useState<AgentCardItem[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('agy');
  const [selectedParallelAgents, setSelectedParallelAgents] = useState<string[]>(['agy', 'omh', 'codex', 'hermes', 'openclaw']);
  const [isParallelMode, setIsParallelMode] = useState<boolean>(true);
  const [executionMode, setExecutionMode] = useState<'tmux' | 'direct'>('tmux');
  const [goalInput, setGoalInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Fetch registered A2A Agent Cards
  const fetchAgents = async () => {
    const list = await fetchRegisteredAgents();
    setAgents(list as AgentCardItem[]);
  };


  useEffect(() => {
    if (isOpen) {
      fetchAgents();
    }
  }, [isOpen]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [streamLogs]);

  const getAgentId = (agent: AgentCardItem): string => {
    return agent.url.split('/').pop() || agent.name.toLowerCase().split(' ')[0];
  };

  const toggleParallelAgent = (agentId: string) => {
    setSelectedParallelAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleLaunch = async () => {
    if (!goalInput.trim()) return;
    setIsLoading(true);

    try {
      if (isParallelMode && selectedParallelAgents.length > 0) {
        // True Parallel Multi-Agent Dispatch
        await fetch('/api/agents/parallel/dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tasks: selectedParallelAgents.map(agentId => ({
              agentId,
              prompt: goalInput,
              mode: executionMode,
              openShellEnabled: true
            })),
            mode: executionMode
          })
        });
      } else {
        // Single Agent Supervisor Loop
        await fetch('/api/a2a/supervisor/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goal: goalInput,
            primaryAgentId: selectedAgent
          })
        });
      }
      setGoalInput('');
    } catch (e) {
      console.error('Failed to trigger agent execution:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAbort = async () => {
    try {
      await Promise.allSettled([
        fetch('/api/agents/parallel/cancel-all', { method: 'POST' }),
        fetch('/api/a2a/supervisor/abort', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        })
      ]);
    } catch (e) {
      console.error('Failed to abort:', e);
    }
  };

  if (!isOpen) return null;

  const filteredAgents = agents.filter(a => a.domain === activeTab);

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-slate-950/95 backdrop-blur-xl border-l border-cyan-500/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col font-mono text-slate-200 transition-all duration-300">
      {/* Drawer Header */}
      <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between bg-slate-900/50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Bot className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">AGENT SQUAD & PARALLEL HUB</h2>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 animate-pulse" /> A2A v2.0
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-full flex items-center gap-1">
                <Shield className="w-2.5 h-2.5 text-cyan-400" /> OpenShell Secured
              </span>
            </div>
            <p className="text-xs text-slate-400">Multi-Agent Parallel Orchestrator & OpenShell Governance</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Mode Controls Bar */}
      <div className="px-4 py-2 bg-slate-900/40 border-b border-cyan-500/15 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsParallelMode(true)}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium transition-all ${
              isParallelMode
                ? 'bg-cyan-500 text-black font-semibold shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Zap className="w-3 h-3 fill-current" /> Parallel Squad Mode ({selectedParallelAgents.length})
          </button>
          <button
            onClick={() => setIsParallelMode(false)}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium transition-all ${
              !isParallelMode
                ? 'bg-cyan-500 text-black font-semibold shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Bot className="w-3 h-3" /> Single Supervisor
          </button>
        </div>

        {isParallelMode && (
          <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
            <span className="text-slate-500">Mode:</span>
            <button
              onClick={() => setExecutionMode('tmux')}
              className={`px-1.5 py-0.5 rounded ${executionMode === 'tmux' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400'}`}
              title="Runs inside detached, persistent tmux panes"
            >
              Tmux Panes
            </button>
            <span className="text-slate-700">|</span>
            <button
              onClick={() => setExecutionMode('direct')}
              className={`px-1.5 py-0.5 rounded ${executionMode === 'direct' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400'}`}
              title="Runs via direct process spawn"
            >
              Direct
            </button>
          </div>
        )}
      </div>

      {/* Domain Navigation Tabs */}
      <div className="flex border-b border-cyan-500/20 bg-slate-900/30 px-3 text-xs">
        <button
          onClick={() => setActiveTab('cli')}
          className={`px-3 py-2.5 font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'cli'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" /> CLI Agents
        </button>
        <button
          onClick={() => setActiveTab('ide')}
          className={`px-3 py-2.5 font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'ide'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" /> IDE Agents
        </button>
        <button
          onClick={() => setActiveTab('web')}
          className={`px-3 py-2.5 font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'web'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe className="w-3.5 h-3.5" /> Web Agents
        </button>
        <button
          onClick={() => setActiveTab('a2a')}
          className={`px-3 py-2.5 font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'a2a'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> Protocol Directory
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Agent Cards Carousel / Grid */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              {isParallelMode ? 'Select Squad Members to Run Simultaneously' : `Available ${activeTab.toUpperCase()} Squad Members`}
            </span>
            <button
              onClick={fetchAgents}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredAgents.length === 0 ? (
              <div className="col-span-2 p-4 text-center text-xs text-slate-500 bg-slate-900/40 rounded-lg border border-slate-800">
                No active {activeTab.toUpperCase()} agents discovered yet.
              </div>
            ) : (
              filteredAgents.map((agent) => {
                const agentId = getAgentId(agent);
                const isSelectedInSingle = selectedAgent === agentId;
                const isCheckedInParallel = selectedParallelAgents.includes(agentId);

                return (
                  <div
                    key={agent.name}
                    onClick={() => {
                      if (isParallelMode) {
                        toggleParallelAgent(agentId);
                      } else {
                        setSelectedAgent(agentId);
                      }
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      (isParallelMode && isCheckedInParallel) || (!isParallelMode && isSelectedInSingle)
                        ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                        : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {isParallelMode ? (
                          <input
                            type="checkbox"
                            checked={isCheckedInParallel}
                            onChange={() => toggleParallelAgent(agentId)}
                            className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-slate-900"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : null}
                        <span className="font-semibold text-xs text-white">{agent.name}</span>
                      </div>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          agent.status === 'active' ? 'bg-emerald-400 shadow-[0_0_6px_#10B981]' : 'bg-slate-600'
                        }`}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {agent.description}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                      <span className="text-emerald-400/90 flex items-center gap-1 font-mono">
                        <Shield className="w-2.5 h-2.5" /> OpenShell
                      </span>
                      <span className="text-cyan-400/80 uppercase">{agent.domain}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Supervisor Status Panel */}
        <div className="p-3 rounded-lg border border-cyan-500/20 bg-slate-900/50 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
              {isParallelMode ? 'Parallel Multi-Agent Hub:' : 'Autonomous Supervisor Status:'}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                supervisorStatus.status === 'running' || supervisorStatus.status === 'step'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                  : supervisorStatus.status === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : supervisorStatus.status === 'failed'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {supervisorStatus.status}
            </span>
          </div>

          {supervisorStatus.step && (
            <div className="text-[11px] text-cyan-300 bg-cyan-950/40 p-2 rounded border border-cyan-800/30 flex items-start gap-1.5">
              <RefreshCw className="w-3 h-3 animate-spin shrink-0 mt-0.5 text-cyan-400" />
              <span>{supervisorStatus.step}</span>
            </div>
          )}

          {supervisorStatus.verificationStatus && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
              {supervisorStatus.verificationStatus === 'passed' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>Verification Gate: {supervisorStatus.verificationStatus}</span>
            </div>
          )}
        </div>

        {/* Live Terminal & Streaming Output */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-slate-300" />
              Live Telemetry & Simultaneous Streams
            </span>
            <button
              onClick={onClearLogs}
              className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          </div>

          <div className="h-56 bg-black/80 rounded-lg border border-slate-800 p-3 overflow-y-auto text-[11px] font-mono leading-relaxed space-y-1 select-text">
            {streamLogs.length === 0 ? (
              <span className="text-slate-600 italic">Awaiting task stream or multi-agent dispatch...</span>
            ) : (
              streamLogs.map((log, idx) => (
                <div key={idx} className="text-slate-300 whitespace-pre-wrap break-all">
                  {log}
                </div>
              ))
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>
      </div>

      {/* Action Footer & Prompt Injection */}
      <div className="p-3 border-t border-cyan-500/20 bg-slate-900/60 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLaunch()}
            placeholder={
              isParallelMode
                ? `Broadcast directive to ${selectedParallelAgents.length} agents simultaneously (e.g. "Audit security & refactor")...`
                : `Instruct ${selectedAgent} (e.g. "Refactor auth middleware to strict TypeScript")...`
            }
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={handleLaunch}
            disabled={isLoading || !goalInput.trim() || (isParallelMode && selectedParallelAgents.length === 0)}
            className="px-3 py-2 rounded-lg bg-cyan-500 text-black font-semibold text-xs hover:bg-cyan-400 transition-colors disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isParallelMode ? `Deploy (${selectedParallelAgents.length})` : 'Launch'}
          </button>
          <button
            onClick={handleAbort}
            className="px-3 py-2 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold text-xs hover:bg-rose-500/30 transition-colors flex items-center gap-1.5"
            title="Emergency Abort All Running Agents"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            Stop
          </button>
        </div>
      </div>
    </div>
  );
};
