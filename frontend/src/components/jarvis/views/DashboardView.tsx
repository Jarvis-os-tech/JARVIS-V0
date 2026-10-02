import { ParallelTaskDock } from "../ParallelTaskDock";
import { VoiceStage } from "../VoiceStage";
import { VoiceCockpitControls } from "../VoiceCockpitControls";
import { CompanionExecutionStream } from "../CompanionExecutionStream";
import { PromptBar } from "../PromptBar";
import { useJarvis, useStats } from "../JarvisProvider";
import { Sparkles } from "lucide-react";

export function DashboardView() {
  const {
    cpu,
    ram,
    net,
    aguiMessages,
    isStreaming,
    sendDirective,
    stopDirective,
    clearChat,
    voiceListening,
    voiceThinking,
    voiceSpeaking,
    voiceTranscript,
    voiceAudioLevel,
    toggleVoiceMic,
    interruptVoiceSpeech,
    setVoiceModalOpen,
    cameraStream,
    screenStream,
    startCameraFeed,
    stopCameraFeed,
    startScreenShare,
    stopScreenShare,
    voicePersona,
    setVoicePersona,
  } = useJarvis();

  const stats = useStats();

  const handleToggleCamera = () => {
    if (cameraStream) {
      stopCameraFeed();
    } else {
      void startCameraFeed();
    }
  };

  const handleToggleScreen = () => {
    if (screenStream) {
      stopScreenShare();
    } else {
      void startScreenShare();
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 pb-2">
      {/* 1. Top HUD Header: Salutation & Telemetry Insets */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display etched text-2xl font-bold tracking-wide">
              Good to see you, <span className="text-aurora">Gopi</span>
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-cyan-hud/40 bg-cyan-hud/10 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-hud">
              <Sparkles className="h-3 w-3" />
              VOICE CONSOLE ONLINE
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Swarm active — {stats.active} missions executing in autonomous synchronization.
          </p>
        </div>

        <div className="hidden gap-2 sm:flex">
          {[
            { l: "AGENTS", v: stats.running, c: "text-emerald-hud" },
            { l: "MISSIONS", v: stats.active, c: "text-cyan-hud" },
            { l: "CPU", v: `${cpu}%`, c: "text-violet-hud" },
            { l: "RAM", v: `${ram}%`, c: "text-amber-hud" },
            { l: "NET", v: `${Math.round(net)}`, c: "text-cyan-hud" },
          ].map((s) => (
            <div key={s.l} className="neu-inset rounded-xl px-3 py-1.5 text-center">
              <p className={`font-mono text-sm font-extrabold ${s.c}`}>{s.v}</p>
              <p className="text-[9px] tracking-[0.16em] text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>
      </header>

      {/* 2. Parallel Background Task Dock */}
      <ParallelTaskDock />

      {/* 3. Main Center Stage: Hero Voice Orb + Companion Stream */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        {/* Left / Center: Hero VoiceStage + Tactile Cockpit Controls */}
        <div className="flex flex-col gap-3 lg:col-span-7 xl:col-span-7 min-h-0">
          <VoiceStage
            className="flex-1 min-h-[360px]"
            onOpenModal={() => setVoiceModalOpen(true)}
          />

          {/* Tactile Voice Cockpit Pedestal */}
          <VoiceCockpitControls
            isCameraActive={!!cameraStream}
            isScreenActive={!!screenStream}
            onToggleCamera={handleToggleCamera}
            onToggleScreen={handleToggleScreen}
            currentPersona={voicePersona}
            onSelectPersona={setVoicePersona}
          />
        </div>

        {/* Right Column: Companion Holographic Execution & Reasoning Stream */}
        <div className="flex flex-col lg:col-span-5 xl:col-span-5 min-h-0">
          <CompanionExecutionStream
            messages={aguiMessages}
            isStreaming={isStreaming}
            onClearMessages={clearChat}
            className="h-full"
          />
        </div>
      </div>

      {/* 4. Bottom Directive Input Bar */}
      <div className="shrink-0 pt-1">
        <PromptBar
          onSend={sendDirective}
          onStop={stopDirective}
          isStreaming={isStreaming}
          voiceListening={voiceListening}
          voiceThinking={voiceThinking}
          voiceSpeaking={voiceSpeaking}
          voiceTranscript={voiceTranscript}
          voiceAudioLevel={voiceAudioLevel}
          onToggleMic={toggleVoiceMic}
          onInterruptSpeech={interruptVoiceSpeech}
          currentPersona={voicePersona}
        />
      </div>
    </div>
  );
}
