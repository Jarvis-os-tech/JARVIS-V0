import React, { useMemo } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  Square,
  Sparkles,
  Radio,
  MessageSquare,
  Maximize2,
} from "lucide-react";
import { LiveVoiceOrbit } from "./LiveVoiceOrbit";
import { useJarvis } from "./JarvisProvider";
import { cn } from "@/lib/utils";

interface VoiceStageProps {
  className?: string;
  onOpenModal?: () => void;
}

export function VoiceStage({ className, onOpenModal }: VoiceStageProps) {
  const {
    voiceListening,
    voiceThinking,
    voiceSpeaking,
    voiceTranscript,
    voiceLastSpoken,
    voiceAudioLevel,
    voiceError,
    toggleVoiceMic,
    interruptVoiceSpeech,
    setVoiceModalOpen,
  } = useJarvis();

  // Status configuration
  const stageStatus = useMemo(() => {
    if (voiceThinking) {
      return {
        mode: "thinking",
        pillText: "NEURAL REASONING · SYNTHESIZING",
        subText: "Processing directive through cognitive graph",
        pillColor: "border-amber-hud/40 bg-amber-hud/10 text-amber-hud",
        glowColor: "rgba(251, 191, 36, 0.35)",
        dotColor: "bg-amber-hud",
      };
    }
    if (voiceSpeaking) {
      return {
        mode: "speaking",
        pillText: "TRANSMITTING VOCAL AUDIO",
        subText: "Synthesizing vocal response via Friday neural engine",
        pillColor: "border-violet-hud/40 bg-violet-hud/10 text-violet-hud",
        glowColor: "rgba(167, 139, 250, 0.4)",
        dotColor: "bg-violet-hud",
      };
    }
    if (voiceListening) {
      return {
        mode: "listening",
        pillText: "LISTENING CONTINUOUSLY · SPEAK FREELY",
        subText: "Zero-push voice loop active · speak naturally",
        pillColor: "border-cyan-hud/40 bg-cyan-hud/10 text-cyan-hud",
        glowColor: "rgba(45, 212, 235, 0.35)",
        dotColor: "bg-cyan-hud",
      };
    }
    return {
      mode: "muted",
      pillText: "STANDBY · MICROPHONE MUTED",
      subText: "Tap microphone or press space to enable voice loop",
      pillColor: "border-muted-foreground/30 bg-muted-foreground/10 text-muted-foreground",
      glowColor: "rgba(113, 113, 122, 0.15)",
      dotColor: "bg-muted-foreground",
    };
  }, [voiceListening, voiceThinking, voiceSpeaking]);

  const handleOpenFullscreen = () => {
    if (onOpenModal) {
      onOpenModal();
    } else {
      setVoiceModalOpen(true);
    }
  };

  // Equalizer heights with balanced frequency curve
  const eqFrequencies = [
    0.35, 0.6, 0.85, 0.7, 0.95, 0.5, 0.8, 1.0, 0.75, 0.9, 0.6, 0.85, 0.45, 0.7, 0.55, 0.35,
  ];

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-between rounded-3xl border border-hairline overflow-hidden p-6 sm:p-8 backdrop-blur-2xl transition-all duration-300",
        "bg-[oklch(0.20_0.012_256/_70%)] shadow-[0_20px_60px_oklch(0_0_0/50%)]",
        className,
      )}
    >
      {/* Background Holographic Atmosphere */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 50% 40%, ${stageStatus.glowColor} 0%, transparent 75%)`,
          opacity: voiceListening || voiceSpeaking || voiceThinking ? 0.9 : 0.2,
        }}
      />

      {/* Cyber Grid Lines Overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* Top HUD Status Row */}
      <div className="relative z-10 flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="neu-inset grid h-7 w-7 place-items-center rounded-lg text-cyan-hud">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
          </span>
          <div className="flex flex-col">
            <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-cyan-hud">
              HOLOGRAPHIC RECEPTOR
            </span>
            <span className="font-mono text-[9px] text-muted-foreground">
              MK-VII CONTINUOUS LOOP
            </span>
          </div>
        </div>

        {/* Maximize to full modal button */}
        <button
          type="button"
          onClick={handleOpenFullscreen}
          title="Fullscreen Holographic Voice Orbit"
          aria-label="Fullscreen Holographic Voice Orbit"
          className="key flex items-center gap-1.5 rounded-xl border border-hairline px-2.5 py-1 text-xs text-muted-foreground transition hover:text-cyan-hud hover:border-cyan-hud/40"
        >
          <Maximize2 className="h-3 w-3" />
          <span className="hidden sm:inline font-mono text-[10px]">EXPAND HUD</span>
        </button>
      </div>

      {/* Centerpiece: Hero Arc Reactor Voice Orbit */}
      <div className="relative z-10 my-4 sm:my-6 flex flex-col items-center">
        <div className="relative">
          <LiveVoiceOrbit
            size="lg"
            isListening={voiceListening}
            isThinking={voiceThinking}
            isSpeaking={voiceSpeaking}
            audioLevel={voiceAudioLevel}
            onClick={toggleVoiceMic}
          />
        </div>

        {/* Luminous State Pill */}
        <div className="mt-4 flex flex-col items-center gap-1.5 text-center">
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 backdrop-blur-md transition-colors duration-300",
              stageStatus.pillColor,
            )}
          >
            <span className="relative flex h-2 w-2">
              {(voiceListening || voiceSpeaking || voiceThinking) && (
                <span
                  className={cn(
                    "absolute inline-flex h-full w-full rounded-full animate-ping opacity-75",
                    stageStatus.dotColor,
                  )}
                />
              )}
              <span
                className={cn("relative inline-flex rounded-full h-2 w-2", stageStatus.dotColor)}
              />
            </span>
            <span className="font-mono text-[11px] font-extrabold tracking-wider">
              {stageStatus.pillText}
            </span>
          </div>
          <p className="font-mono text-[11px] text-muted-foreground">{stageStatus.subText}</p>
        </div>

        {/* Dynamic Equalizer Spectrum Bars */}
        <div className="mt-4 flex items-end justify-center gap-1 h-7 px-4 py-1">
          {eqFrequencies.map((weight, i) => {
            const activeLevel =
              voiceListening || voiceSpeaking ? Math.max(0.12, voiceAudioLevel) * weight : 0.08;
            const barHeight = Math.max(3, Math.min(26, activeLevel * 26));

            return (
              <span
                key={i}
                className={cn(
                  "w-1 sm:w-1.5 rounded-full transition-all duration-75",
                  voiceSpeaking
                    ? "bg-gradient-to-t from-violet-hud/50 to-violet-hud"
                    : voiceThinking
                      ? "bg-gradient-to-t from-amber-hud/50 to-amber-hud"
                      : voiceListening
                        ? "bg-gradient-to-t from-cyan-hud/50 to-cyan-hud"
                        : "bg-muted-foreground/30",
                )}
                style={{ height: `${barHeight}px` }}
              />
            );
          })}
        </div>
      </div>

      {/* Floating Glass HUD Live Transcription Ticker */}
      <div className="relative z-10 w-full max-w-xl">
        {voiceError ? (
          <div className="flex items-center gap-2.5 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-xs text-destructive backdrop-blur-md">
            <Radio className="h-4 w-4 shrink-0 text-destructive animate-pulse" />
            <span className="font-mono font-medium">Receptor Warning: {voiceError}</span>
          </div>
        ) : voiceTranscript ? (
          /* Real-time speech transcription from user */
          <div className="flex items-center gap-3 rounded-2xl border border-cyan-hud/40 bg-[oklch(0.15_0.02_240/_85%)] p-3.5 shadow-[0_0_24px_rgba(45,212,235,0.25)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-cyan-hud/15 text-cyan-hud border border-cyan-hud/30">
              <Mic className="h-4 w-4 animate-pulse" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-mono text-[9.5px] font-bold uppercase tracking-wider text-cyan-hud">
                LIVE INTERIM TRANSCRIPT
              </span>
              <p className="truncate font-mono text-xs italic text-foreground">
                "{voiceTranscript}"
              </p>
            </div>
          </div>
        ) : voiceSpeaking && voiceLastSpoken ? (
          /* Live spoken response from JARVIS */
          <div className="flex items-center gap-3 rounded-2xl border border-violet-hud/40 bg-[oklch(0.15_0.02_280/_85%)] p-3.5 shadow-[0_0_24px_rgba(167,139,250,0.25)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-violet-hud/15 text-violet-hud border border-violet-hud/30">
              <Volume2 className="h-4 w-4 animate-pulse" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-mono text-[9.5px] font-bold uppercase tracking-wider text-violet-hud">
                FRIDAY VOCALIZING
              </span>
              <p className="truncate font-mono text-xs text-foreground">"{voiceLastSpoken}"</p>
            </div>
            <button
              type="button"
              onClick={interruptVoiceSpeech}
              title="Interrupt Vocalization"
              aria-label="Interrupt Vocalization"
              className="key flex shrink-0 items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold font-mono text-rose-400 hover:bg-rose-500/20"
            >
              <Square className="h-3 w-3 fill-rose-400" />
              <span>BARGE-IN</span>
            </button>
          </div>
        ) : (
          /* Idle standby ticker card */
          <div className="flex items-center justify-between rounded-2xl border border-hairline bg-black/30 px-4 py-2.5 backdrop-blur-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <p className="truncate font-mono text-[11px] text-muted-foreground">
                {voiceListening
                  ? "Awaiting voice command... Say 'Hey JARVIS' or speak your directive."
                  : "Voice receptor standby. Click the orb or microphone below to engage."}
              </p>
            </div>
            <span className="hidden sm:inline-flex rounded border border-hairline px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
              CONTINUOUS V2.4
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
