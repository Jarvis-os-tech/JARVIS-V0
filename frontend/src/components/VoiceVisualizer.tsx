import React, { useState } from 'react';
import { ConnectionState } from '../types';
import { Mic, MicOff, Square, Camera, Monitor, Zap, Volume2, Sparkles } from 'lucide-react';
import { ArcReactor3D } from './ArcReactor3D';
import { sfx } from '../lib/sfx';

interface VoiceVisualizerProps {
  connectionState: ConnectionState;
  inputVolume: number; // 0 - 100
  outputVolume: number; // 0 - 100
  personaName: string;
  personaColor?: string;
  themeColor?: string;
  secondaryColor?: string;
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
  themeColor = '#00f0ff',
  secondaryColor = '#38bdf8',
  isMuted,
  onToggleMute,
  onStartSession,
  onStopSession,
  onInterrupt,
  isVisionActive,
  visionMode,
  onToggleVision,
}) => {
  const [render3D, setRender3D] = useState(true);

  const isConnected = connectionState !== 'disconnected' && connectionState !== 'connecting';
  const activeVolume = connectionState === 'speaking' ? outputVolume : inputVolume;

  const handleStart = () => {
    sfx.playReactorHum();
    onStartSession();
  };

  const handleStop = () => {
    sfx.playWarning();
    onStopSession();
  };

  const handleMute = () => {
    sfx.playPip(isMuted ? 1400 : 900);
    onToggleMute();
  };

  const handleVision = (mode: 'camera' | 'screen') => {
    sfx.playPip(1600);
    onToggleVision(mode);
  };

  const getStatusText = () => {
    switch (connectionState) {
      case 'connecting':
        return 'Synchronizing J.A.R.V.I.S. neural channels...';
      case 'listening':
        return `${personaName} audio sensors active`;
      case 'speaking':
        return `${personaName} is vocalizing response...`;
      case 'connected':
        return isMuted ? 'Audio sensors muted' : 'J.A.R.V.I.S. Online // Standing by';
      case 'error':
        return 'Link connection offline // Tap reactor to reconnect';
      default:
        return 'ARC REACTOR STANDBY // CLICK TO ENGAGE';
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center py-4 px-2 w-full max-w-xl mx-auto">
      {/* 3D Holographic Arc-Reactor Stage Frame */}
      <div className="relative w-72 h-72 sm:w-88 sm:h-88 lg:w-[420px] lg:h-[420px] flex items-center justify-center">
        
        {/* Holographic Outer Reticle Rings (CSS Layer) */}
        <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center">
          {/* Outer Dashed Orbit Reticle */}
          <div 
            className="w-[96%] h-[96%] rounded-full border border-dashed opacity-30 animate-spin-slow"
            style={{ borderColor: themeColor }}
          />
          {/* Reverse Orbit Reticle */}
          <div 
            className="absolute w-[84%] h-[84%] rounded-full border border-dotted opacity-25"
            style={{ 
              borderColor: secondaryColor,
              animation: 'spin-slow 28s linear infinite reverse' 
            }}
          />
          {/* HUD Targeting Ticks */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-mono tracking-widest uppercase opacity-60 flex items-center gap-1.5" style={{ color: themeColor }}>
            <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: themeColor }} />
            ARC CORE // {personaName.toUpperCase()}
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-mono tracking-widest uppercase opacity-50 text-slate-400">
            PWR: 100% // FLUX: STABLE
          </div>
        </div>

        {/* 3D Arc Reactor Canvas */}
        <div 
          className="w-full h-full relative z-10"
          onClick={connectionState === 'disconnected' ? handleStart : undefined}
        >
          {render3D ? (
            <ArcReactor3D
              connectionState={connectionState}
              volume={activeVolume}
              themeColor={themeColor}
              secondaryColor={secondaryColor}
              isMuted={isMuted}
            />
          ) : (
            /* Fallback 2D Radial Glow */
            <div className="w-full h-full flex items-center justify-center">
              <div 
                className="w-48 h-48 rounded-full border-2 border-cyan-400/50 flex items-center justify-center animate-pulse"
                style={{ boxShadow: `0 0 50px ${themeColor}` }}
              >
                <Zap className="w-16 h-16 text-cyan-300" />
              </div>
            </div>
          )}
        </div>

        {/* Standby Engage Button Overlay */}
        {connectionState === 'disconnected' && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <button
              onClick={handleStart}
              className="pointer-events-auto flex flex-col items-center gap-2 group transition-transform active:scale-95 cursor-pointer"
            >
              <div 
                className="w-24 h-24 rounded-full bg-slate-950/85 backdrop-blur-md border border-cyan-400/50 flex items-center justify-center shadow-[0_0_35px_rgba(0,240,255,0.45)] group-hover:scale-105 group-hover:border-cyan-300 transition-all"
                style={{ borderColor: themeColor }}
              >
                <Mic className="w-9 h-9 text-cyan-300 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-cyan-300/80 group-hover:text-cyan-200 uppercase bg-slate-950/80 px-2.5 py-0.5 rounded-full border border-cyan-500/20 backdrop-blur-sm">
                INITIALIZE
              </span>
            </button>
          </div>
        )}

        {/* Synchronizing Spinner Overlay */}
        {connectionState === 'connecting' && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div 
              className="w-20 h-20 rounded-full bg-slate-950/90 border border-cyan-400/50 flex items-center justify-center shadow-[0_0_30px_rgba(0,240,255,0.5)]"
              style={{ borderColor: themeColor }}
            >
              <Zap className="w-8 h-8 text-cyan-300 animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Status Readout & Audio Reactive Decibel Meter */}
      <div className="mt-3 text-center z-20">
        <div className="flex items-center justify-center gap-2">
          {connectionState === 'speaking' && (
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
          )}
          {connectionState === 'listening' && (
            <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: themeColor }} />
          )}
          <p 
            className="text-xs sm:text-sm font-bold font-['Rajdhani',sans-serif] tracking-wider uppercase drop-shadow-[0_0_10px_rgba(0,240,255,0.4)]"
            style={{ color: connectionState === 'speaking' ? '#93c5fd' : themeColor }}
          >
            {getStatusText()}
          </p>
        </div>

        {/* Decibel Level Ticker */}
        {isConnected && (
          <div className="flex items-center justify-center gap-1.5 mt-1 text-[10px] font-mono text-slate-400">
            <Volume2 className="w-3 h-3 text-cyan-400" />
            <span>LEVEL: {Math.round(activeVolume)} dB</span>
            <span className="text-slate-600">//</span>
            <span className="text-emerald-400">60 FPS REALTIME</span>
          </div>
        )}

        {/* Interrupt Button */}
        {connectionState === 'speaking' && (
          <button
            onClick={() => {
              sfx.playPip(1600);
              onInterrupt();
            }}
            className="mt-2 text-[11px] font-mono font-bold text-cyan-300 hover:text-white bg-cyan-950/70 hover:bg-cyan-900/80 px-4 py-1 rounded-full border border-cyan-500/50 transition-all shadow-[0_0_15px_rgba(0,240,255,0.25)] active:scale-95 cursor-pointer"
          >
            Interrupt J.A.R.V.I.S. (Esc)
          </button>
        )}
      </div>

      {/* Futuristic Tactical Controls Dock */}
      <div className="mt-4 flex items-center gap-3 bg-[#09101d]/90 backdrop-blur-2xl p-2.5 px-5 rounded-2xl border border-cyan-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.65),0_0_25px_rgba(0,240,255,0.12)] z-20">
        {connectionState !== 'disconnected' ? (
          <>
            {/* Mute Mic Sensor Button */}
            <button
              onClick={handleMute}
              className={`p-3 rounded-xl transition-all active:scale-95 cursor-pointer ${
                isMuted
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                  : 'bg-slate-900/80 text-cyan-300 hover:bg-cyan-950/80 border border-cyan-500/30 hover:border-cyan-400'
              }`}
              title={isMuted ? 'Unmute Sensors' : 'Mute Sensors'}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Camera Optical Ingestion Button */}
            <button
              onClick={() => handleVision('camera')}
              className={`p-3 rounded-xl transition-all active:scale-95 cursor-pointer ${
                isVisionActive && visionMode === 'camera'
                  ? 'bg-cyan-400 text-slate-950 font-bold shadow-[0_0_20px_rgba(0,240,255,0.6)] border border-cyan-200'
                  : 'bg-slate-900/80 text-slate-300 hover:bg-cyan-950/80 hover:text-cyan-300 border border-cyan-500/25'
              }`}
              title="Camera Optical Stream"
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* Screen Telemetry Ingestion Button */}
            <button
              onClick={() => handleVision('screen')}
              className={`p-3 rounded-xl transition-all active:scale-95 cursor-pointer ${
                isVisionActive && visionMode === 'screen'
                  ? 'bg-blue-500 text-white font-bold shadow-[0_0_20px_rgba(59,130,246,0.6)] border border-blue-200'
                  : 'bg-slate-900/80 text-slate-300 hover:bg-cyan-950/80 hover:text-cyan-300 border border-cyan-500/25'
              }`}
              title="Screen Telemetry Stream"
            >
              <Monitor className="w-4 h-4" />
            </button>

            {/* End Call / Stop Session */}
            <button
              onClick={handleStop}
              className="p-3 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white transition-all shadow-[0_0_20px_rgba(225,29,72,0.45)] border border-rose-400/60 ml-1 active:scale-95 cursor-pointer"
              title="Disconnect J.A.R.V.I.S. Core"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          </>
        ) : (
          <>
            {/* Engage J.A.R.V.I.S. Button */}
            <button
              onClick={handleStart}
              className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 text-slate-950 font-black text-xs tracking-wider font-['Orbitron',sans-serif] hover:opacity-95 shadow-[0_0_25px_rgba(0,240,255,0.45)] transition-all hover:scale-[1.02] active:scale-95 border border-cyan-200 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-current text-slate-950 animate-pulse" />
              <span>ENGAGE J.A.R.V.I.S.</span>
            </button>

            {/* Camera Test Button */}
            <button
              onClick={() => handleVision('camera')}
              className={`p-3 rounded-xl transition-all active:scale-95 cursor-pointer ${
                isVisionActive && visionMode === 'camera'
                  ? 'bg-cyan-400 text-slate-950 font-bold shadow-[0_0_20px_rgba(0,240,255,0.6)] border border-cyan-200'
                  : 'bg-slate-900/80 text-slate-300 hover:bg-cyan-950/80 hover:text-cyan-300 border border-cyan-500/25'
              }`}
              title="Optical Camera Stream"
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* Screen Test Button */}
            <button
              onClick={() => handleVision('screen')}
              className={`p-3 rounded-xl transition-all active:scale-95 cursor-pointer ${
                isVisionActive && visionMode === 'screen'
                  ? 'bg-blue-500 text-white font-bold shadow-[0_0_20px_rgba(59,130,246,0.6)] border border-blue-200'
                  : 'bg-slate-900/80 text-slate-300 hover:bg-cyan-950/80 hover:text-cyan-300 border border-cyan-500/25'
              }`}
              title="Screen Telemetry Stream"
            >
              <Monitor className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default VoiceVisualizer;