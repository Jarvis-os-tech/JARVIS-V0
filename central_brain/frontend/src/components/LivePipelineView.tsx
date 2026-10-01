import React, { useState } from 'react';

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
}

export const LivePipelineView: React.FC<LivePipelineViewProps> = ({
  agents,
  events,
  onTriggerScan,
  onManualIngest,
}) => {
  const [testAgent, setTestAgent] = useState('Browser');
  const [testPayload, setTestPayload] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const handleTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPayload.trim()) return;

    setIsSubmitting(true);
    await onManualIngest(testAgent, testPayload);
    setTestPayload('');
    setIsSubmitting(false);
    setToastMsg('Event successfully piped through LangGraph StateGraph!');
    setTimeout(() => setToastMsg(''), 3000);
  };

  const bookmarkletCode = `javascript:(function(){const t=document.title,u=window.location.href,s=window.getSelection?window.getSelection().toString():'',b=document.body?document.body.innerText.slice(0,3000):'';fetch('http://localhost:8200/api/ingest/browser',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:t,url:u,selectedText:s,rawSessionText:b,toolName:'Browser Quick-Capture'})}).then(r=>r.json()).then(()=>{const o=document.createElement('div');o.innerText='⚡ [Central Brain] Ingested!';o.style.position='fixed';o.style.bottom='20px';o.style.right='20px';o.style.backgroundColor='#065f46';o.style.color='#34d399';o.style.padding='10px 16px';o.style.borderRadius='8px';o.style.zIndex='999999';o.style.fontFamily='monospace';document.body.appendChild(o);setTimeout(()=>o.remove(),2000);}).catch(()=>alert('❌ [Central Brain] Failed to reach http://localhost:8200'));})();`;

  return (
    <div className="space-y-6">
      {/* Auto-Discovered Runtimes Bar */}
      <div className="bg-[#0a0f1d] border border-[#15233e] rounded-xl p-5 cyber-glow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <h2 className="text-sm font-semibold tracking-wider uppercase text-cyan-400 font-display">
              Autonomous Agent Discovery Sentinel
            </h2>
          </div>
          <button
            onClick={onTriggerScan}
            className="text-xs px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800/80 text-cyan-300 hover:bg-cyan-900/60 transition-colors"
          >
            ↻ Re-Scan Runtimes
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {agents.map((agent) => (
            <div
              key={agent.agentId}
              className="bg-[#05070d]/80 border border-[#1a2c4e] rounded-lg p-3 hover:border-cyan-500/50 transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm text-slate-100">{agent.agentId}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                    agent.status === 'AUTO_CONNECTED'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : agent.status === 'LISTENING'
                      ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {agent.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mb-2">{agent.role}</p>
              <p className="text-[11px] text-slate-500 font-mono truncate" title={agent.runtimePath}>
                {agent.runtimePath}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Event Telemetry Stream */}
        <div className="lg:col-span-2 bg-[#0a0f1d] border border-[#15233e] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-300 tracking-wide uppercase font-display flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Live LangGraph Ingestion Pipeline
            </h3>
            <span className="text-xs text-slate-500 font-mono">{events.length} Telemetry Events</span>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-2 font-mono text-xs">
            {events.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                Listening for incoming transcripts from Hermes, Claude, Codex, Antigravity, and Browser...
              </div>
            ) : (
              events.map((ev, i) => (
                <div
                  key={i}
                  className="bg-[#05070d] border border-[#15233e] rounded-lg p-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="text-cyan-400 font-bold">[{ev.data?.agentId || 'GATEWAY'}]</span>
                    <span className="text-slate-500">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-slate-300 break-words">
                    {ev.type === 'EVENT_INGESTED' && (
                      <span className="text-amber-300/90">📥 Ingested payload: {ev.data?.preview}</span>
                    )}
                    {ev.type === 'EVENT_DISTILLED' && (
                      <span className="text-emerald-400">
                        ⚡ Distilled (-
                        {((ev.data?.metrics?.compressionRatio || 0) * 100).toFixed(1)}% tokens):{' '}
                        {ev.data?.summary}
                      </span>
                    )}
                    {ev.type === 'RECORD_PURGED' && (
                      <span className="text-red-400 font-semibold">
                        🗑️ Cascade Purged memory record: {ev.data?.id}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Browser Quick-Capture Helper & Manual Ingestion */}
        <div className="space-y-6">
          {/* Zero-Install Bookmarklet Card */}
          <div className="bg-[#0a0f1d] border border-[#15233e] rounded-xl p-5 cyber-glow-emerald">
            <h3 className="text-sm font-semibold text-emerald-400 font-display mb-2 flex items-center gap-1.5">
              <span>⚡</span> Browser Quick-Capture Helper
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Capture web research, ChatGPT, Claude web, or Colab tabs straight to Central Brain with 1 click.
            </p>
            <div className="space-y-2">
              <a
                href={bookmarkletCode}
                onClick={(e) => {
                  e.preventDefault();
                  navigator.clipboard.writeText(bookmarkletCode);
                  alert('Copied bookmarklet script! Create a browser bookmark and paste this as the URL.');
                }}
                className="block text-center text-xs font-semibold py-2 px-3 rounded-lg bg-emerald-950/80 border border-emerald-600/80 text-emerald-300 hover:bg-emerald-900 transition-colors cursor-pointer"
              >
                📋 Copy Bookmarklet Script
              </a>
              <p className="text-[10px] text-slate-500 text-center font-mono">
                Direct endpoint: POST http://localhost:8200/api/ingest/browser
              </p>
            </div>
          </div>

          {/* Manual Ingestion Tester */}
          <div className="bg-[#0a0f1d] border border-[#15233e] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 font-display mb-3">
              Manual Ingestion Tester
            </h3>
            <form onSubmit={handleTestSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Target Agent</label>
                <select
                  value={testAgent}
                  onChange={(e) => setTestAgent(e.target.value)}
                  className="w-full bg-[#05070d] border border-[#1a2c4e] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="Browser">Browser</option>
                  <option value="Hermes">Hermes</option>
                  <option value="Claude">Claude</option>
                  <option value="Codex">Codex</option>
                  <option value="Antigravity">Antigravity</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Activity Payload</label>
                <textarea
                  rows={3}
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                  placeholder="Paste log, prompt, or technical decision to test distillation..."
                  className="w-full bg-[#05070d] border border-[#1a2c4e] rounded-lg p-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !testPayload.trim()}
                className="w-full py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors"
              >
                {isSubmitting ? 'Compressing via LangGraph...' : 'Pipelining Event →'}
              </button>

              {toastMsg && (
                <div className="text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800 rounded p-2 text-center">
                  {toastMsg}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
