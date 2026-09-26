import React, { useState, useEffect } from 'react';
import { Key, AlertTriangle, ExternalLink, RefreshCw, Volume2, CheckCircle2, Copy, Check } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  onEnableDemoMode: () => void;
  isDemoMode: boolean;
  errorMessage?: string | null;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onRetry,
  onEnableDemoMode,
  isDemoMode,
  errorMessage,
}) => {
  const [healthData, setHealthData] = useState<{
    hasApiKey: boolean;
  } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [copied, setCopied] = useState(false);

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealthData(data);
    } catch (e) {
      console.error('Health check failed:', e);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkHealth();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://aistudio.google.com/app/apikey');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700/60 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden text-zinc-100">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500" />

        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Gemini API Key Authentication</h2>
              <p className="text-xs text-zinc-400">Real-time Multimodal Live API Voice Engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Current Key Diagnostic Details */}
        <div className="mb-5 p-4 rounded-2xl bg-zinc-950/70 border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Key Status:</span>
            {healthData ? (
              healthData.hasApiKey ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Key is configured in environment
                </span>
              ) : (
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Key not set in Secrets
                </span>
              )
            ) : (
              <span className="text-zinc-400">Checking...</span>
            )}
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs leading-relaxed">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Actionable Instructions */}
        <div className="space-y-3 mb-6 text-xs text-zinc-300">
          <p className="font-semibold text-zinc-200">How to fix in 30 seconds:</p>
          <ol className="space-y-2 list-decimal list-inside text-zinc-300">
            <li className="leading-relaxed">
              Obtain your free Gemini API key from{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:text-indigo-300 underline font-medium inline-flex items-center gap-0.5"
              >
                aistudio.google.com/app/apikey <ExternalLink className="w-3 h-3 inline" />
              </a>{' '}
              (A valid key starts with <code className="bg-zinc-800 px-1 py-0.5 rounded text-amber-300 font-mono">AIzaSy...</code>).
            </li>
            <li className="leading-relaxed">
              Open the AI Studio <strong>Settings &gt; Secrets</strong> menu (gear icon in the top header).
            </li>
            <li className="leading-relaxed">
              Paste your key into <code className="bg-zinc-800 px-1 py-0.5 rounded text-emerald-300 font-mono">GEMINI_API_KEY</code> and save.
            </li>
            <li className="leading-relaxed">
              Click <strong>Test &amp; Reconnect</strong> below.
            </li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => {
              checkHealth();
              onRetry();
              onClose();
            }}
            disabled={isChecking}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 text-white font-semibold text-xs hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            Test &amp; Reconnect Live API
          </button>

          <button
            onClick={() => {
              onEnableDemoMode();
              onClose();
            }}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-colors flex items-center justify-center gap-2 border border-white/10"
          >
            <Volume2 className="w-4 h-4 text-emerald-400" />
            {isDemoMode ? 'Continue in Demo Mode' : 'Try Demo Voice Mode'}
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={handleCopyLink}
            className="text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors inline-flex items-center gap-1"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Link copied!' : 'Copy Google AI Studio API Key URL'}
          </button>
        </div>
      </div>
    </div>
  );
};
