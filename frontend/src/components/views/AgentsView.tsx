import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Terminal, 
  Play, 
  Square, 
  Trash2, 
  Shield, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  Send, 
  RefreshCw,
  Sparkles,
  Layers,
  Radio,
  ExternalLink
} from 'lucide-react';
import { sfx } from '../../lib/sfx';

interface AgentCardItem {
  name: string;
  description: string;
  url: string;
  version: string;
  domain: 'cli' | 'ide' | 'web' | 'core';
  status?: string;
  capabilities?: {
    openShell?: {
      enabled: boolean;
      mode?: string;
      policy?: string;
    };
  };
  skills: Array<{ id: string; name: string; description: string }>;
}

const DEFAULT_COWORKERS = [
  {
    id: 'hermes',
    name: 'Hermes',
    role: 'Lead Systems Engineer',
    domain: 'cli',
    specialty: 'Autonomous code synthesis, system diagnostics, multi-file refactoring & terminal automation',
    color: 'from-cyan-500/20 to-blue-500/10 border-cyan-400/40 text-cyan-300',
    avatarBg: 'bg-cyan-500/20 text-cyan-300',
    status: 'Ready',
  },
  {
    id: 'athena',
    name: 'Athena',
    role: 'Chief Architect & Strategist',
    domain: 'core',
    specialty: 'High-level architectural planning, workflow orchestration & multi-agent goal verification',
    color: 'from-purple-500/20 to-indigo-500/10 border-purple-400/40 text-purple-300',
    avatarBg: 'bg-purple-500/20 text-purple-300',
    status: 'Ready',
  },
  {
    id: 'hephaestus',
    name: 'Hephaestus',
    role: 'Hardware & OS Specialist',
    domain: 'cli',
    specialty: 'Linux kernel, system telemetry, GPU drivers, memory governor & hardware sensors',
    color: 'from-amber-500/20 to-orange-500/10 border-amber-400/40 text-amber-300',
    avatarBg: 'bg-amber-500/20 text-amber-300',
    status: 'Ready',
  },
  {
    id: 'argus',
    name: 'Argus',
    role: 'Security & Sandbox Sentinel',
    domain: 'ide',
    specialty: 'NVIDIA OpenShell security boundary, policy enforcement, secret hygiene & audit logs',
    color: 'from-emerald-500/20 to-teal-500/10 border-emerald-400/40 text-emerald-300',
    avatarBg: 'bg-emerald-500/20 text-emerald-300',
    status: 'Shield Active',
  },
  {
    id: 'apollo',
    name: 'Apollo',
    role: 'Creative & Multimodal Engine',
    domain: 'web',
    specialty: 'Holographic UI synthesis, visual art generation, voice timbre modulation & presentations',
    color: 'from-pink-500/20 to-rose-500/10 border-pink-400/40 text-pink-300',
    avatarBg: 'bg-pink-500/20 text-pink-300',
    status: 'Ready',
  },
];

interface AgentsViewProps {
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
  onSendGoalToAgent?: (agentId: string, goal: string) => void;
  themeColor?: string;
}

export const AgentsView: React.FC<AgentsViewProps> = ({
  streamLogs,
  supervisorStatus,
  onClearLogs,
  onSendGoalToAgent,
  themeColor = '#00f0ff',
}) => {
  const [agents, setAgents] = useState<AgentCardItem[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('hermes');
  const [goalInput, setGoalInput] = useState<string>('');
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/a2a/agents');
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [streamLogs]);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalInput.trim()) return;

    sfx.playPip(1500);
    setIsDispatching(true);

    try {
      if (onSendGoalToAgent) {
        onSendGoalToAgent(selectedAgentId, goalInput.trim());
      } else {
        await fetch('/api/a2a/tasks/delegate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: selectedAgentId,
            prompt: goalInput.trim(),
            context: { origin: 'jarvis_os_v4_agents_view' }
          })
        });
      }
      setGoalInput('');
    } catch (err) {
      console.error('Failed to dispatch goal to agent:', err);
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="w-full flex-1 max-w-7xl mx-auto px-4 sm:px-8 py-6 flex flex-col gap-6 animate-fade-in text-slate-100">
      
      {/* Top Header Bar */}
      <div className="relative p-6 rounded-3xl bg-[#040c1a]/85 border border-cyan-500/30 backdrop-blur-xl shadow-[0_0_50px_rgba(0,240,255,0.12)] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="corner-bracket-tl" />
        <div className="corner-bracket-tr" />
        <div className="corner-bracket-bl" />
        <div className="corner-bracket-br" />

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.35)] shrink-0">
            <Bot className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-['Orbitron',sans-serif] text-xl font-bold tracking-wider text-white">
                A2A SQUAD &amp; COWORKER MATRIX
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-widest font-semibold">
                Google/LF A2A v1.0
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-1">
              Linux Foundation standard agent-to-agent delegation, supervisor loop &amp; autonomous workers
            </p>
          </div>
        </div>

        {/* Supervisor Status Pill */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-950/80 border border-cyan-500/20 flex flex-col items-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Supervisor</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${
                supervisorStatus.status === 'running' || supervisorStatus.status === 'step' 
                  ? 'bg-amber-400 animate-ping' 
                  : supervisorStatus.status === 'completed'
                  ? 'bg-emerald-400'
                  : 'bg-cyan-400'
              }`} />
              <span className="text-xs font-bold font-mono uppercase text-white">
                {supervisorStatus.status}
              </span>
            </div>
          </div>

          <button
            onClick={() => { sfx.playPip(1000); fetchAgents(); }}
            className="p-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 transition-colors cursor-pointer"
            title="Refresh Squad Registry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Coworker Squad Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {DEFAULT_COWORKERS.map((coworker) => {
          const isSelected = selectedAgentId === coworker.id;
          return (
            <div
              key={coworker.id}
              onClick={() => {
                sfx.playPip(1200);
                setSelectedAgentId(coworker.id);
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer backdrop-blur-md flex flex-col justify-between gap-3 ${
                isSelected
                  ? 'bg-gradient-to-b from-[#09152e] to-[#040c1a] border-cyan-400 shadow-[0_0_25px_rgba(0,240,255,0.25)] ring-1 ring-cyan-400/50'
                  : 'bg-[#040916]/80 border-cyan-500/20 hover:border-cyan-500/40 hover:bg-[#061022]/80'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${coworker.avatarBg} border border-white/10`}>
                  {coworker.name.substring(0, 2).toUpperCase()}
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                  {coworker.status}
                </span>
              </div>

              <div>
                <h3 className="font-['Orbitron',sans-serif] text-sm font-bold text-white tracking-wide">
                  {coworker.name}
                </h3>
                <span className="text-[10px] font-mono text-cyan-300 uppercase tracking-wider block mt-0.5">
                  {coworker.role}
                </span>
                <p className="text-[11px] font-mono text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                  {coworker.specialty}
                </p>
              </div>

              <div className="pt-2 border-t border-cyan-500/15 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="uppercase text-slate-500">{coworker.domain}</span>
                {isSelected && (
                  <span className="text-cyan-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    TARGET
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Goal Dispatcher Bar */}
      <form onSubmit={handleDispatch} className="relative flex items-center">
        <input
          type="text"
          value={goalInput}
          onChange={(e) => setGoalInput(e.target.value)}
          placeholder={`Instruct ${DEFAULT_COWORKERS.find(c => c.id === selectedAgentId)?.name || 'Agent'} (e.g. 'Analyze memory leak in audio queue and propose fix')...`}
          className="w-full bg-[#060e1d]/90 border border-cyan-500/35 rounded-2xl py-3.5 pl-5 pr-32 text-xs font-mono text-cyan-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all shadow-[0_0_25px_rgba(0,0,0,0.5)]"
        />
        <button
          type="submit"
          disabled={!goalInput.trim() || isDispatching}
          className="absolute right-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 disabled:opacity-40 text-slate-950 font-bold text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
        >
          {isDispatching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>Delegate</span>
        </button>
      </form>

      {/* Live Terminal & Streaming Execution Logs */}
      <div className="flex-1 min-h-[380px] rounded-3xl bg-[#02050c] border border-cyan-500/30 flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] relative holo-scanline">
        
        {/* Terminal Title Bar */}
        <div className="px-5 py-3 border-b border-cyan-500/20 bg-[#040916]/95 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold text-cyan-200">
                A2A EXECUTION LOGS // REALTIME TELEMETRY
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { sfx.playPip(1000); onClearLogs(); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors text-xs font-mono flex items-center gap-1 cursor-pointer"
              title="Clear Terminal Output"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="flex-1 p-5 overflow-y-auto font-mono text-xs text-cyan-300/90 space-y-1.5 select-text">
          {streamLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center py-16">
              <Terminal className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-xs font-mono">No live agent execution logs recorded.</p>
              <p className="text-[11px] text-slate-700 mt-1">Delegate a goal or ask J.A.R.V.I.S. to trigger sub-agents.</p>
            </div>
          ) : (
            streamLogs.map((log, index) => {
              const isError = log.includes('[ERROR]') || log.includes('error');
              const isSuccess = log.includes('[SUCCESS]') || log.includes('completed');
              const isWarning = log.includes('[WARN]');
              return (
                <div
                  key={index}
                  className={`leading-relaxed ${
                    isError
                      ? 'text-rose-400 font-semibold'
                      : isSuccess
                      ? 'text-emerald-300 font-semibold'
                      : isWarning
                      ? 'text-amber-300'
                      : 'text-slate-300'
                  }`}
                >
                  <span className="text-slate-600 mr-2 select-none">[{index + 1}]</span>
                  {log}
                </div>
              );
            })
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>

    </div>
  );
};
