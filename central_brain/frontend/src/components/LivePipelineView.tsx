import React, { useState } from 'react';
import { 
  Terminal, 
  Cpu, 
  Code, 
  Sparkles, 
  Globe, 
  Bot, 
  RefreshCw, 
  Send, 
  Activity, 
  Zap, 
  Pause, 
  Play, 
  ArrowRight, 
  ShieldCheck, 
  Copy, 
  Check, 
  FileCheck2,
  Trash2
} from 'lucide-react';

interface Agent {
  agentId: string;
  role: string;
  status: string;
  runtimePath: string;
  totalEvents?: number;
}

interface LivePipelineViewProps {
  agents: Agent[];
  events: any[];
  onTriggerScan: () => void;
  onManualIngest: (agentId: string, payload: string) => Promise<void>;
  onSelectAgentFilter?: (agentId: string) => void;
}

export const LivePipelineView: React.FC<LivePipelineViewProps> = ({
  agents,
  events,
  onTriggerScan,
  onManualIngest,
  onSelectAgentFilter,
}) => {
  const [testAgent, setTestAgent] = useState('Browser');
  const [testPayload, setTestPayload] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [copiedBookmarklet, setCopiedBookmarklet] = useState(false);
  const [eventFilter, setEventFilter] = useState<'ALL' | 'INGESTED' | 'DISTILLED' | 'PURGED'>('ALL');
  const [autoScroll, setAutoScroll] = useState(true);

  const getAgentVisual = (id: string) => {
    switch (id.toLowerCase()) {
      case 'hermes':
        return { icon: Terminal, color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-950/20' };
      case 'claude':
        return { icon: Cpu, color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-950/20' };
      case 'codex':
        return { icon: Code, color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-950/20' };
      case 'antigravity':
        return { icon: Sparkles, color: 'text-cyan-400', border: 'border-cyan-500/30', bg: 'bg-cyan-950/20' };
      case 'browser':
        return { icon: Globe, color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-950/20' };
      default:
        return { icon: Bot, color: 'text-slate-300', border: 'border-slate-700/50', bg: 'bg-slate-900/50' };
    }
  };

  const handleScan = async () => {
    setIsScanning(true);
    await onTriggerScan();
    setTimeout(() => setIsScanning(false), 600);
  };

  const handleTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPayload.trim()) return;

    setIsSubmitting(true);
    await onManualIngest(testAgent, testPayload);
    setTestPayload('');
    setIsSubmitting(false);
    setToastMsg('Ingested into Central Brain! Watch it distill live in the feed below.');
    setTimeout(() => setToastMsg(''), 4000);
  };

  const bookmarkletCode = `javascript:(function(){const t=document.title,u=window.location.href,s=window.getSelection?window.getSelection().toString():'',b=document.body?document.body.innerText.slice(0,3000):'';fetch('http://localhost:8200/api/ingest/browser',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:t,url:u,selectedText:s,rawSessionText:b,toolName:'Browser Quick-Capture'})}).then(r=>r.json()).then(()=>{const o=document.createElement('div');o.innerText='⚡ [Central Brain] Ingested!';o.style.position='fixed';o.style.bottom='20px';o.style.right='20px';o.style.backgroundColor='#065f46';o.style.color='#34d399';o.style.padding='10px 16px';o.style.borderRadius='8px';o.style.zIndex='999999';o.style.fontFamily='monospace';document.body.appendChild(o);setTimeout(()=>o.remove(),2000);}).catch(()=>alert('❌ [Central Brain] Failed to reach http://localhost:8200'));})();`;

  const copyBookmarklet = () => {
    navigator.clipboard.writeText(bookmarkletCode);
    setCopiedBookmarklet(true);
    setTimeout(() => setCopiedBookmarklet(false), 2500);
  };

  const filteredEvents = events.filter(ev => {
    if (eventFilter === 'ALL') return true;
    if (eventFilter === 'INGESTED') return ev.type === 'EVENT_INGESTED';
    if (eventFilter === 'DISTILLED') return ev.type === 'EVENT_DISTILLED';
    if (eventFilter === 'PURGED') return ev.type === 'RECORD_PURGED';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* SECTION 1: Auto-Discovered Runtimes Grid */}
      <div className="bg-[#0a0f1d] border border-[#162342] rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-[#162342]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <h2 className="text-sm font-bold tracking-wide text-slate-100 uppercase font-display">
                Discovered Agent Runtimes
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800 font-semibold">
                {agents.length} Active Runtimes
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Continuously monitors local runtimes and automatically binds ingestion adapters
            </p>
          </div>

          <button
            onClick={handleScan}
            disabled={isScanning}
            className="px-3.5 py-2 rounded-xl bg-cyan-950/60 border border-cyan-700/60 hover:border-cyan-500 text-cyan-300 text-xs font-semibold flex items-center gap-2 transition-all shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning...' : 'Re-Scan Runtimes'}</span>
          </button>
        </div>

        {/* Agent Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {agents.map((agent) => {
            const visual = getAgentVisual(agent.agentId);
            const Icon = visual.icon;

            return (
              <div
                key={agent.agentId}
                className={`bg-[#060a14] border ${visual.border} rounded-xl p-4 hover:border-cyan-400/50 transition-all flex flex-col justify-between group`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg ${visual.bg} flex items-center justify-center ${visual.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-slate-100 block group-hover:text-cyan-300 transition-colors">
                          {agent.agentId}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[120px]">
                          {agent.role}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                        agent.status === 'AUTO_CONNECTED'
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                          : agent.status === 'LISTENING'
                          ? 'bg-blue-950/80 text-blue-400 border border-blue-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {agent.status === 'AUTO_CONNECTED' ? '● Connected' : agent.status === 'LISTENING' ? '● Listening' : 'Offline'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 font-mono truncate bg-[#0a0f1d] px-2 py-1 rounded-md border border-[#162342] mb-3" title={agent.runtimePath}>
                    {agent.runtimePath}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#121c32] text-xs">
                  <span className="text-slate-400 font-mono text-[11px]">
                    <strong className="text-slate-200">{agent.totalEvents || 0}</strong> events
                  </span>
                  {onSelectAgentFilter && (
                    <button
                      onClick={() => onSelectAgentFilter(agent.agentId)}
                      className="text-cyan-400 hover:text-cyan-300 text-[11px] font-medium flex items-center gap-1 transition-colors"
                    >
                      <span>Ledger</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Split View (Live Feed + Quick Capture & Sandbox) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Telemetry Stream */}
        <div className="lg:col-span-2 bg-[#0a0f1d] border border-[#162342] rounded-2xl p-5 shadow-lg flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#162342]">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide font-display">
                Live LangGraph Pipeline Stream
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-mono">
                {filteredEvents.length} events
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Event Filter Pills */}
              <div className="flex items-center gap-1 bg-[#060a14] p-1 rounded-lg border border-[#162342] text-[11px] font-semibold">
                {(['ALL', 'INGESTED', 'DISTILLED', 'PURGED'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setEventFilter(filter)}
                    className={`px-2 py-0.5 rounded transition-all ${
                      eventFilter === filter
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {/* AutoScroll Toggle */}
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`p-1.5 rounded-lg border text-xs transition-colors ${
                  autoScroll 
                    ? 'bg-slate-800/80 border-slate-700 text-slate-300' 
                    : 'bg-amber-950/60 border-amber-800 text-amber-300'
                }`}
                title={autoScroll ? 'Auto-scroll enabled (click to pause)' : 'Auto-scroll paused'}
              >
                {autoScroll ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Telemetry Stream Items */}
          <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1 text-xs">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                <p className="font-medium text-slate-300">Listening for incoming agent activity...</p>
                <p className="text-xs text-slate-400 mt-1">
                  Transcripts from Hermes, Claude, Codex, Antigravity, or Browser will appear here live.
                </p>
              </div>
            ) : (
              filteredEvents.map((ev, i) => (
                <div
                  key={i}
                  className="bg-[#060a14] border border-[#162342] hover:border-slate-700 rounded-xl p-3.5 transition-colors"
                >
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60 font-mono">
                        {ev.data?.agentId || 'GATEWAY'}
                      </span>
                      {ev.data?.sessionId && (
                        <span className="text-slate-400 font-mono text-[10px]">
                          Session: {ev.data.sessionId}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 font-mono text-[10px]">
                      {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  {ev.type === 'EVENT_INGESTED' && (
                    <div className="text-slate-200 flex items-start gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 font-semibold text-[10px] shrink-0 font-mono">
                        RAW INGEST
                      </span>
                      <p className="text-slate-300 text-xs line-clamp-2 leading-relaxed font-mono">
                        {ev.data?.preview}
                      </p>
                    </div>
                  )}

                  {ev.type === 'EVENT_DISTILLED' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 font-semibold text-[10px] shrink-0 font-mono">
                          DISTILLED (-{((ev.data?.metrics?.compressionRatio || 0) * 100).toFixed(1)}% TOKENS)
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {ev.data?.metrics?.rawTokens} raw → {ev.data?.metrics?.distilledTokens} stored
                        </span>
                      </div>
                      <p className="text-slate-100 text-xs leading-relaxed font-sans">
                        {ev.data?.summary}
                      </p>
                    </div>
                  )}

                  {ev.type === 'RECORD_PURGED' && (
                    <div className="text-red-300 flex items-center gap-2">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-xs font-semibold">
                        Cascade Purged memory record: <code className="text-red-200">{ev.data?.id}</code>
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Col: Browser Capture Helper & Manual Ingestion Tester */}
        <div className="space-y-6">
          {/* Quick-Capture Bookmarklet Card */}
          <div className="bg-[#0a0f1d] border border-emerald-500/30 rounded-2xl p-5 shadow-lg cyber-glow-emerald">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-emerald-400 font-display">
                Browser Quick-Capture
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Capture web research, ChatGPT conversations, Claude web sessions, or Colab logs straight to Central Brain with 1 click.
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={copyBookmarklet}
                className="w-full py-2.5 px-3.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/90 border border-emerald-600/80 text-emerald-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md"
              >
                {copiedBookmarklet ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>✓ Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-emerald-400" />
                    <span>Copy 1-Click Bookmarklet</span>
                  </>
                )}
              </button>

              <div className="bg-[#060a14] p-3 rounded-xl border border-[#162342] text-[11px] text-slate-400 space-y-1">
                <div className="font-semibold text-slate-300 mb-1">Easy 2-Step Setup:</div>
                <div>1. Create a new bookmark in your browser.</div>
                <div>2. Paste the copied code as the bookmark URL!</div>
              </div>
            </div>
          </div>

          {/* Manual Ingestion Sandbox */}
          <div className="bg-[#0a0f1d] border border-[#162342] rounded-2xl p-5 shadow-lg">
            <h3 className="text-sm font-bold text-slate-100 font-display mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Manual Ingestion Tester
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Test how the Two-Tier engine distills raw text
            </p>

            <form onSubmit={handleTestSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Simulate Agent</label>
                <select
                  value={testAgent}
                  onChange={(e) => setTestAgent(e.target.value)}
                  className="w-full bg-[#060a14] border border-[#1a2c4e] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
                >
                  <option value="Browser">🌐 Browser Research</option>
                  <option value="Hermes">🪽 Hermes CLI</option>
                  <option value="Claude">🟣 Claude Code</option>
                  <option value="Codex">🟢 OpenAI Codex</option>
                  <option value="Antigravity">🚀 Antigravity IDE</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Activity Log / Decision</label>
                <textarea
                  rows={3}
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                  placeholder="Paste a conversation snippet, design decision, or error log to compress..."
                  className="w-full bg-[#060a14] border border-[#1a2c4e] focus:border-cyan-500 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !testPayload.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-cyan-500/10"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Compressing via LangGraph...' : 'Pipeline to Central Brain'}</span>
              </button>

              {toastMsg && (
                <div className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800 rounded-xl p-2.5 text-center font-medium animate-in fade-in">
                  ✓ {toastMsg}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
