import React, { useState } from 'react';
import { 
  Globe, 
  Copy, 
  Check, 
  Bookmark, 
  ExternalLink, 
  Send, 
  Sparkles, 
  ShieldCheck, 
  Zap,
  HelpCircle,
  MousePointerClick
} from 'lucide-react';

interface BrowserCaptureGuideProps {
  onTestIngest: (url: string, title: string, text: string) => Promise<void>;
}

export const BrowserCaptureGuide: React.FC<BrowserCaptureGuideProps> = ({ onTestIngest }) => {
  const [copied, setCopied] = useState(false);
  const [testUrl, setTestUrl] = useState('https://github.com/langchain-ai/langgraphjs');
  const [testTitle, setTestTitle] = useState('LangGraph JS Documentation');
  const [testText, setTestText] = useState('LangGraph is a library for building resilient language agents as graphs with state persistence and human-in-the-loop capabilities.');
  const [isSending, setIsSending] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  const bookmarkletCode = `javascript:(function(){const t=document.title,u=window.location.href,s=window.getSelection?window.getSelection().toString():'',b=document.body?document.body.innerText.slice(0,3000):'';fetch('http://localhost:8200/api/ingest/browser',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:t,url:u,selectedText:s,rawSessionText:b,toolName:'Browser Quick-Capture'})}).then(r=>r.json()).then(()=>{const o=document.createElement('div');o.innerText='⚡ [Central Brain] Ingested!';o.style.position='fixed';o.style.bottom='20px';o.style.right='20px';o.style.backgroundColor='#065f46';o.style.color='#34d399';o.style.padding='10px 16px';o.style.borderRadius='8px';o.style.zIndex='999999';o.style.fontFamily='monospace';document.body.appendChild(o);setTimeout(()=>o.remove(),2000);}).catch(()=>alert('❌ [Central Brain] Failed to reach http://localhost:8200'));})();`;

  const handleCopy = () => {
    navigator.clipboard.writeText(bookmarkletCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleLiveTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    await onTestIngest(testUrl, testTitle, testText);
    setIsSending(false);
    setTestSuccess(true);
    setTimeout(() => setTestSuccess(false), 4000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-[#0a0f1d] border border-cyan-500/30 rounded-2xl p-6 shadow-xl cyber-glow">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 font-display uppercase tracking-wide">
              Browser Quick-Capture Integration
            </h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Seamlessly feed web research, ChatGPT prompts, Claude web chats, or Colab logs into your Central Brain without installing any third-party browser extensions.
            </p>
          </div>
        </div>
      </div>

      {/* 3-Step Setup Guide */}
      <div className="bg-[#0a0f1d] border border-[#162342] rounded-2xl p-6 shadow-lg space-y-5">
        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
          <MousePointerClick className="w-4 h-4 text-cyan-400" />
          Zero-Install Setup in 30 Seconds
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-[#060a14] border border-[#162342] rounded-xl p-4 space-y-2">
            <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-xs">
              1
            </div>
            <h4 className="font-semibold text-slate-200">Copy Bookmarklet Script</h4>
            <p className="text-slate-400 leading-relaxed">
              Click the button below to copy the lightweight JavaScript bookmarklet code to your clipboard.
            </p>
          </div>

          <div className="bg-[#060a14] border border-[#162342] rounded-xl p-4 space-y-2">
            <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-xs">
              2
            </div>
            <h4 className="font-semibold text-slate-200">Create a Bookmark</h4>
            <p className="text-slate-400 leading-relaxed">
              In Chrome, Brave, or Firefox, create a bookmark named <strong className="text-slate-200">"⚡ Ingest to Brain"</strong> and paste the copied code into the URL field.
            </p>
          </div>

          <div className="bg-[#060a14] border border-[#162342] rounded-xl p-4 space-y-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
              3
            </div>
            <h4 className="font-semibold text-slate-200">Click to Ingest</h4>
            <p className="text-slate-400 leading-relaxed">
              Whenever you're reading a doc, ChatGPT answer, or Colab result, click the bookmark to ingest it instantly!
            </p>
          </div>
        </div>

        {/* Copy Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>✓ Bookmarklet Code Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy 1-Click Bookmarklet Code</span>
              </>
            )}
          </button>

          <span className="text-xs text-slate-400">
            API Endpoint: <code className="text-cyan-400 font-mono">POST http://localhost:8200/api/ingest/browser</code>
          </span>
        </div>
      </div>

      {/* Live Ingestion Simulator */}
      <div className="bg-[#0a0f1d] border border-[#162342] rounded-2xl p-6 shadow-lg space-y-4">
        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-400" />
          Test Browser Ingestion Gateway (Live Simulator)
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Simulate what happens when you click the bookmarklet on a real web page:
        </p>

        <form onSubmit={handleLiveTest} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-medium block mb-1">Web Page Title</label>
              <input
                type="text"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                className="w-full bg-[#060a14] border border-[#1a2c4e] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-slate-300 font-medium block mb-1">Web URL</label>
              <input
                type="text"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                className="w-full bg-[#060a14] border border-[#1a2c4e] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500 font-mono text-[11px]"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-medium block mb-1">Selected Highlight / Page Content</label>
            <textarea
              rows={3}
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              className="w-full bg-[#060a14] border border-[#1a2c4e] rounded-xl p-3 text-slate-100 focus:outline-none focus:border-cyan-500 leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="submit"
              disabled={isSending}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? 'Sending to Gateway...' : 'Simulate Browser Ingestion'}</span>
            </button>

            {testSuccess && (
              <span className="text-emerald-400 font-semibold text-xs flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-4 h-4" /> Ingested & Distilled into Ledger!
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Security & FAQ Card */}
      <div className="bg-[#0a0f1d] border border-[#162342] rounded-2xl p-6 shadow-lg space-y-3 text-xs">
        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          Privacy & Sovereign Guarantees
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-400 leading-relaxed pt-1">
          <div>
            <strong className="text-slate-200 block mb-0.5">100% Local & Sovereign</strong>
            Data captured via the bookmarklet never leaves your Linux machine. It goes straight to <code className="text-cyan-400 font-mono">http://localhost:8200</code>.
          </div>
          <div>
            <strong className="text-slate-200 block mb-0.5">Zero Sensitive Form Data</strong>
            The bookmarklet only reads the page title, URL, and whatever text you highlight on screen. It does not touch cookies, passwords, or inputs.
          </div>
        </div>
      </div>
    </div>
  );
};
