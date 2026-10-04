import React from 'react';
import { ConnectionState } from '../../types';
import { Mic, MicOff, Volume2 } from 'lucide-react';

interface SignalRailProps {
  connectionState: ConnectionState;
  inputVolume: number; // 0 - 100
  outputVolume: number; // 0 - 100
  isMuted?: boolean;
  themeColor?: string;
  onToggleMute?: () => void;
}

export const SignalRail: React.FC<SignalRailProps> = ({
  connectionState,
  inputVolume,
  outputVolume,
  isMuted = false,
  themeColor = '#00f0ff',
  onToggleMute,
}) => {
  const isSpeaking = connectionState === 'speaking';
  const rawVol = isSpeaking ? outputVolume : inputVolume;
  const clampedVol = Math.min(100, Math.max(0, rawVol));
  const activeLevel = isMuted ? 0 : clampedVol;

  const ticks = [100, 80, 60, 40, 20, 0];

  return (
    <aside className="rail rail-right w-44 sm:w-48 p-3.5 rounded-2xl bg-[#060e1a]/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] select-none">
      <div className="flex items-center justify-between pb-2 mb-1 border-b border-cyan-500/15 w-full">
        <span className="rail-title !mb-0 tracking-[0.3em]">SIGNAL</span>
        <button
          onClick={onToggleMute}
          className={`p-1 rounded-md transition-all ${
            isMuted
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : 'bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-400/20'
          }`}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
        </button>
      </div>

      <div className="flex items-center justify-between w-full py-2 px-1">
        {/* Vertical Scale Markers */}
        <div className="flex flex-col justify-between h-28 text-[8.5px] font-mono text-slate-500 pr-2">
          {ticks.map((t) => (
            <span key={t} className="leading-none">
              {t}%
            </span>
          ))}
        </div>

        {/* Dual Vertical Reactive Meters */}
        <div className="flex items-end gap-2 h-28 px-1 py-0.5 rounded-md bg-slate-950/70 border border-cyan-500/20">
          {/* Main Channel */}
          <div className="meter !h-full !w-3 !m-0 !border-0 bg-cyan-950/40">
            <div
              className="meter-fill"
              style={{
                height: `${Math.max(4, activeLevel)}%`,
                backgroundColor: themeColor,
                boxShadow: activeLevel > 20 ? `0 0 12px ${themeColor}` : 'none',
              }}
            />
          </div>

          {/* Secondary Sub-Harmonic Channel */}
          <div className="meter !h-full !w-1.5 !m-0 !border-0 bg-cyan-950/40">
            <div
              className="meter-fill"
              style={{
                height: `${Math.max(4, activeLevel * 0.75)}%`,
                backgroundColor: '#38bdf8',
                opacity: 0.8,
              }}
            />
          </div>
        </div>

        {/* Live dB Value Readout */}
        <div className="flex flex-col items-end gap-1 font-mono text-right">
          <span className="text-xl font-black text-cyan-300 tracking-tight">
            {Math.round(activeLevel)}
            <span className="text-[10px] text-cyan-400/70 ml-0.5 font-normal">%</span>
          </span>
          <span className="text-[9px] text-slate-400 uppercase">
            {isSpeaking ? 'VOCAL' : isMuted ? 'MUTED' : 'INPUT'}
          </span>
          <span className="text-[8.5px] text-cyan-400/80 px-1 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
            {isSpeaking ? 'OUTPUT' : 'MIC'}
          </span>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-cyan-500/10 flex items-center justify-between text-[9px] font-mono text-slate-400 w-full">
        <span>LATENCY: 18ms</span>
        <span className="text-emerald-400 font-semibold">60 FPS</span>
      </div>
    </aside>
  );
};

export default SignalRail;
