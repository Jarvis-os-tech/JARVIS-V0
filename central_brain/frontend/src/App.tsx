import React, { useState, useEffect, useRef } from 'react';
import { 
  LivePipelineView 
} from './components/LivePipelineView.js';
import { 
  MemoryLedgerView 
} from './components/MemoryLedgerView.js';
import { 
  BrowserCaptureGuide 
} from './components/BrowserCaptureGuide.js';
import { 
  DataCurationModal 
} from './components/DataCurationModal.js';
import { 
  Activity, 
  BookOpen, 
  Globe, 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Layers, 
  FileText, 
  Sparkles, 
  Zap, 
  RefreshCw,
  Cpu,
  Database,
  ArrowRight,
  Info
} from 'lucide-react';

interface Metrics {
  totalSessions: number;
  rawTokensReceived: number;
  compressedTokensStored: number;
  overallTokenSavings: string;
  activeAgentsCount: number;
}

interface CircuitBreaker {
  status: 'STANDBY' | 'ACTIVE';
  lastToggled: string;
  reason: string;
  port: number;
  jarvisPort: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'ledger' | 'browser' | 'system'>('pipeline');
  const [agents, setAgents] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedAgentFilter, setSelectedAgentFilter] = useState('ALL');
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [metrics, setMetrics] = useState<Metrics>({
    totalSessions: 0,
    rawTokensReceived: 0,
    compressedTokensStored: 0,
    overallTokenSavings: '0.0%',
    activeAgentsCount: 0,
  });
  const [circuitBreaker, setCircuitBreaker] = useState<CircuitBreaker>({
    status: 'STANDBY',
    lastToggled: new Date().toISOString(),
    reason: 'Initial Standby Isolation',
    port: 8200,
    jarvisPort: 3000,
  });
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  // Fetch initial REST data
  const fetchAllData = async () => {
    try {
      const [agentsRes, ledgerRes, metricsRes, breakerRes] = await Promise.all([
        fetch('http://localhost:8200/api/agents').then((r) => r.json()),
        fetch('http://localhost:8200/api/ledger').then((r) => r.json()),
        fetch('http://localhost:8200/api/metrics').then((r) => r.json()),
        fetch('http://localhost:8200/api/circuit-breaker').then((r) => r.json()),
      ]);

      if (agentsRes.agents) setAgents(agentsRes.agents);
      if (ledgerRes.records) setRecords(ledgerRes.records);
      if (metricsRes.metrics) setMetrics(metricsRes.metrics);
      if (breakerRes.circuitBreaker) setCircuitBreaker(breakerRes.circuitBreaker);
    } catch (e) {
      // Server may be initializing
    }
  };

  useEffect(() => {
    fetchAllData();

    // Setup WebSocket connection
    const connectWS = () => {
      const ws = new WebSocket('ws://localhost:8200/stream');
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (msg) => {
        try {
          const payload = JSON.parse(msg.data);
          if (payload.type === 'INITIAL_STATE') {
            if (payload.data.metrics) setMetrics(payload.data.metrics);
            if (payload.data.agents) setAgents(payload.data.agents);
            if (payload.data.circuitBreaker) setCircuitBreaker(payload.data.circuitBreaker);
            if (payload.data.recentLogs) setRecords(payload.data.recentLogs);
          } else {
            setEvents((prev) => [payload, ...prev.slice(0, 49)]);
            fetchAllData();
          }
        } catch (e) {
          // parse error
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setTimeout(connectWS, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connectWS();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const handleToggleCircuitBreaker = async () => {
    try {
      const res = await fetch('http://localhost:8200/api/circuit-breaker/toggle', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.circuitBreaker) {
        setCircuitBreaker(data.circuitBreaker);
      }
    } catch (e) {
      alert('Failed to toggle circuit breaker');
    }
  };

  const handleTriggerScan = async () => {
    try {
      const res = await fetch('http://localhost:8200/api/agents/scan', { method: 'POST' });
      const data = await res.json();
      if (data.agents) setAgents(data.agents);
    } catch (e) {
      alert('Failed to scan runtimes');
    }
  };

  const handleManualIngest = async (agentId: string, payload: string) => {
    await fetch('http://localhost:8200/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, payload }),
    });
    fetchAllData();
  };

  const handleBrowserIngest = async (url: string, title: string, text: string) => {
    await fetch('http://localhost:8200/api/ingest/browser', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, title, selectedText: text }),
    });
    fetchAllData();
  };

  const handleSaveSummary = async (id: string, newSummary: string) => {
    await fetch(`http://localhost:8200/api/ledger/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary: newSummary }),
    });
    fetchAllData();
  };

  const handlePurgeRecord = async (id: string) => {
    await fetch(`http://localhost:8200/api/ledger/purge/${id}`, {
      method: 'DELETE',
    });
    fetchAllData();
  };

  const handleAgentClickFromPipeline = (agentId: string) => {
    setSelectedAgentFilter(agentId);
    setActiveTab('ledger');
  };

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-100 flex flex-col font-sans">
      {/* Top Cyber Command Header */}
      <header className="border-b border-[#162342] bg-[#070b16]/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Product Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-slate-950 text-xl shadow-lg shadow-cyan-500/20">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-100 font-display uppercase">
                  Central Brain
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-300 font-mono font-bold">
                  PORT 8200
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                  }`}
                  title={isConnected ? 'WebSocket Telemetry Connected' : 'Reconnecting...'}
                ></span>
              </div>
              <p className="text-xs text-slate-400">
                Sovereign Multi-Agent Memory & Observability Platform for Gopi
              </p>
            </div>
          </div>

          {/* J.A.R.V.I.S. Standby Circuit Breaker */}
          <div className="flex items-center gap-3 bg-[#0a0f1d] px-3.5 py-2 rounded-2xl border border-[#162342] shadow-sm">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-medium">J.A.R.V.I.S. Recall Bridge</span>
              <span
                className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 justify-end ${
                  circuitBreaker.status === 'STANDBY' ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {circuitBreaker.status === 'STANDBY' ? (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Standby (Safe Quarantine)</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Active (Recall Enabled)</span>
                  </>
                )}
              </span>
            </div>

            <button
              onClick={handleToggleCircuitBreaker}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all border shadow-sm ${
                circuitBreaker.status === 'STANDBY'
                  ? 'bg-amber-950/60 border-amber-600/80 text-amber-200 hover:bg-amber-900/60'
                  : 'bg-emerald-950/60 border-emerald-600/80 text-emerald-200 hover:bg-emerald-900/60'
              }`}
            >
              {circuitBreaker.status === 'STANDBY' ? 'Link to J.A.R.V.I.S.' : 'Disconnect'}
            </button>
          </div>
        </div>

        {/* Global KPI Stats Strip */}
        <div className="border-t border-[#121c32] bg-[#05070d]/80 px-4 sm:px-6 py-2.5">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {/* KPI 1: Sessions */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-950/50 border border-cyan-800/60 flex items-center justify-center text-cyan-400 shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Total Sessions</span>
                <span className="font-bold text-slate-100 font-mono text-sm">
                  {metrics.totalSessions} <span className="text-xs font-normal text-slate-400 font-sans">logged</span>
                </span>
              </div>
            </div>

            {/* KPI 2: Raw Tokens */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-950/50 border border-amber-800/60 flex items-center justify-center text-amber-400 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Raw Activity Ingested</span>
                <span className="font-bold text-amber-300 font-mono text-sm">
                  {metrics.rawTokensReceived.toLocaleString()} <span className="text-xs font-normal text-slate-400 font-sans">tokens</span>
                </span>
              </div>
            </div>

            {/* KPI 3: Distilled Tokens */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-950/50 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Stored Distilled Memory</span>
                <span className="font-bold text-emerald-400 font-mono text-sm">
                  {metrics.compressedTokensStored.toLocaleString()} <span className="text-xs font-normal text-slate-400 font-sans">tokens</span>
                </span>
              </div>
            </div>

            {/* KPI 4: Token Efficiency Gauge */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="w-full">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Token Efficiency</span>
                  <span className="font-bold text-emerald-400 font-mono">{metrics.overallTokenSavings}</span>
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-500"
                    style={{ width: metrics.overallTokenSavings }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-16 flex-1 w-full space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#162342] pb-4">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab('pipeline')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'pipeline'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#0a0f1d]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Live Pipeline & Agents</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 font-mono">
                {agents.length}
              </span>
            </button>

            <button
              onClick={() => {
                setSelectedAgentFilter('ALL');
                setActiveTab('ledger');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'ledger'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#0a0f1d]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Memory Ledger</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                {records.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('browser')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'browser'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#0a0f1d]'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Browser Capture</span>
            </button>

            <button
              onClick={() => setActiveTab('system')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'system'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#0a0f1d]'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Architecture & Specs</span>
            </button>
          </div>

          <button
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1.5 transition-colors self-end sm:self-auto"
          >
            <Info className="w-3.5 h-3.5" />
            <span>{showHowItWorks ? 'Hide Architecture Flow' : 'How does Central Brain work?'}</span>
          </button>
        </div>

        {/* Collapsible Architecture Flow Banner */}
        {showHowItWorks && (
          <div className="bg-[#0a0f1d] border border-cyan-500/30 rounded-2xl p-5 shadow-xl cyber-glow animate-in fade-in duration-300">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-display mb-3">
              Autonomous Central Brain Pipeline Flow
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="bg-[#060a14] p-3.5 rounded-xl border border-[#162342] space-y-1">
                <span className="font-bold text-slate-200 block">1. Auto-Discovery & Ingest</span>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Tails local CLIs (~/.hermes, ~/.claude, ~/.codex, ~/.gemini) and browser tabs via HTTP gateway.
                </p>
              </div>

              <div className="bg-[#060a14] p-3.5 rounded-xl border border-[#162342] space-y-1">
                <span className="font-bold text-amber-300 block">2. SHA-256 Deduplication</span>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Fingerprints activity payloads to prevent duplicate writes if logs re-stream.
                </p>
              </div>

              <div className="bg-[#060a14] p-3.5 rounded-xl border border-[#162342] space-y-1">
                <span className="font-bold text-emerald-400 block">3. Two-Tier Distillation</span>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Semantic LLM + 0ms regex fallback condenses chat bloat into 2-3 dense sentences (-85% tokens).
                </p>
              </div>

              <div className="bg-[#060a14] p-3.5 rounded-xl border border-[#162342] space-y-1">
                <span className="font-bold text-cyan-300 block">4. Atomic Dual-Ledger Sync</span>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Writes to SQLite WAL mode and syncs master_index.json & master_index.md in &lt; 15ms.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: Live Pipeline View */}
        {activeTab === 'pipeline' && (
          <LivePipelineView
            agents={agents}
            events={events}
            onTriggerScan={handleTriggerScan}
            onManualIngest={handleManualIngest}
            onSelectAgentFilter={handleAgentClickFromPipeline}
          />
        )}

        {/* Tab 2: Structured Memory Ledger */}
        {activeTab === 'ledger' && (
          <MemoryLedgerView
            records={records}
            onInspect={(rec) => setSelectedRecord(rec)}
            onPurge={handlePurgeRecord}
            selectedAgentFilter={selectedAgentFilter}
          />
        )}

        {/* Tab 3: Browser Capture Helper */}
        {activeTab === 'browser' && (
          <BrowserCaptureGuide
            onTestIngest={handleBrowserIngest}
          />
        )}

        {/* Tab 4: System Architecture & Governance */}
        {activeTab === 'system' && (
          <div className="bg-[#0a0f1d] border border-[#162342] rounded-2xl p-6 space-y-6 shadow-xl max-w-4xl mx-auto">
            <div>
              <h2 className="text-base font-bold font-display uppercase tracking-wide text-cyan-400">
                Sovereign Central Brain Governance & Storage
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Central Brain provides persistent cross-agent memory for Gopi without token bloat, ensuring that what you build in Hermes, Claude, Codex, or the browser is recalled seamlessly.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-[#060a14] p-4 rounded-xl border border-[#162342] space-y-2">
                <h3 className="font-bold text-slate-200 flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  SQLite WAL-Mode Engine
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Configured with <code className="text-cyan-300 font-mono">PRAGMA journal_mode = WAL;</code> and a 5,000ms busy timeout. Enables non-blocking concurrent writes with C-speed transactions (&lt; 0.5ms).
                </p>
              </div>

              <div className="bg-[#060a14] p-4 rounded-xl border border-[#162342] space-y-2">
                <h3 className="font-bold text-slate-200 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  LangGraph Multi-Agent Supervisor
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Uses deterministic state transitions via <code className="text-purple-300 font-mono">@langchain/langgraph</code> StateGraph with built-in deduplication, LLM summarization, and human curation pause points.
                </p>
              </div>

              <div className="bg-[#060a14] p-4 rounded-xl border border-[#162342] space-y-2">
                <h3 className="font-bold text-slate-200 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  Dual-Format Master Ledger Sync
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Synchronizes SQLite records atomically to both <code className="text-emerald-300 font-mono">master_index.json</code> and human-readable <code className="text-emerald-300 font-mono">master_index.md</code> in under 15ms.
                </p>
              </div>

              <div className="bg-[#060a14] p-4 rounded-xl border border-[#162342] space-y-2">
                <h3 className="font-bold text-slate-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  J.A.R.V.I.S. Standby Circuit Breaker
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  The memory bridge to J.A.R.V.I.S. (Port 3000) is isolated on Standby. Memories are never passed to J.A.R.V.I.S. without your manual approval and toggle.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Curation & Inspection Modal */}
      <DataCurationModal
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onSaveSummary={handleSaveSummary}
        onPurgeRecord={handlePurgeRecord}
      />
    </div>
  );
}
