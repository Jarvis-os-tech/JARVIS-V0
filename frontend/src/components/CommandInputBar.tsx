import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, X, Sparkles, Layers, Box, Cpu, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { sfx } from '../lib/sfx';

const SUGGESTIONS = [
  { cmd: '/directive rapid status check on all core telemetry', title: 'System Status', icon: Zap },
  { cmd: '/directive review long-term and semantic memory banks', title: 'Memory Review', icon: Cpu },
  { cmd: '/skills npx skills list --installed', title: 'List Skills', icon: Layers },
  { cmd: '/skills npx skills search --query "agent"', title: 'Find Agents', icon: Box },
  { cmd: '/directive run deep security & boundary audit', title: 'Security Audit', icon: Shield },
];

const MODES = [
  { id: 'directive', label: 'DIRECTIVE >', prefix: '', color: 'text-cyan-400 border-cyan-500/30' },
  { id: 'skills', label: 'SKILLS >', prefix: '/skills ', color: 'text-purple-400 border-purple-500/30' },
  { id: 'ceo', label: 'CEO HUD >', prefix: '/ceo ', color: 'text-blue-400 border-blue-500/30' },
];

interface CommandInputBarProps {
  onSendPrompt: (prompt: string) => void;
  disabled?: boolean;
  isProcessing?: boolean;
  themeColor?: string;
}

export const CommandInputBar: React.FC<CommandInputBarProps> = ({
  onSendPrompt,
  disabled = false,
  isProcessing = false,
  themeColor = '#00f0ff',
}) => {
  const [input, setInput] = useState('');
  const [activeMode, setActiveMode] = useState<'directive' | 'skills' | 'ceo'>('directive');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isSkillCommand = input.trim().startsWith('/skill') || activeMode === 'skills';

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

    sfx.playPip(1400);
    onSendPrompt(trimmed);
    setInput('');
    setShowSuggestions(false);
  };

  const handleSelectSuggestion = (cmd: string) => {
    sfx.playPip(1200);
    setInput(cmd);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleModeSwitch = (modeId: 'directive' | 'skills' | 'ceo') => {
    sfx.playPip(1000);
    setActiveMode(modeId);
    const mode = MODES.find(m => m.id === modeId);
    if (mode && mode.prefix && !input.startsWith(mode.prefix)) {
      setInput(mode.prefix);
    }
    inputRef.current?.focus();
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-2 px-2 sm:px-0 flex flex-col items-center z-20 relative select-none">
      {/* Suggestions Floating Panel */}
      {showSuggestions && (
        <Card className="w-full mb-2 border-cyan-500/30 bg-[#09101d]/95 shadow-[0_16px_40px_rgba(0,0,0,0.65),0_0_25px_rgba(0,240,255,0.18)] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/20 px-1">
              <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>Command & Skills Registry</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSuggestions(false)}
                className="text-slate-500 hover:text-slate-300 h-6 w-6 cursor-pointer"
                aria-label="Close suggestions"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="space-y-1">
              {SUGGESTIONS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={idx}
                    variant="outline"
                    className={cn(
                      'w-full text-left justify-between px-3 py-2 rounded-xl transition-all group active:scale-[0.98] cursor-pointer',
                      'bg-slate-900/60 hover:bg-cyan-950/60 border-slate-800/80 hover:border-cyan-500/50'
                    )}
                    onClick={() => handleSelectSuggestion(item.cmd)}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <Icon className="w-3.5 h-3.5 text-cyan-400/70 group-hover:text-cyan-300 shrink-0" />
                      <span className="font-mono text-xs text-slate-200 group-hover:text-cyan-200 truncate">
                        {item.cmd}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 group-hover:text-cyan-300 shrink-0 font-mono tracking-wider ml-2 px-1.5 py-0.5 rounded bg-slate-800/50 border border-slate-700/50">
                      {item.title}
                    </span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cybernetic Input Form Container */}
      <form onSubmit={handleSubmit} className="w-full relative group">
        {/* HUD Corner Reticles */}
        <div className="corner-bracket-tl" />
        <div className="corner-bracket-tr" />
        <div className="corner-bracket-bl" />
        <div className="corner-bracket-br" />

        {/* Input Bar Shell */}
        <div
          className={cn(
            'flex items-center gap-2.5 bg-[#0a1120]/90 backdrop-blur-2xl px-3.5 py-2 rounded-2xl border transition-all duration-300',
            isSkillCommand
              ? 'border-purple-500/50 shadow-[0_10px_35px_rgba(0,0,0,0.5),0_0_25px_rgba(168,85,247,0.2)]'
              : 'border-cyan-500/35 shadow-[0_10px_35px_rgba(0,0,0,0.5),0_0_25px_rgba(0,240,255,0.14)]'
          )}
        >
          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 shrink-0">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleModeSwitch(m.id as any)}
                className={cn(
                  'px-2 py-1 rounded-lg text-[10px] font-mono font-bold tracking-wider transition-all cursor-pointer',
                  activeMode === m.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                )}
              >
                {m.label}
              </button>
            ))}
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
                : 'Transmit directive or command (Press Enter ↵)...'
            }
            className="w-full bg-transparent text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none font-mono py-1 disabled:opacity-50"
          />

          {/* Clear Button */}
          {input.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setInput('');
                setShowSuggestions(false);
              }}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Clear input"
              disabled={disabled}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Transmit Action Button */}
          <button
            type="submit"
            disabled={!input.trim() || disabled}
            className={cn(
              'p-2 sm:px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer font-mono font-bold text-xs',
              input.trim() && !disabled
                ? isSkillCommand
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)]'
                  : 'bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 text-slate-950 shadow-[0_0_20px_rgba(0,240,255,0.5)]'
                : 'bg-slate-900/80 text-slate-600 border border-slate-800/80 cursor-not-allowed'
            )}
            title="Transmit directive"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">SEND</span>
          </button>
        </div>

        {/* Quick Hotkey Indicator Row */}
        <div className="flex items-center justify-center gap-3 mt-2 text-[9.5px] font-mono text-slate-400">
          <span>HOTKEYS:</span>
          <span className="hover:text-cyan-300 transition-colors cursor-pointer" onClick={() => onSendPrompt("Rapid status check on all core telemetry.")}>[1] Status</span>
          <span className="hover:text-cyan-300 transition-colors cursor-pointer" onClick={() => onSendPrompt("Review memory banks.")}>[2] Memory</span>
          <span className="hover:text-cyan-300 transition-colors cursor-pointer" onClick={() => onSendPrompt("Run deep architecture & latency audit.")}>[3] Audit</span>
          <span className="hover:text-cyan-300 transition-colors cursor-pointer" onClick={() => onSendPrompt("Compute next milestone roadmap.")}>[4] Roadmap</span>
        </div>
      </form>
    </div>
  );
};

export default CommandInputBar;