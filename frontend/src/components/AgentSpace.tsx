import React, { useState, useEffect, useRef } from 'react';
import { Bot, Terminal, X, Play, Square, Network, Zap } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  role: string;
  domain: string;
  color: string;
  isAvailable: boolean;
  version: string;
}

interface Session {
  sessionId: string;
  agentId: string;
  status: string;
  history: any[];
  createdAt: number;
}

interface AgentSpaceProps {
  streamLogs: string[];
}

export const AgentSpace: React.FC<AgentSpaceProps> = ({ streamLogs }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [commandInput, setCommandInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAgents();
    fetchSessions();
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [streamLogs]);

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents');
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      }
    } catch (e) {
      console.error('Failed to fetch agents', e);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/agents/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (e) {
      console.error('Failed to fetch sessions', e);
    }
  };

  const handleOpenSession = async () => {
    if (!selectedAgent) return;
    setIsLoading(true);
    try {
      await fetch('/api/agents/sessions/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: selectedAgent.id })
      });
      await fetchSessions();
    } catch (e) {
      console.error('Failed to open session', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendCommand = async (sessionId: string) => {
    if (!commandInput.trim()) return;
    setIsLoading(true);
    try {
      await fetch(`/api/agents/sessions/${sessionId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: commandInput })
      });
      setCommandInput('');
      await fetchSessions();
    } catch (e) {
      console.error('Failed to send command', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseSession = async (sessionId: string) => {
    try {
      await fetch(`/api/agents/sessions/${sessionId}/close`, {
        method: 'POST'
      });
      await fetchSessions();
    } catch (e) {
      console.error('Failed to close session', e);
    }
  };
  
  const activeSession = selectedAgent ? sessions.find(s => s.agentId === selectedAgent.id && s.status === 'active') : null;

  return (
    <div className="w-full h-full flex flex-row bg-zinc-950 font-sans relative overflow-hidden">
      {/* Canvas Area */}
      <div className="flex-1 relative flex items-center justify-center p-8">
        
        {/* Connection Lines (SVG) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          {agents.map((agent, i) => {
            const angle = (i / agents.length) * 2 * Math.PI - Math.PI / 2;
            const radius = 250;
            const targetX = `calc(50% + ${Math.cos(angle) * radius}px)`;
            const targetY = `calc(50% + ${Math.sin(angle) * radius}px)`;
            const isConnected = sessions.some(s => s.agentId === agent.id && s.status === 'active');
            
            return (
              <line 
                key={`line-${agent.id}`}
                x1="50%" y1="50%" 
                x2={targetX} y2={targetY} 
                stroke={isConnected ? agent.color : '#3f3f46'}
                strokeWidth={isConnected ? 3 : 1}
                strokeDasharray={isConnected ? 'none' : '5,5'}
                className={isConnected ? 'animate-pulse' : ''}
              />
            );
          })}
        </svg>

        {/* Center Node (J.A.R.V.I.S.) */}
        <div className="absolute z-10 flex flex-col items-center justify-center w-32 h-32 rounded-full border-4 border-cyan-500 bg-black shadow-[0_0_40px_rgba(6,182,212,0.6)] animate-pulse">
          <Zap className="w-10 h-10 text-cyan-400 mb-1" />
          <span className="text-cyan-400 font-bold text-sm font-mono">J.A.R.V.I.S.</span>
        </div>

        {/* Peripheral Nodes (Agents) */}
        {agents.map((agent, i) => {
          const angle = (i / agents.length) * 2 * Math.PI - Math.PI / 2;
          const radius = 250;
          
          const isSelected = selectedAgent?.id === agent.id;
          const isConnected = sessions.some(s => s.agentId === agent.id && s.status === 'active');

          return (
            <div
              key={agent.id}
              onClick={() => setSelectedAgent(agent)}
              className={`absolute z-10 p-4 rounded-xl border-2 cursor-pointer transition-all hover:scale-105 ${
                isSelected ? 'ring-4 ring-white/20' : ''
              }`}
              style={{
                left: `calc(50% + ${Math.cos(angle) * radius}px)`,
                top: `calc(50% + ${Math.sin(angle) * radius}px)`,
                transform: 'translate(-50%, -50%)',
                borderColor: agent.color,
                backgroundColor: 'rgba(0,0,0,0.8)',
                boxShadow: isConnected ? `0 0 20px ${agent.color}66` : 'none'
              }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${agent.color}22` }}>
                  <Bot className="w-6 h-6" style={{ color: agent.color }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-bold text-sm">{agent.name}</h3>
                    <div className={`w-2 h-2 rounded-full ${agent.isAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
                  </div>
                  <p className="text-zinc-400 text-xs font-mono">{agent.role}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Session Panel */}
      {selectedAgent && (
        <div className="w-96 border-l border-zinc-800 bg-zinc-900/90 backdrop-blur-xl flex flex-col z-20">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5 text-zinc-400" />
              <h2 className="text-white font-semibold">Session Control</h2>
            </div>
            <button onClick={() => setSelectedAgent(null)} className="text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 border-b border-zinc-800">
            <h3 className="text-lg font-bold text-white mb-1" style={{ color: selectedAgent.color }}>{selectedAgent.name}</h3>
            <p className="text-sm text-zinc-400 mb-4">{selectedAgent.role} • v{selectedAgent.version}</p>
            
            {!activeSession ? (
              <button
                onClick={handleOpenSession}
                disabled={isLoading}
                className="w-full py-2 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors flex items-center justify-center gap-2"
                style={{ border: `1px solid ${selectedAgent.color}44` }}
              >
                <Play className="w-4 h-4" /> Open Session
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-green-400 font-mono">SESSION ACTIVE ({activeSession.sessionId.slice(-6)})</span>
                </div>
                <button
                  onClick={() => handleCloseSession(activeSession.sessionId)}
                  className="w-full py-2 px-4 rounded-lg bg-red-950/40 hover:bg-red-900/40 border border-red-900/50 text-red-400 font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Square className="w-4 h-4" /> Close Session
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col min-h-0 p-4">
            <h4 className="text-xs font-mono text-zinc-500 mb-2 uppercase flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5" /> Live Telemetry
            </h4>
            <div className="flex-1 bg-black rounded-lg border border-zinc-800 p-3 overflow-y-auto text-xs font-mono leading-relaxed space-y-1 select-text">
              {streamLogs.length === 0 ? (
                <span className="text-zinc-600 italic">Awaiting task stream...</span>
              ) : (
                streamLogs.map((log, idx) => (
                  <div key={idx} className="text-zinc-300 whitespace-pre-wrap break-all">
                    {log}
                  </div>
                ))
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>

          {activeSession && (
            <div className="p-4 border-t border-zinc-800 bg-zinc-950/50">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendCommand(activeSession.sessionId)}
                  placeholder="Send instruction..."
                  className="flex-1 bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600"
                />
                <button
                  onClick={() => handleSendCommand(activeSession.sessionId)}
                  disabled={isLoading || !commandInput.trim()}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white disabled:opacity-50 transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
