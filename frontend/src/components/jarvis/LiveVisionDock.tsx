import React, { useEffect, useRef, useState } from "react";
import { Camera, Monitor, X, RefreshCw, Maximize2, Minimize2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LiveVisionDockProps {
  stream: MediaStream | null;
  mode?: "camera" | "screen";
  onClose: () => void;
  onFlipCamera?: () => void;
  className?: string;
}

export function LiveVisionDock({
  stream,
  mode = "camera",
  onClose,
  onFlipCamera,
  className,
}: LiveVisionDockProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [minimized, setMinimized] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  // Attach media stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) return null;

  const handleFlip = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
    onFlipCamera?.();
  };

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 transition-all duration-300 select-none animate-in fade-in slide-in-from-bottom-4",
        minimized ? "w-52 h-14" : "w-80 sm:w-96 h-56 sm:h-64",
        className,
      )}
    >
      <div className="relative h-full w-full overflow-hidden rounded-2xl border border-cyan-hud/40 bg-[oklch(0.14_0.02_240/_90%)] shadow-[0_16px_40px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
        {/* Sci-Fi Corner Brackets */}
        <div className="pointer-events-none absolute left-1 top-1 h-3 w-3 border-l-2 border-t-2 border-cyan-hud" />
        <div className="pointer-events-none absolute right-1 top-1 h-3 w-3 border-r-2 border-t-2 border-cyan-hud" />
        <div className="pointer-events-none absolute bottom-1 left-1 h-3 w-3 border-b-2 border-l-2 border-cyan-hud" />
        <div className="pointer-events-none absolute bottom-1 right-1 h-3 w-3 border-b-2 border-r-2 border-cyan-hud" />

        {/* Scanlines Effect */}
        <div className="pointer-events-none absolute inset-0 z-10 opacity-20 [background-image:linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%)] [background-size:100%_4px]" />

        {/* Top Control Bar */}
        <div className="relative z-20 flex items-center justify-between border-b border-hairline bg-black/40 px-3 py-1.5 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-hud opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-hud" />
            </span>
            {mode === "camera" ? (
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-wider text-emerald-hud">
                <Camera className="h-3 w-3" />
                <span>OPTICAL CAM · LIVE</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-wider text-violet-hud">
                <Monitor className="h-3 w-3" />
                <span>DESKTOP STREAM</span>
              </div>
            )}
            <span className="hidden sm:inline font-mono text-[9px] text-muted-foreground">
              30 FPS
            </span>
          </div>

          <div className="flex items-center gap-1">
            {mode === "camera" && onFlipCamera && (
              <button
                type="button"
                onClick={handleFlip}
                title="Flip Camera (Front/Back)"
                aria-label="Flip Camera"
                className="grid h-6 w-6 place-items-center rounded-lg text-muted-foreground hover:bg-white/10 hover:text-cyan-hud"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setMinimized(!minimized)}
              title={minimized ? "Expand View" : "Minimize View"}
              aria-label={minimized ? "Expand View" : "Minimize View"}
              className="grid h-6 w-6 place-items-center rounded-lg text-muted-foreground hover:bg-white/10 hover:text-cyan-hud"
            >
              {minimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Terminate Vision Stream"
              aria-label="Terminate Vision Stream"
              className="grid h-6 w-6 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Video Canvas */}
        {!minimized && (
          <div className="relative h-[calc(100%-32px)] w-full bg-black/60">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            {/* HUD Reticle Overlay */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-40">
              <div className="h-16 w-16 rounded-full border border-dashed border-cyan-hud/60 flex items-center justify-center">
                <Eye className="h-4 w-4 text-cyan-hud/80" />
              </div>
            </div>
            {/* Bottom HUD Metadata */}
            <div className="pointer-events-none absolute bottom-1.5 left-2 right-2 z-20 flex items-center justify-between font-mono text-[9px] text-cyan-hud/80 backdrop-blur-sm px-2 py-0.5 rounded bg-black/40">
              <span>MULTIMODAL RECEPTOR ACTIVE</span>
              <span>1080P @ 30HZ</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
