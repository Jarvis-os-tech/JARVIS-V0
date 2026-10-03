import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, X, Sparkles, Layers, Box, Cpu } from 'lucide-react';

interface CommandInputBarProps {
  onSendPrompt: (prompt: string) => void;
  disabled?: boolean;
  isProcessing?: boolean;
}

const SKILL_SUGGESTIONS = [
  {
    cmd: '/skills npx skills add typesafe-ai/skills --skill typesafe-ai',
    title: 'CLI Skill Add',
    desc: 'Install specific skill via skills CLI'
  },
  {
    cmd: '/skills add typesafe-ai/skills',
    title: 'Add Package',
    desc: 'Install package & share to all agents'
  },
  {
    cmd: '/skills https://github.com/vercel-labs/agent-skills',
    title: 'Git Repo Ingest',
    desc: 'Clone and parse all skills from Git repository'
  },
  {
    cmd: '/skills list',
    title: 'List Matrix',
    desc: 'View all active skills shared across agents'
  },
  {
    cmd: '/skills remove typesafe-ai',
    title: 'Remove Skill',
    desc: 'Purge an installed skill from the system'
  }
];

export const CommandInputBar: React.FC<CommandInputBarProps> = ({
  onSendPrompt,
  disabled = false,
  isProcessing = false
}) => {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isSkillCommand = input.trim().startsWith('/skill') || input.trim().startsWith('/skills');

  useEffect(() => {
    if (input.startsWith('/')) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || disabled) return;

    onSendPrompt(trimmed);
    setInput('');
    setShowSuggestions(false);
  };

  const handleSelectSuggestion = (cmd: string) => {
    setInput(cmd);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div className="w-full max-w-xl mx-auto mt-4 px-2 sm:px-0 flex flex-col items-center z-20 relative">
      {/* Suggestions Floating Tactical HUD Panel */}
      {showSuggestions && (
        <div className="w-full mb-2 bg-[#09101d]/95 border border-cyan-500/40 rounded-2xl p-3 shadow-[0_16px_40px_rgba(0,0,0,0.65),0_0_25px_rgba(0,240,255,0.18)] backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/20 px-1">
            <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>J.A.R.V.I.S. Command &amp; Skills Matrix</span>
            </div>
            <button
              type="button"
              onClick={() => setShowSuggestions(false)}
              className="text-slate-500 hover:text-slate-300 text-xs px-1.5 py-0.5 rounded hover:bg-slate-800/50 transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1">
            {SKILL_SUGGESTIONS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSuggestion(item.cmd)}
                className="w-full text-left flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/60 hover:bg-cyan-950/60 border border-slate-800/80 hover:border-cyan-500/50 transition-all group active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <Box className="w-3.5 h-3.5 text-cyan-400/70 group-hover:text-cyan-300 shrink-0" />
                  <span className="font-mono text-xs text-slate-200 group-hover:text-cyan-200 truncate">
                    {item.cmd}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 group-hover:text-cyan-300 shrink-0 font-mono tracking-wider ml-2 px-1.5 py-0.5 rounded bg-slate-800/50 border border-slate-700/50">
                  {item.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Cybernetic Input Form Container */}
      <form
        onSubmit={handleSubmit}
        className="w-full relative group"
      >
        {/* HUD Tactical Corner Accents */}
        <div className={`absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 pointer-events-none rounded-tl-sm transition-all group-focus-within:scale-110 group-focus-within:drop-shadow-[0_0_6px_rgba(0,240,255,0.8)] ${isSkillCommand ? 'border-purple-400 group-focus-within:border-purple-300' : 'border-cyan-400/80 group-focus-within:border-cyan-300'}`} />
        <div className={`absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 pointer-events-none rounded-tr-sm transition-all group-focus-within:scale-110 group-focus-within:drop-shadow-[0_0_6px_rgba(0,240,255,0.8)] ${isSkillCommand ? 'border-purple-400 group-focus-within:border-purple-300' : 'border-cyan-400/80 group-focus-within:border-cyan-300'}`} />
        <div className={`absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 pointer-events-none rounded-bl-sm transition-all group-focus-within:scale-110 group-focus-within:drop-shadow-[0_0_6px_rgba(0,240,255,0.8)] ${isSkillCommand ? 'border-purple-400 group-focus-within:border-purple-300' : 'border-cyan-400/80 group-focus-within:border-cyan-300'}`} />
        <div className={`absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 pointer-events-none rounded-br-sm transition-all group-focus-within:scale-110 group-focus-within:drop-shadow-[0_0_6px_rgba(0,240,255,0.8)] ${isSkillCommand ? 'border-purple-400 group-focus-within:border-purple-300' : 'border-cyan-400/80 group-focus-within:border-cyan-300'}`} />

        {/* Input Bar Shell */}
        <div className={`flex items-center gap-3 bg-[#0a1120]/90 backdrop-blur-2xl border rounded-2xl px-4 py-2.5 transition-all duration-300 ${
          isSkillCommand
            ? 'border-purple-500/50 shadow-[0_10px_35px_rgba(0,0,0,0.5),0_0_25px_rgba(168,85,247,0.2)] focus-within:border-purple-400 focus-within:shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_35px_rgba(168,85,247,0.35)]'
            : 'border-cyan-500/35 shadow-[0_10px_35px_rgba(0,0,0,0.5),0_0_25px_rgba(0,240,255,0.14)] focus-within:border-cyan-400 focus-within:shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_35px_rgba(0,240,255,0.3)]'
        }`}>
          {/* Terminal / HUD Prefix */}
          <div className="flex items-center gap-1.5 shrink-0 select-none">
            {isSkillCommand ? (
              <>
                <Layers className="w-4 h-4 text-purple-400 animate-pulse" />
                <span className="font-mono text-xs font-bold text-purple-400 hidden sm:inline tracking-wider">
                  SKILLS &gt;
                </span>
              </>
            ) : (
              <>
                <Terminal className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span className="font-mono text-xs font-bold text-cyan-400/90 hidden sm:inline tracking-wider">
                  DIRECTIVE &gt;
                </span>
              </>
            )}
          </div>

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => {
              if (input.startsWith('/')) setShowSuggestions(true);
            }}
            disabled={disabled}
            placeholder={
              isProcessing
                ? 'J.A.R.V.I.S. is processing directive...'
                : 'Transmit directive or /skills command... (Press Enter ↵)'
            }
            className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none font-mono py-1 disabled:opacity-50"
          />

          {/* Clear Button */}
          {input.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setInput('');
                setShowSuggestions(false);
              }}
              className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800/60 transition-colors"
              title="Clear input"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Transmit Action Button */}
          <button
            type="submit"
            disabled={!input.trim() || disabled}
            className={`p-2.5 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
              input.trim() && !disabled
                ? isSkillCommand
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold hover:scale-105 shadow-[0_0_20px_rgba(168,85,247,0.5)] cursor-pointer'
                  : 'bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 text-slate-950 font-black hover:scale-105 shadow-[0_0_22px_rgba(0,240,255,0.55)] cursor-pointer'
                : 'bg-slate-900/80 text-slate-600 border border-slate-800/80 cursor-not-allowed'
            }`}
            title="Transmit directive"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
