import React, { useState } from "react";
import {
  Mic,
  MicOff,
  Square,
  Camera,
  CameraOff,
  Monitor,
  MonitorOff,
  Sparkles,
  Volume2,
  VolumeX,
  ChevronDown,
} from "lucide-react";
import { useJarvis } from "./JarvisProvider";
import { cn } from "@/lib/utils";

export const VOICE_PERSONAS = [
  { id: "Puck", name: "Puck", desc: "Witty, agile, fast neural assistant", tone: "Cyan" },
  { id: "Charon", name: "Charon", desc: "Authoritative, precise military ops", tone: "Amber" },
  { id: "Aoede", name: "Aoede", desc: "Deep, calm, intellectual advisor", tone: "Violet" },
  { id: "Fenrir", name: "Fenrir", desc: "Resolute, low latency guardian", tone: "Emerald" },
];

export interface VoiceCockpitControlsProps {
  className?: string;
  isCameraActive?: boolean;
  isScreenActive?: boolean;
  onToggleCamera?: () => void;
  onToggleScreen?: () => void;
  currentPersona?: string;
  onSelectPersona?: (persona: string) => void;
}

export function VoiceCockpitControls({
  className,
  isCameraActive,
  isScreenActive,
  onToggleCamera,
  onToggleScreen,
  currentPersona,
  onSelectPersona,
}: VoiceCockpitControlsProps) {
  const {
    voiceListening,
    voiceSpeaking,
    voiceThinking,
    voiceAudioLevel,
    toggleVoiceMic,
    interruptVoiceSpeech,
  } = useJarvis();

  const [personaOpen, setPersonaOpen] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState(currentPersona || "Puck");

  const handlePersonaSelect = (id: string) => {
    setSelectedPersona(id);
    setPersonaOpen(false);
    onSelectPersona?.(id);
  };

  return (
    <div
      className={cn(
        "relative flex flex-wrap items-center justify-center gap-2 sm:gap-3 rounded-2xl border border-hairline bg-[oklch(0.18_0.015_256/_80%)] p-2 sm:p-2.5 shadow-[0_12px_36px_oklch(0_0_0/60%)] backdrop-blur-2xl",
        className,
      )}
    >
      {/* 1. Mic Mute / Unmute Button */}
      <button
        type="button"
        onClick={toggleVoiceMic}
        title={voiceListening ? "Mute Microphone" : "Unmute Microphone"}
        aria-label={voiceListening ? "Mute Microphone" : "Unmute Microphone"}
        className={cn(
          "key relative flex items-center gap-2 rounded-xl border px-3.5 py-2 font-mono text-xs font-semibold transition-all duration-200",
          voiceListening
            ? "border-cyan-hud/50 bg-cyan-hud/15 text-cyan-hud shadow-[0_0_16px_rgba(45,212,235,0.25)]"
            : "border-hairline bg-white/5 text-muted-foreground hover:text-foreground",
        )}
      >
        {voiceListening ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-hud opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-hud" />
            </span>
            <Mic className="h-4 w-4" />
            <span className="hidden sm:inline">MIC LIVE</span>
          </>
        ) : (
          <>
            <MicOff className="h-4 w-4 opacity-70" />
            <span className="hidden sm:inline">MIC MUTED</span>
          </>
        )}
      </button>

      {/* 2. Barge-In / Interrupt Vocalization Button (Pulsing when speaking) */}
      <button
        type="button"
        onClick={interruptVoiceSpeech}
        disabled={!voiceSpeaking}
        title="Barge-in / Interrupt Vocal Response"
        aria-label="Barge-in / Interrupt Vocal Response"
        className={cn(
          "key flex items-center gap-1.5 rounded-xl border px-3 py-2 font-mono text-xs font-semibold transition-all duration-200",
          voiceSpeaking
            ? "border-rose-500/60 bg-rose-500/20 text-rose-300 shadow-[0_0_18px_rgba(244,63,94,0.45)] cursor-pointer animate-pulse"
            : "border-hairline bg-white/5 text-muted-foreground/40 cursor-not-allowed opacity-50",
        )}
      >
        <Square className={cn("h-3.5 w-3.5", voiceSpeaking ? "fill-rose-400" : "")} />
        <span className="hidden sm:inline">BARGE-IN</span>
      </button>

      {/* 3. Live Vision Camera Feed Toggle */}
      <button
        type="button"
        onClick={onToggleCamera}
        title={isCameraActive ? "Deactivate Camera Vision Feed" : "Activate Camera Vision Feed"}
        aria-label={
          isCameraActive ? "Deactivate Camera Vision Feed" : "Activate Camera Vision Feed"
        }
        className={cn(
          "key flex items-center gap-1.5 rounded-xl border px-3 py-2 font-mono text-xs font-semibold transition-all duration-200",
          isCameraActive
            ? "border-emerald-hud/50 bg-emerald-hud/15 text-emerald-hud shadow-[0_0_16px_rgba(52,211,153,0.3)]"
            : "border-hairline bg-white/5 text-muted-foreground hover:text-foreground",
        )}
      >
        {isCameraActive ? (
          <>
            <Camera className="h-4 w-4 animate-pulse text-emerald-hud" />
            <span className="hidden sm:inline">CAM ON</span>
          </>
        ) : (
          <>
            <CameraOff className="h-4 w-4 opacity-70" />
            <span className="hidden sm:inline">CAM</span>
          </>
        )}
      </button>

      {/* 4. Desktop Screen Share Toggle */}
      <button
        type="button"
        onClick={onToggleScreen}
        title={isScreenActive ? "Stop Screen Stream" : "Share Screen Stream with JARVIS"}
        aria-label={isScreenActive ? "Stop Screen Stream" : "Share Screen Stream with JARVIS"}
        className={cn(
          "key flex items-center gap-1.5 rounded-xl border px-3 py-2 font-mono text-xs font-semibold transition-all duration-200",
          isScreenActive
            ? "border-violet-hud/50 bg-violet-hud/15 text-violet-hud shadow-[0_0_16px_rgba(167,139,250,0.3)]"
            : "border-hairline bg-white/5 text-muted-foreground hover:text-foreground",
        )}
      >
        {isScreenActive ? (
          <>
            <Monitor className="h-4 w-4 animate-pulse text-violet-hud" />
            <span className="hidden sm:inline">SCREEN ON</span>
          </>
        ) : (
          <>
            <MonitorOff className="h-4 w-4 opacity-70" />
            <span className="hidden sm:inline">SCREEN</span>
          </>
        )}
      </button>

      {/* 5. Voice Persona Selector Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setPersonaOpen(!personaOpen)}
          title="Select Voice Persona"
          aria-label="Select Voice Persona"
          className="key flex items-center gap-1.5 rounded-xl border border-hairline bg-white/5 px-3 py-2 font-mono text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-cyan-hud/40"
        >
          <Sparkles className="h-3.5 w-3.5 text-cyan-hud" />
          <span>{selectedPersona}</span>
          <ChevronDown
            className={cn("h-3 w-3 transition-transform", personaOpen && "rotate-180")}
          />
        </button>

        {personaOpen && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-0 z-50 w-56 rounded-2xl border border-hairline bg-[oklch(0.18_0.015_256/_95%)] p-1.5 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95">
            <div className="px-2.5 py-1.5 border-b border-hairline text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase">
              Voice Neural Persona
            </div>
            <div className="space-y-1 p-1">
              {VOICE_PERSONAS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePersonaSelect(p.id)}
                  className={cn(
                    "flex w-full flex-col items-start rounded-xl px-2.5 py-1.5 text-left transition-colors",
                    selectedPersona === p.id
                      ? "bg-cyan-hud/15 text-cyan-hud border border-cyan-hud/30"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                  )}
                >
                  <span className="font-mono text-xs font-bold">{p.name}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 6. Dynamic Mic Sensitivity Level Indicator */}
      <div
        className="hidden md:flex items-center gap-1.5 rounded-xl border border-hairline bg-white/5 px-2.5 py-2"
        title={`Microphone input level: ${Math.round(voiceAudioLevel * 100)}%`}
      >
        {voiceAudioLevel > 0.05 ? (
          <Volume2 className="h-3.5 w-3.5 text-cyan-hud" />
        ) : (
          <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <div className="flex items-center gap-[2px] h-3 w-10">
          {[0.2, 0.4, 0.6, 0.8, 1.0].map((threshold, i) => (
            <span
              key={i}
              className={cn(
                "h-full w-1.5 rounded-full transition-colors duration-75",
                voiceAudioLevel >= threshold
                  ? voiceAudioLevel > 0.75
                    ? "bg-amber-hud"
                    : "bg-cyan-hud"
                  : "bg-white/10",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
