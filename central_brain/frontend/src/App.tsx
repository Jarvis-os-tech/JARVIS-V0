import React, { useState, useEffect, useRef } from 'react';
import { LivePipelineView } from './components/LivePipelineView.js';
import { MemoryLedgerView } from './components/MemoryLedgerView.js';
import { DataCurationModal } from './components/DataCurationModal.js';

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
  const [activeTab, setActiveTab] = useState<'pipeline' | 'ledger' | 'system'>('pipeline');
  const [agents, setAgents] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
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
      // Backend may be starting
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
            // Refresh ledger upon new ingestion or purge
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

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-100 font-mono">
      {/* Top Cyber Command Header */}
      <header className="border-b border-[#15233e] bg-[#0a0f1d]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-slate-950 font-display text-base shadow-md">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-wider font-display uppercase text-slate-100">
                  Central Brain Command Console
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400 font-bold">
                  PORT 8200
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                  }`}
                  title={isConnected ? 'WebSocket Telemetry Live' : 'Reconnecting...'}
                ></span>
              </div>
              <p className="text-[11px] text-slate-500">
                Sovereign Multi-Agent Memory & Observability Platform for Gopi
              </p>
            </div>
          </div>

          {/* Circuit Breaker Status & Toggle */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block">J.A.R.V.I.S. RECALL GATEWAY:</span>
              <span
                className={`text-xs font-bold tracking-wider uppercase font-mono ${
                  circuitBreaker.status === 'STANDBY' ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                ● {circuitBreaker.status === 'STANDBY' ? 'STANDBY (QUARANTINED)' : 'ACTIVE (CONNECTED)'}
              </span>
            </div>

            <button
              onClick={handleToggleCircuitBreaker}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono tracking-wide transition-all border ${
                circuitBreaker.status === 'STANDBY'
                  ? 'bg-amber-950/60 border-amber-600/80 text-amber-300 hover:bg-amber-900/60'
                  : 'bg-emerald-950/60 border-emerald-600/80 text-emerald-300 hover:bg-emerald-900/60'
              }`}
            >
              {circuitBreaker.status === 'STANDBY' ? 'Link to J.A.R.V.I.S.' : 'Quarantine Standby'}
            </button>
          </div>
        </div>

        {/* Global Performance HUD Bar */}
        <div className="border-t border-[#121c32] bg-[#05070d]/60 px-4 py-2 text-xs">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 font-mono">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-slate-500">Total Sessions: </span>
                <span className="text-slate-200 font-bold">{metrics.totalSessions}</span>
              </div>
              <div>
                <span className="text-slate-500">Raw Ingested: </span>
                <span className="text-amber-400 font-bold">
                  {metrics.rawTokensReceived.toLocaleString()} tokens
                </span>
              </div>
              <div>
                <span className="text-slate-500">Stored Memory: </span>
                <span className="text-emerald-400 font-bold">
                  {metrics.compressedTokensStored.toLocaleString()} tokens
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500">TOKEN EFFICIENCY:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-400 font-bold">
                {metrics.overallTokenSavings} REDUCTION
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="flex items-center gap-2 border-b border-[#15233e] pb-3 mb-6">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all ${
              activeTab === 'pipeline'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚡ Live Telemetry Pipeline
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all ${
              activeTab === 'ledger'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📚 Structured Memory Ledger ({records.length})
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all ${
              activeTab === 'system'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🛡️ Architecture & Governance
          </button>
        </div>

        {/* Tab Views */}
        {activeTab === 'pipeline' && (
          <LivePipelineView
            agents={agents}
            events={events}
            onTriggerScan={handleTriggerScan}
            onManualIngest={handleManualIngest}
          />
        )}

        {activeTab === 'ledger' && (
          <MemoryLedgerView
            records={records}
            onInspect={(rec) => setSelectedRecord(rec)}
            onPurge={handlePurgeRecord}
          />
        )}

        {activeTab === 'system' && (
          <div className="bg-[#0a0f1d] border border-[#15233e] rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-bold font-display uppercase tracking-wider text-cyan-400">
              Central Brain Sovereign Architecture
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              The Central Brain is a dedicated local memory and observability platform designed to prevent context loss across your multi-agent workflow on Linux.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 font-mono text-xs">
              <div className="bg-[#05070d] p-4 rounded-lg border border-[#15233e] space-y-2">
                <h3 className="font-bold text-slate-200">Autonomous Ingestion Sentinel</h3>
                <p className="text-slate-400">
                  Continuous tailing of <code className="text-cyan-400">~/.hermes</code>, <code className="text-cyan-400">~/.claude</code>, <code className="text-cyan-400">~/.codex</code>, <code className="text-cyan-400">~/.gemini/antigravity</code>, and the browser gateway.
                </p>
              </div>

              <div className="bg-[#05070d] p-4 rounded-lg border border-[#15233e] space-y-2">
                <h3 className="font-bold text-slate-200">Two-Tier Summarizer Engine</h3>
                <p className="text-slate-400">
                  Semantic LLM primary tier paired with a deterministic rule-based regex fallback (0ms latency, zero offline failure) achieving -85% token compression.
                </p>
              </div>

              <div className="bg-[#05070d] p-4 rounded-lg border border-[#15233e] space-y-2">
                <h3 className="font-bold text-slate-200">Dual-Format Single Master Index</h3>
                <p className="text-slate-400">
                  Synchronizes SQLite entries atomically into <code className="text-emerald-400">master_index.json</code> and <code className="text-emerald-400">master_index.md</code> in under 20ms using renameSync.
                </p>
              </div>

              <div className="bg-[#05070d] p-4 rounded-lg border border-[#15233e] space-y-2">
                <h3 className="font-bold text-slate-200">Cascade Purge & Deduplication</h3>
                <p className="text-slate-400">
                  Purging any memory atomically removes the ledger row and clears the SHA-256 fingerprint in <code className="text-red-400">event_dedup</code> so activity can be cleanly re-ingested.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Curation Modal */}
      <DataCurationModal
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onSaveSummary={handleSaveSummary}
        onPurgeRecord={handlePurgeRecord}
      />
    </div>
  );
}
