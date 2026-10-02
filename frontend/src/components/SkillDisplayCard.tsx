import React, { useState } from 'react';
import { SkillDisplayCard as SkillCardType } from '../types';
import {
  Bot,
  Terminal,
  Sparkles,
  X,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Activity,
  Code2,
  FileText,
  CloudSun,
  Newspaper
} from 'lucide-react';

interface SkillDisplayCardProps {
  card: SkillCardType;
  onDismiss?: () => void;
}

export const SkillDisplayCard: React.FC<SkillDisplayCardProps> = ({
  card,
  onDismiss,
}) => {
  const [copied, setCopied] = useState(false);

  if (!card) return null;

  const { type, title, data } = card;

  const handleCopyText = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. Hermes Sub-Agent Response Card
  if (type === 'hermes_response') {
    const { text, prompt, sessionId, durationMs, error } = data || {};
    return (
      <div className="w-full max-w-xl mx-auto my-3 rounded-2xl bg-gradient-to-br from-slate-950 via-purple-950/40 to-slate-950 border border-purple-500/40 p-4 text-slate-100 shadow-2xl backdrop-blur-md animate-fadeIn">
        <div className="flex items-center justify-between pb-2.5 border-b border-purple-500/20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-300">
                Hermes Sub-Agent Response
              </span>
              <h3 className="text-xs text-slate-200 font-medium truncate max-w-xs" title={title}>
                {title || 'Hermes Reasoning Output'}
              </h3>
            </div>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Delegated Prompt */}
        {prompt && (
          <div className="my-2.5 rounded-xl bg-slate-900/80 border border-purple-500/20 p-2.5 font-mono">
            <div className="flex items-center justify-between gap-1.5 text-[10px] uppercase tracking-wider text-purple-300/80 mb-1">
              <span className="flex items-center gap-1">
                <Terminal className="w-3 h-3 text-purple-400" />
                <span>Directive Sent to Hermes</span>
              </span>
              {durationMs !== undefined && (
                <span className="text-slate-400 text-[10px]">
                  {durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`}
                </span>
              )}
            </div>
            <div className="text-xs leading-relaxed text-slate-200 line-clamp-3">
              {prompt}
            </div>
          </div>
        )}

        {/* Output Content */}
        <div className="relative my-2.5 rounded-xl bg-slate-950/90 border border-slate-800 p-3">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800/80">
            <span className="text-[10px] font-mono text-purple-300/70">Synthesized Output</span>
            <button
              onClick={() => handleCopyText(text || '')}
              className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/30 text-purple-300 transition-colors"
            >
              {copied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="text-xs leading-relaxed whitespace-pre-wrap text-slate-200 max-h-72 overflow-y-auto pr-1 font-mono">
            {text || error || 'No response recorded.'}
          </div>
        </div>

        {/* Footer & Session ID */}
        <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-purple-500/10 text-[10px] font-mono text-purple-300/70">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>Autonomous Sub-Agent Execution</span>
          </div>
          {sessionId && (
            <span
              className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/30 text-purple-300 text-[10px]"
              title={`Hermes session ID: ${sessionId}`}
            >
              sess: {sessionId.slice(0, 16)}
            </span>
          )}
        </div>
      </div>
    );
  }

  // 2. Generic Skill Display Card Fallback
  return (
    <div className="w-full max-w-xl mx-auto my-3 rounded-2xl bg-slate-950/95 border border-cyan-500/30 p-4 text-slate-100 shadow-xl backdrop-blur-md animate-fadeIn">
      <div className="flex items-center justify-between pb-2.5 border-b border-cyan-500/20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-300">
              Task Result
            </span>
            <h3 className="text-xs text-slate-200 font-medium truncate max-w-xs">{title}</h3>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 rounded-md text-slate-400 hover:text-white transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="my-2.5 text-xs text-slate-300 max-h-60 overflow-y-auto whitespace-pre-wrap font-mono p-2 rounded-lg bg-slate-900/60 border border-slate-800">
        {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
      </div>
    </div>
  );
};
