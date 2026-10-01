import React from 'react';
import { User } from 'firebase/auth';
import { ConnectionState } from '../types';
import { Mic, Volume2, Globe, Play, Cpu, Brain, Shield } from 'lucide-react';
import { ConnectorButton } from '@connectors/ui';
import { PwaInstallButton } from './PwaInstallButton';

interface HeaderProps {
  connectionState: ConnectionState;
  selectedPersonaName: string;
  isDemoMode?: boolean;
  onOpenMemoryHUD: () => void;
  memoryCount: number;
  currentUser: User | null;
  onOpenConnectors: () => void;
  onOpenCeoHUD?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  connectionState,
  selectedPersonaName,
  isDemoMode,
  onOpenMemoryHUD,
  memoryCount,
  currentUser,
  onOpenConnectors,
  onOpenCeoHUD
}) => {
  const getStatusBadge = () => {
    if (isDemoMode) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono">
          <Play className="w-3 h-3 text-amber-400 fill-current" />
          <span className="hidden sm:inline">Demo Voice Mode</span>
          <span className="sm:hidden">Demo</span>
        </span>
      );
    }

    switch (connectionState) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.25)] font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f0ff]" />
            <span className="hidden md:inline">LIVE LINK ACTIVE</span>
            <span className="md:hidden">LIVE</span>
          </span>
        );
      case 'speaking':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/50 shadow-[0_0_12px_rgba(59,130,246,0.3)] font-mono">
            <Volume2 className="w-3.5 h-3.5 text-blue-400 animate-bounce" />
            <span className="hidden md:inline">J.A.R.V.I.S. VOCALIZING</span>
            <span className="md:hidden">SPEAKING</span>
          </span>
        );
      case 'listening':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-400/50 shadow-[0_0_12px_rgba(14,165,233,0.3)] font-mono">
            <Mic className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span className="hidden md:inline">AUDIO SENSORS ACTIVE</span>
            <span className="md:hidden">LISTENING</span>
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="hidden sm:inline">SYNCHRONIZING...</span>
            <span className="sm:hidden">SYNC</span>
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 font-mono">
            <span className="hidden sm:inline">LINK OFFLINE</span>
            <span className="sm:hidden">OFFLINE</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 font-mono">
            STANDBY
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-cyan-500/20 bg-slate-950/85 backdrop-blur-2xl px-4 sm:px-8 py-3.5 flex items-center justify-between transition-all shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
      {/* Brand Identity */}
      <div className="flex items-center gap-3.5">
        <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-700 p-0.5 shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center justify-center group cursor-pointer" onClick={onOpenMemoryHUD}>
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center overflow-hidden relative">
            <div className="absolute inset-0 bg-cyan-500/10 rounded-full animate-pulse" />
            <Cpu className="w-5 h-5 text-cyan-400 relative z-10" />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-extrabold tracking-wider text-white font-mono flex items-center gap-2">
              <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 bg-clip-text text-transparent">
                J.A.R.V.I.S.
              </span>
            </h1>
            <span className="hidden sm:inline-flex text-[10px] uppercase font-mono font-bold tracking-widest px-2 py-0.5 bg-cyan-500/15 text-cyan-300 rounded border border-cyan-400/30 items-center gap-1">
              <Globe className="w-3 h-3 text-cyan-400" /> Auto-Lang
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
            Voice: <span className="text-cyan-300 font-semibold">Puck</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">Autonomous OS</span>
          </p>
        </div>
      </div>

      {/* Right Action Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {getStatusBadge()}

        {/* PWA Install Button for Mobile & Linux */}
        <PwaInstallButton />

        {/* Connectors Button & Quick-Access Menu */}
        <ConnectorButton onOpenDirectory={onOpenConnectors} />

        {/* J.A.R.V.I.S. CEO Executive HUD Button */}
        {onOpenCeoHUD && (
          <button
            onClick={onOpenCeoHUD}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-cyan-300 bg-blue-950/40 hover:bg-blue-900/40 border border-cyan-500/30 hover:border-cyan-400 transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] group"
            title="Open J.A.R.V.I.S. CEO Executive Orchestration HUD"
          >
            <Shield className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline font-mono">CEO HUD</span>
          </button>
        )}

        {/* J.A.R.V.I.S. Memory Matrix Button */}
        <button
          onClick={onOpenMemoryHUD}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-500/30 hover:border-cyan-400 transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] group"
          title="Open J.A.R.V.I.S. 4-Tier Memory Matrix Core"
        >
          <Brain className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline font-mono">Memory Core</span>
          <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-[10px] font-mono font-bold">
            {memoryCount}
          </span>
        </button>
      </div>
    </header>
  );
};

