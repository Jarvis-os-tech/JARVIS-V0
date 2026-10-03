import React from 'react';
import { VoicePersona, ConnectionState } from '../types';
import { PERSONAS } from '../data/personas';
import { Activity, Cpu, Shield, Bot, Radio, Wifi, Zap, Volume2 } from 'lucide-react';
import { sfx } from '../lib/sfx';

interface TelemetryWingLeftProps {
  connectionState: ConnectionState;
  selectedPersona: VoicePersona;
  onSelectPersona: (persona: VoicePersona) => void;
  inputVolume: number;
  outputVolume: number;
  themeColor?: string;
}

export const TelemetryWingLeft: React.FC<TelemetryWingLeftProps> = ({
  connectionState,
  selectedPersona,
  onSelectPersona,
  inputVolume,
  outputVolume,
  themeColor = '#00f0ff',
}) => {
  const activeVol = connectionState === 'speaking' ? outputVolume : inputVolume;

  const handleSwitchPersona = (p: VoicePersona) => {
    sfx.playHandoff();
    onSelectPersona(p);
  };

  return (
    <aside className="w-full lg:w-72 xl:w-80 flex flex-col gap-3.5 select-none animate-fade-in">
      {/* 1. Neural Diagnostics & System Telemetry Card */}
      <div className="hud-card rounded-2xl p-3.5 relative overflow-hidden">
        <div className="corner-bracket-tl" />
        <div className="corner-bracket-tr" />
        <div className="corner-bracket-bl" />
        <div className="corner-bracket-br" />

        <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-cyan-500/15">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="text-[10.5px] font-mono font-bold tracking-widest text-cyan-300 uppercase">
              System Telemetry
            </span>
          </div>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-400/25">
            NODE 01
          </span>
        </div>

        {/* Dual Gauges: Neural Latency & Core Load */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-slate-950/60 rounded-xl p-2.5 border border-white/5 flex flex-col items-center justify-center">
            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Neural Latency</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-black font-mono text-cyan-300">18</span>
              <span className="text-[10px] font-mono text-cyan-400/70">ms</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1 mt-1.5 overflow-hidden">
              <div className="bg-cyan-400 h-full rounded-full w-[24%]" />
            </div>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-2.5 border border-white/5 flex flex-col items-center justify-center">
            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">AGI Core Load</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-black font-mono text-emerald-400">32</span>
              <span className="text-[10px] font-mono text-emerald-400/70">%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1 mt-1.5 overflow-hidden">
              <div className="bg-emerald-400 h-full rounded-full w-[32%]" />
            </div>
          </div>
        </div>

        {/* Audio Spectrum FFT Waveform Analyzer */}
        <div className="bg-slate-950/60 rounded-xl p-2.5 border border-white/5">
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mb-2">
            <span className="flex items-center gap-1">
              <Volume2 className="w-3 h-3 text-cyan-400" /> Audio Frequency FFT
            </span>
            <span className="text-cyan-300 font-bold">{Math.round(activeVol)} dB</span>
          </div>

          <div className="h-9 flex items-end justify-between gap-1 px-1">
            {[45, 75, 30, 90, 60, 40, 85, 95, 55, 35, 70, 80, 50, 65, 90, 40].map((h, i) => {
              const dynamicH = Math.max(15, (h * (activeVol / 100) + 12));
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm transition-all duration-100"
                  style={{
                    height: `${dynamicH}%`,
                    backgroundColor: i % 3 === 0 ? themeColor : 'rgba(56, 189, 248, 0.65)',
                    boxShadow: activeVol > 20 ? `0 0 8px ${themeColor}` : 'none',
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Coworker Squad Roster Card */}
      <div className="hud-card rounded-2xl p-3.5 relative overflow-hidden flex-1">
        <div className="corner-bracket-tl" />
        <div className="corner-bracket-tr" />
        <div className="corner-bracket-bl" />
        <div className="corner-bracket-br" />

        <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/15">
          <div className="flex items-center gap-2">
            <Bot className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="text-[10.5px] font-mono font-bold tracking-widest text-cyan-300 uppercase">
              Coworker Squad
            </span>
          </div>
          <span className="text-[9px] font-mono text-slate-400">6 UNITS</span>
        </div>

        {/* Persona Mini-Matrix Grid */}
        <div className="space-y-1.5">
          {PERSONAS.map((p) => {
            const isCurrent = selectedPersona.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleSwitchPersona(p)}
                className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-cyan-500/15 border-cyan-400/50 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                    : 'bg-slate-950/40 border-white/5 hover:border-cyan-500/30 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-[11px] ${
                      isCurrent
                        ? 'bg-cyan-400 text-slate-950 shadow-[0_0_10px_rgba(0,240,255,0.5)]'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white tracking-wide font-['Rajdhani',sans-serif]">
                      {p.name}
                    </div>
                    <div className="text-[9.5px] font-mono text-slate-400 line-clamp-1">
                      {p.role}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {isCurrent && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_#00f0ff]" />
                  )}
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase ${
                    isCurrent ? 'bg-cyan-400/20 text-cyan-300' : 'text-slate-500'
                  }`}>
                    {isCurrent ? 'ACTIVE' : 'READY'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};

export default TelemetryWingLeft;
