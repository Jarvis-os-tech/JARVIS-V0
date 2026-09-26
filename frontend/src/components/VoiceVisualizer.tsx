import React, { useEffect, useRef } from 'react';
import { ConnectionState } from '../types';
import { Mic, MicOff, Square, Camera, Monitor, Zap, Cpu } from 'lucide-react';

interface VoiceVisualizerProps {
  connectionState: ConnectionState;
  inputVolume: number; // 0 - 100
  outputVolume: number; // 0 - 100
  personaName: string;
  personaColor: string;
  isMuted: boolean;
  onToggleMute: () => void;
  onStartSession: () => void;
  onStopSession: () => void;
  onInterrupt: () => void;
  isVisionActive: boolean;
  visionMode: 'camera' | 'screen' | null;
  onToggleVision: (mode: 'camera' | 'screen') => void;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  connectionState,
  inputVolume,
  outputVolume,
  personaName,
  personaColor: _personaColor,
  isMuted,
  onToggleMute,
  onStartSession,
  onStopSession,
  onInterrupt,
  isVisionActive,
  visionMode,
  onToggleVision,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      const isConnected = connectionState !== 'disconnected' && connectionState !== 'connecting';
      const activeVolume = connectionState === 'speaking' ? outputVolume : inputVolume;
      const baseRadius = Math.min(width, height) * 0.22;
      const dynamicRadius = baseRadius + (activeVolume * 0.75);

      phase += 0.035;

      // 1. Draw outer Arc Reactor calibration HUD rings
      const outerRingRadius = baseRadius * 1.85;
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRingRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 12]);
      ctx.stroke();
      ctx.restore();

      // 2. Rotating Arc Reactor segmented ticks
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(phase * 0.2);
      const tickCount = 24;
      for (let i = 0; i < tickCount; i++) {
        const angle = (i / tickCount) * Math.PI * 2;
        const innerR = outerRingRadius - 8;
        const outerR = outerRingRadius + (i % 6 === 0 ? 8 : 2);

        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
        ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
        ctx.strokeStyle = i % 6 === 0 ? 'rgba(6, 182, 212, 0.7)' : 'rgba(6, 182, 212, 0.25)';
        ctx.lineWidth = i % 6 === 0 ? 2 : 1;
        ctx.stroke();
      }
      ctx.restore();

      // 3. Counter-rotating inner reticle ring
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(-phase * 0.4);
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius * 1.45, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 2;
      ctx.setLineDash([20, 30, 4, 30]);
      ctx.stroke();
      ctx.restore();

      // 4. Concentric acoustic pulse waves
      const ringCount = 3;
      for (let i = ringCount; i >= 1; i--) {
        const ringRadius = dynamicRadius + i * 16 + Math.sin(phase + i) * 6;
        ctx.beginPath();
        ctx.arc(centerX, centerY, Math.max(10, ringRadius), 0, Math.PI * 2);

        let strokeColor = 'rgba(6, 182, 212, 0.18)';
        if (connectionState === 'speaking') strokeColor = 'rgba(59, 130, 246, 0.35)';
        if (connectionState === 'listening') strokeColor = 'rgba(14, 165, 233, 0.45)';

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // 5. Draw fluid organic reactive core
      ctx.beginPath();
      const points = 64;
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const wave1 = Math.sin(angle * 4 + phase * 2) * (activeVolume * 0.3 + 4);
        const wave2 = Math.cos(angle * 6 - phase * 2.5) * (activeVolume * 0.2 + 3);
        const r = dynamicRadius + wave1 + wave2;

        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();

      // Gradient Fill (Cyan Arc Reactor)
      const gradient = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, dynamicRadius + 20);

      if (connectionState === 'speaking') {
        gradient.addColorStop(0, '#93c5fd');
        gradient.addColorStop(0.4, '#3b82f6');
        gradient.addColorStop(1, '#1d4ed8');
      } else if (connectionState === 'listening') {
        gradient.addColorStop(0, '#a5f3fc');
        gradient.addColorStop(0.4, '#06b6d4');
        gradient.addColorStop(1, '#0284c7');
      } else {
        gradient.addColorStop(0, '#67e8f9');
        gradient.addColorStop(0.5, '#0891b2');
        gradient.addColorStop(1, '#0e7490');
      }

      ctx.fillStyle = gradient;
      ctx.shadowColor = connectionState === 'speaking' ? 'rgba(59, 130, 246, 0.6)' : 'rgba(6, 182, 212, 0.6)';
      ctx.shadowBlur = isConnected ? 30 + activeVolume * 0.4 : 15;
      ctx.fill();

      // 6. Arc Reactor Core Inner Bright Glow
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 20;
      ctx.fill();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [connectionState, inputVolume, outputVolume]);

  const getStatusText = () => {
    switch (connectionState) {
      case 'connecting':
        return 'Synchronizing J.A.R.V.I.S. neural channels...';
      case 'listening':
        return `${personaName} is actively listening...`;
      case 'speaking':
        return `${personaName} is responding...`;
      case 'connected':
        return isMuted ? 'Microphone Sensor Muted' : 'J.A.R.V.I.S. Online — speak freely';
      case 'error':
        return 'Link connection disrupted. Tap reactor to reconnect.';
      default:
        return '';
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center py-6 sm:py-8 px-4 w-full max-w-xl mx-auto">
      {/* Visualizer Canvas Frame */}
      <div className="relative w-80 h-80 sm:w-96 sm:h-96 lg:w-[460px] lg:h-[460px] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={460}
          height={460}
          className="w-full h-full cursor-pointer touch-none filter drop-shadow-[0_0_50px_rgba(6,182,212,0.25)]"
          onClick={connectionState === 'disconnected' ? onStartSession : undefined}
        />

        {/* Center Overlay Icon */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {connectionState === 'disconnected' && (
            <div
              className="w-28 h-28 rounded-full bg-slate-950/90 shadow-[0_0_30px_rgba(6,182,212,0.4)] border border-cyan-400/40 flex items-center justify-center transition-transform hover:scale-105 pointer-events-auto cursor-pointer group"
              onClick={onStartSession}
            >
              <Mic className="w-11 h-11 text-cyan-300 group-hover:scale-110 group-hover:text-cyan-200 transition-transform" />
            </div>
          )}

          {connectionState === 'connecting' && (
            <div className="w-24 h-24 rounded-full bg-slate-950/90 shadow-[0_0_30px_rgba(6,182,212,0.5)] border border-cyan-400/40 flex items-center justify-center">
              <Zap className="w-10 h-10 text-cyan-400 animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Status Text */}
      {connectionState !== 'disconnected' && getStatusText() && (
        <div className="mt-5 text-center">
          <p className="text-base sm:text-lg font-bold text-slate-100 font-mono flex items-center justify-center gap-2.5 drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]">
            {connectionState === 'speaking' && <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping" />}
            {connectionState === 'listening' && <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />}
            {getStatusText()}
          </p>

          {connectionState === 'speaking' && (
            <button
              onClick={onInterrupt}
              className="mt-3 text-xs font-mono font-bold text-cyan-300 hover:text-white bg-cyan-950/60 hover:bg-cyan-900/60 px-5 py-1.5 rounded-full border border-cyan-500/40 transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)]"
            >
              Interrupt J.A.R.V.I.S.
            </button>
          )}
        </div>
      )}

      {/* Controls Dock */}
      <div className="mt-6 flex items-center gap-3.5 bg-slate-950/80 backdrop-blur-2xl p-3 px-6 rounded-2xl border border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.15)]">
        {connectionState !== 'disconnected' ? (
          <>
            {/* Mute Mic button */}
            <button
              onClick={onToggleMute}
              className={`p-3.5 rounded-xl transition-all ${
                isMuted
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'bg-slate-900/80 text-cyan-300 hover:bg-cyan-950 border border-cyan-500/25 hover:border-cyan-400'
              }`}
              title={isMuted ? 'Unmute Sensors' : 'Mute Sensors'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Camera Vision Button */}
            <button
              onClick={() => onToggleVision('camera')}
              className={`p-3.5 rounded-xl transition-all ${
                isVisionActive && visionMode === 'camera'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_20px_rgba(6,182,212,0.5)] border border-cyan-300'
                  : 'bg-slate-900/80 text-slate-300 hover:bg-cyan-950 hover:text-cyan-300 border border-cyan-500/20 hover:border-cyan-400/50'
              }`}
              title="Toggle Camera Optical Sensor"
            >
              <Camera className="w-5 h-5" />
            </button>

            {/* Screen Share Vision Button */}
            <button
              onClick={() => onToggleVision('screen')}
              className={`p-3.5 rounded-xl transition-all ${
                isVisionActive && visionMode === 'screen'
                  ? 'bg-blue-500 text-white font-bold shadow-[0_0_20px_rgba(59,130,246,0.5)] border border-blue-300'
                  : 'bg-slate-900/80 text-slate-300 hover:bg-cyan-950 hover:text-cyan-300 border border-cyan-500/20 hover:border-cyan-400/50'
              }`}
              title="Toggle Screen Telemetry Stream"
            >
              <Monitor className="w-5 h-5" />
            </button>

            {/* End Call / Stop Session */}
            <button
              onClick={onStopSession}
              className="p-3.5 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white transition-all shadow-[0_0_20px_rgba(225,29,72,0.4)] border border-rose-400/50 ml-1"
              title="Disconnect J.A.R.V.I.S. Core"
            >
              <Square className="w-5 h-5 fill-current" />
            </button>
          </>
        ) : (
          <>
            {/* Start Conversation Call */}
            <button
              onClick={onStartSession}
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-slate-950 font-extrabold text-sm hover:opacity-95 shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all hover:scale-105 border border-cyan-300"
            >
              <Zap className="w-4 h-4 fill-current text-slate-950" />
              <span>ENGAGE J.A.R.V.I.S.</span>
            </button>

            {/* Camera Vision Button */}
            <button
              onClick={() => onToggleVision('camera')}
              className={`p-3.5 rounded-xl transition-all ${
                isVisionActive && visionMode === 'camera'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_20px_rgba(6,182,212,0.5)] border border-cyan-300'
                  : 'bg-slate-900/80 text-slate-300 hover:bg-cyan-950 hover:text-cyan-300 border border-cyan-500/20 hover:border-cyan-400/50'
              }`}
              title="Test Camera Optical Sensor"
            >
              <Camera className="w-5 h-5" />
            </button>

            {/* Screen Share Button */}
            <button
              onClick={() => onToggleVision('screen')}
              className={`p-3.5 rounded-xl transition-all ${
                isVisionActive && visionMode === 'screen'
                  ? 'bg-blue-500 text-white font-bold shadow-[0_0_20px_rgba(59,130,246,0.5)] border border-blue-300'
                  : 'bg-slate-900/80 text-slate-300 hover:bg-cyan-950 hover:text-cyan-300 border border-cyan-500/20 hover:border-cyan-400/50'
              }`}
              title="Test Screen Telemetry Stream"
            >
              <Monitor className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

