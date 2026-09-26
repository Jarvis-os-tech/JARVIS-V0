import React, { useState } from 'react';
import { Terminal, Send, X } from 'lucide-react';

interface CommandInputBarProps {
  onSendPrompt: (prompt: string) => void;
  disabled?: boolean;
  isProcessing?: boolean;
}

export const CommandInputBar: React.FC<CommandInputBarProps> = ({
  onSendPrompt,
  disabled = false,
  isProcessing = false
}) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || disabled) return;

    onSendPrompt(trimmed);
    setInput('');
  };

  return (
    <div className="w-full max-w-xl mx-auto mt-4 px-2 sm:px-0 flex flex-col items-center z-20">
      {/* Cybernetic Input Form Container */}
      <form
        onSubmit={handleSubmit}
        className="w-full relative group"
      >
        {/* HUD Tactical Corner Accents */}
        <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-400/70 pointer-events-none rounded-tl-sm transition-all group-focus-within:border-cyan-300 group-focus-within:scale-110" />
        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-cyan-400/70 pointer-events-none rounded-tr-sm transition-all group-focus-within:border-cyan-300 group-focus-within:scale-110" />
        <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-cyan-400/70 pointer-events-none rounded-bl-sm transition-all group-focus-within:border-cyan-300 group-focus-within:scale-110" />
        <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-cyan-400/70 pointer-events-none rounded-br-sm transition-all group-focus-within:border-cyan-300 group-focus-within:scale-110" />

        {/* Input Bar Shell */}
        <div className="flex items-center gap-2.5 bg-slate-950/85 backdrop-blur-2xl border border-cyan-500/35 rounded-2xl px-4 py-2 shadow-[0_0_30px_rgba(6,182,212,0.12)] transition-all duration-300 focus-within:border-cyan-400 focus-within:shadow-[0_0_35px_rgba(6,182,212,0.28)]">
          {/* Terminal / HUD Prefix */}
          <div className="flex items-center gap-1.5 shrink-0 select-none">
            <Terminal className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="font-mono text-xs font-bold text-cyan-400/80 hidden sm:inline tracking-wider">
              COMMAND &gt;
            </span>
          </div>

          {/* Text Input */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={disabled}
            placeholder={
              isProcessing
                ? 'J.A.R.V.I.S. is processing directive...'
                : 'Transmit directive or query... (Press Enter ↵)'
            }
            className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none font-mono py-1 disabled:opacity-50"
          />

          {/* Clear Button */}
          {input.length > 0 && (
            <button
              type="button"
              onClick={() => setInput('')}
              className="p-1 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800/60 transition-colors"
              title="Clear input"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Transmit Action Button */}
          <button
            type="submit"
            disabled={!input.trim() || disabled}
            className={`p-2 rounded-xl flex items-center justify-center transition-all ${
              input.trim() && !disabled
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-bold hover:scale-105 shadow-[0_0_20px_rgba(6,182,212,0.5)] cursor-pointer'
                : 'bg-slate-900/70 text-slate-600 border border-slate-800/80 cursor-not-allowed'
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
