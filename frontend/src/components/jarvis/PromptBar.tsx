import React, { useState, useRef, useEffect } from "react";
import { Send, Square, Terminal, Volume2, Mic, MicOff, Sparkles, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { LiveVoiceOrbit } from "./LiveVoiceOrbit";

interface PromptBarProps {
  onSend: (text: string) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
  voiceListening?: boolean;
  voiceThinking?: boolean;
  voiceSpeaking?: boolean;
  voiceTranscript?: string;
  voiceAudioLevel?: number;
  onToggleMic?: () => void;
  onInterruptSpeech?: () => void;
  currentPersona?: string;
}

const VOICE_DIRECTIVES = [
  {
    label: "System Thermals",
    prompt: "inspect hardware thermals, CPU temperatures, and fan speeds",
  },
  {
    label: "Delegate to Hermes",
    prompt: "delegate to hermes: research zero-trust multi-agent consensus protocols",
  },
  {
    label: "Delegate to Ultron",
    prompt:
      "delegate to ultron: execute deep kernel diagnostic scan and inspect hardware integrity",
  },
  {
    label: "Delegate to Prime",
    prompt: "delegate to prime: implement autonomous Rust UDS socket channel with zero-copy",
  },
  {
    label: "Adjust Volume",
    prompt: "set master ALSA audio volume to 75%",
  },
  {
    label: "Diagnostic Scan",
    prompt: "run full system diagnostic across all active swarm agents",
  },
];

export function PromptBar({
  onSend,
  onStop,
  isStreaming = false,
  disabled = false,
  voiceListening = true,
  voiceThinking = false,
  voiceSpeaking = false,
  voiceTranscript = "",
  voiceAudioLevel = 0,
  onToggleMic,
  onInterruptSpeech,
  currentPersona = "Puck",
}: PromptBarProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isStreaming) {
      onStop?.();
      return;
    }
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleDirectiveClick = (prompt: string) => {
    if (disabled || isStreaming) return;
    onSend(prompt);
  };

  return (
    <div className="w-full space-y-2">
      {/* Quick Voice Chip Directives Rail */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-muted-foreground shrink-0 uppercase tracking-wider">
          <Terminal className="h-3 w-3 text-cyan-hud" />
          Directives:
        </span>
        {VOICE_DIRECTIVES.map((d, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleDirectiveClick(d.prompt)}
            disabled={disabled || isStreaming}
            className="neu-sm shrink-0 rounded-xl px-2.5 py-1 text-[11px] font-mono text-muted-foreground hover:text-cyan-hud transition-colors border border-hairline hover:border-cyan-hud/40 active:scale-95 disabled:opacity-50"
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Main Input Directive Deck */}
      <div className="glass relative flex items-end gap-2.5 rounded-2xl border border-hairline bg-[oklch(0.20_0.012_256/_88%)] p-2 shadow-2xl backdrop-blur-2xl transition-all focus-within:border-cyan-hud/50">
        {/* Tactile Mini Orbit Mic Trigger */}
        <div className="relative shrink-0 flex items-center justify-center p-0.5">
          <LiveVoiceOrbit
            size="sm"
            isListening={voiceListening}
            isThinking={voiceThinking || isStreaming}
            isSpeaking={voiceSpeaking}
            audioLevel={voiceAudioLevel}
            transcript={voiceTranscript}
            onClick={voiceSpeaking ? onInterruptSpeech : onToggleMic}
          />
        </div>

        {/* Text Directive Area */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Speak directive aloud, or type tactical command... (Enter to send)"
          rows={1}
          disabled={disabled}
          className="max-h-32 min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-2 text-xs sm:text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none font-mono"
        />

        {/* Action Controls */}
        <div className="flex shrink-0 items-center gap-1.5 pb-0.5">
          {/* Active Persona Pill */}
          <div className="hidden lg:flex items-center gap-1 rounded-xl border border-hairline bg-white/5 px-2.5 py-2 font-mono text-[10px] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-cyan-hud" />
            <span>{currentPersona}</span>
          </div>

          {/* Send / Stop Button */}
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              title="Halt generation"
              aria-label="Halt generation"
              className="key grid h-10 w-10 place-items-center rounded-xl text-amber-hud border border-amber-hud/40 glow-ring"
            >
              <Square className="h-4 w-4 fill-amber-hud" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!input.trim() || disabled}
              title="Transmit directive (Enter)"
              aria-label="Transmit directive"
              className={cn(
                "key grid h-10 w-10 place-items-center rounded-xl transition-all",
                input.trim()
                  ? "text-cyan-hud border-cyan-hud/40 glow-ring scale-100"
                  : "text-muted-foreground/30 cursor-not-allowed",
              )}
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
