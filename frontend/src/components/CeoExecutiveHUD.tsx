import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Bot,
  Terminal,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Search,
  Send,
  X,
  RefreshCw,
  Cpu,
  FolderGit2,
  FileCheck2,
  ChevronRight
} from 'lucide-react';

interface CeoExecutiveHUDProps {
  isOpen: boolean;
  onClose: () => void;
  onSendPromptToJarvis?: (prompt: string) => void;
}

export const CeoExecutiveHUD: React.FC<CeoExecutiveHUDProps> = ({
  isOpen,
  onClose,
  onSendPromptToJarvis
}) => {
  const [activeTab, setActiveTab] = useState<'mission' | 'roster' | 'sessions' | 'skills'>('mission');
  const [roster, setRoster] = useState<any>(null);
  const [sessionsIndex, setSessionsIndex] = useState<any>(null);
  const [skillsList, setSkillsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Mission dispatch state
  const [goalInput, setGoalInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [missionLogs, setMissionLogs] = useState<Array<{ stage: string; message: string; timestamp: string }>>([]);
  const [lastMissionResult, setLastMissionResult] = useState<any>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rosterRes, sessionsRes, skillsRes] = await Promise.all([
        fetch('/api/ceo/roster').then(r => r.json()),
        fetch('/api/ceo/sessions').then(r => r.json()),
        fetch('/api/skills').then(r => r.json())
      ]);

      if (rosterRes.success) setRoster(rosterRes.roster);
      if (sessionsRes.success) setSessionsIndex(sessionsRes.sessions);
      if (skillsRes.skills) setSkillsList(skillsRes.skills);
    } catch (err) {
      console.error('[CeoHUD] Failed to load telemetry:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, fetchData]);

  // Handle session search
  const handleSearchSessions = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch('/api/ceo/query-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      }).then(r => r.json());
      if (res.success) {
        setSearchResults(res.results || []);
      }
    } catch (err) {
      console.error('[CeoHUD] Query error:', err);
    }
  };

  // Dispatch Mission
  const handleDispatchMission = async () => {
    if (!goalInput.trim() || isExecuting) return;
    const goal = goalInput.trim();
    setIsExecuting(true);
    setMissionLogs([
      { stage: 'INIT', message: `CEO J.A.R.V.I.S. analyzing directive: "${goal}"`, timestamp: new Date().toLocaleTimeString() }
    ]);
    setLastMissionResult(null);

    try {
      const res = await fetch('/api/ceo/mission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal })
      }).then(r => r.json());

      if (res.success && res.mission) {
        setLastMissionResult(res.mission);
        setMissionLogs(prev => [
          ...prev,
          { stage: 'COMPLETED', message: res.mission.executiveSummary, timestamp: new Date().toLocaleTimeString() }
        ]);
        fetchData();
      } else {
        setMissionLogs(prev => [
          ...prev,
          { stage: 'ERROR', message: res.error || 'Actuation failed', timestamp: new Date().toLocaleTimeString() }
        ]);
      }
    } catch (err: any) {
      setMissionLogs(prev => [
        ...prev,
        { stage: 'FATAL', message: err.message, timestamp: new Date().toLocaleTimeString() }
      ]);
    } finally {
      setIsExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-5xl h-[88vh] bg-slate-900/95 border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col overflow-hidden text-slate-200">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-mono tracking-wider text-white">J.A.R.V.I.S. CEO ORCHESTRATOR</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                  HERMES WORKFORCE ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">Autonomous Execution • Quality Gates • Central Memory Index</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-cyan-300 transition-colors"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-red-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-800 bg-slate-950/30 font-mono text-xs">
          <button
            onClick={() => setActiveTab('mission')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-medium transition-colors border-b-2 ${
              activeTab === 'mission'
                ? 'bg-slate-800/60 text-cyan-300 border-cyan-400 shadow-[0_2px_10px_rgba(6,182,212,0.1)]'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Terminal className="w-4 h-4" />
            Mission Control
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-medium transition-colors border-b-2 ${
              activeTab === 'roster'
                ? 'bg-slate-800/60 text-cyan-300 border-cyan-400 shadow-[0_2px_10px_rgba(6,182,212,0.1)]'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Bot className="w-4 h-4" />
            Agent Roster
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-medium transition-colors border-b-2 ${
              activeTab === 'sessions'
                ? 'bg-slate-800/60 text-cyan-300 border-cyan-400 shadow-[0_2px_10px_rgba(6,182,212,0.1)]'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Layers className="w-4 h-4" />
            Central Memory Index
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-medium transition-colors border-b-2 ${
              activeTab === 'skills'
                ? 'bg-slate-800/60 text-cyan-300 border-cyan-400 shadow-[0_2px_10px_rgba(6,182,212,0.1)]'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Cpu className="w-4 h-4" />
            Prebuilt Skills ({skillsList.length})
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: MISSION CONTROL */}
          {activeTab === 'mission' && (
            <div className="space-y-6">
              {/* Mission Input Launcher */}
              <div className="bg-slate-950/70 border border-cyan-500/20 rounded-xl p-5 shadow-inner">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold font-mono text-cyan-300 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                    AUTONOMOUS CEO MISSION DISPATCH
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    Executor: <strong className="text-cyan-300">Hermes</strong> | Gatekeeper: <strong className="text-cyan-300">J.A.R.V.I.S.</strong>
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDispatchMission()}
                    placeholder="Enter engineering directive (e.g. 'Build login UI tests', 'Refactor memory logger')..."
                    disabled={isExecuting}
                    className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-lg text-sm font-mono text-white placeholder-slate-500 outline-none transition-colors"
                  />
                  <button
                    onClick={handleDispatchMission}
                    disabled={isExecuting || !goalInput.trim()}
                    className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold font-mono text-xs rounded-lg flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:shadow-none"
                  >
                    {isExecuting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        EXECUTING...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        DISPATCH
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Live Progress Logs */}
              {missionLogs.length > 0 && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                    <span className="flex items-center gap-1.5 text-cyan-400">
                      <Terminal className="w-3.5 h-3.5" /> Mission Telemetry Log
                    </span>
                    <span>{missionLogs.length} events</span>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2">
                    {missionLogs.map((log, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-slate-300">
                        <span className="text-slate-500 text-[10px] whitespace-nowrap">[{log.timestamp}]</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                          {log.stage}
                        </span>
                        <span className="flex-1 break-words">{log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Last Mission Briefing Card */}
              {lastMissionResult && (
                <div className={`p-5 rounded-xl border ${lastMissionResult.qualityGatePassed ? 'bg-cyan-950/20 border-cyan-500/30' : 'bg-red-950/20 border-red-500/30'} space-y-3`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold flex items-center gap-2">
                      {lastMissionResult.qualityGatePassed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      )}
                      EXECUTIVE MISSION DEBRIEFING
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Session #{lastMissionResult.sessionId} • {lastMissionResult.durationMs}ms
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed font-sans italic">
                    "{lastMissionResult.executiveSummary}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AGENT ROSTER */}
          {activeTab === 'roster' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roster?.agents && Object.values(roster.agents).map((agent: any) => (
                <div key={agent.id} className="bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 rounded-xl p-5 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white font-mono">{agent.name}</h4>
                        <p className="text-xs text-slate-400">{agent.title}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      agent.status === 'ACTIVE_CEO' ? 'bg-blue-500/20 text-blue-300 border border-blue-400/40' :
                      agent.status === 'ACTIVE_WORKER' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40' :
                      'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {agent.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mb-4 line-clamp-2">{agent.description}</p>

                  <div className="space-y-2">
                    <span className="text-[11px] font-mono text-slate-400 block">Capabilities:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(agent.capabilities || []).map((c: string, idx: number) => (
                        <span key={idx} className="text-[10px] font-mono px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 rounded">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: CENTRAL MEMORY INDEX */}
          {activeTab === 'sessions' && (
            <div className="space-y-5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchSessions(e.target.value)}
                  placeholder="Contextual query across agent sessions (e.g. 'mem0', 'evolution', 'refactoring')..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl text-xs font-mono text-white placeholder-slate-500 outline-none"
                />
              </div>

              {/* Query Results or Full Tree */}
              {searchResults.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-mono text-cyan-300">Matched Sessions ({searchResults.length}):</h4>
                  {searchResults.map((res: any, idx: number) => (
                    <div key={idx} className="p-4 bg-slate-950/80 border border-cyan-500/20 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-cyan-400">{res.agent} • Session {res.session.sessionId}</span>
                        <span className="text-slate-500">{res.date}</span>
                      </div>
                      <p className="text-sm font-semibold text-white">{res.session.topic}</p>
                      <p className="text-xs text-slate-300">{res.session.summary}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {sessionsIndex?.agents && Object.entries(sessionsIndex.agents).map(([agentName, agentData]: [string, any]) => {
                    const dateEntries = Object.entries(agentData.dates || {});
                    return (
                      <div key={agentName} className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <h4 className="text-sm font-bold font-mono text-cyan-300 flex items-center gap-2">
                            <Bot className="w-4 h-4 text-cyan-400" />
                            {agentName}
                          </h4>
                          <span className="text-xs font-mono text-slate-500">{agentData.role}</span>
                        </div>

                        {dateEntries.length === 0 ? (
                          <p className="text-xs text-slate-500 italic">No recorded sessions yet.</p>
                        ) : (
                          <div className="space-y-3">
                            {dateEntries.map(([dateStr, sessions]: [string, any]) => (
                              <div key={dateStr} className="space-y-2">
                                <span className="text-xs font-mono font-semibold text-slate-400 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-slate-500" /> {dateStr}
                                </span>
                                <div className="space-y-2 pl-4 border-l border-slate-800">
                                  {sessions.map((s: any) => (
                                    <div key={s.sessionId} className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-lg text-xs space-y-1">
                                      <div className="flex items-center justify-between">
                                        <strong className="text-white font-mono">Session {s.sessionId}: {s.topic}</strong>
                                        <span className="text-[10px] text-slate-500">{new Date(s.timestamp).toLocaleTimeString()}</span>
                                      </div>
                                      <p className="text-slate-300">{s.summary}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PREBUILT SKILLS */}
          {activeTab === 'skills' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {skillsList.map((skill: any) => (
                <div key={skill.slug} className="p-4 bg-slate-950/60 border border-slate-800 hover:border-cyan-500/30 rounded-xl space-y-2 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-cyan-300 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                      {skill.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400">
                      {skill.source || 'prebuilt'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">{skill.description}</p>
                  <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                    <FolderGit2 className="w-3 h-3" /> {skill.slug}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
