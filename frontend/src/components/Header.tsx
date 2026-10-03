import React from 'react';
import { User } from 'firebase/auth';
import { ConnectionState } from '../types';
import { Mic, Volume2, Globe, Play, Cpu, Brain, Shield, Bot } from 'lucide-react';
import { ConnectorButton } from '@connectors/ui';
import { PwaInstallButton } from './PwaInstallButton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface HeaderProps {
  connectionState: ConnectionState;
  selectedPersonaName: string;
  isDemoMode?: boolean;
  onOpenMemoryHUD: () => void;
  memoryCount: number;
  currentUser: User | null;
  onOpenConnectors: () => void;
  onOpenCeoHUD?: () => void;
  onOpenSecurityHUD?: () => void;
  onToggleAgentSpace?: () => void;
}

const statusConfig = {
  connected: {
    label: 'LIVE LINK ACTIVE',
    short: 'LIVE',
    color: 'text-cyan-300 bg-cyan-500/15 border-cyan-400/40',
    iconColor: 'text-cyan-400',
    pulse: true,
  },
  speaking: {
    label: 'J.A.R.V.I.S. VOCALIZING',
    short: 'SPEAKING',
    color: 'text-blue-300 bg-blue-500/20 border-blue-400/50',
    iconColor: 'text-blue-400',
    pulse: false,
  },
  listening: {
    label: 'AUDIO SENSORS ACTIVE',
    short: 'LISTENING',
    color: 'text-sky-300 bg-sky-500/20 border-sky-400/50',
    iconColor: 'text-sky-400',
    pulse: true,
  },
  connecting: {
    label: 'SYNCHRONIZING...',
    short: 'SYNC',
    color: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20',
    iconColor: 'text-cyan-400',
    pulse: false,
  },
  error: {
    label: 'LINK OFFLINE',
    short: 'OFFLINE',
    color: 'text-red-400 bg-red-500/10 border-red-500/20',
    iconColor: 'text-red-400',
    pulse: false,
  },
  demo: {
    label: 'Demo Voice Mode',
    short: 'Demo',
    color: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
    iconColor: 'text-amber-400',
    pulse: false,
  },
  disconnected: {
    label: 'STANDBY',
    short: 'STANDBY',
    color: 'text-slate-300 bg-slate-800 border-slate-700',
    iconColor: 'text-slate-400',
    pulse: false,
  },
  default: {
    label: 'STANDBY',
    short: 'STANDBY',
    color: 'text-slate-300 bg-slate-800 border-slate-700',
    iconColor: 'text-slate-400',
    pulse: false,
  },
} as const;

type StatusKey = keyof typeof statusConfig;
export const Header: React.FC<HeaderProps> = ({
  connectionState,
  selectedPersonaName,
  isDemoMode,
  onOpenMemoryHUD,
  memoryCount,
  currentUser,
  onOpenConnectors,
  onOpenCeoHUD,
  onOpenSecurityHUD,
  onToggleAgentSpace
}) => {
  const statusKey: StatusKey = isDemoMode ? 'demo' : ((connectionState in statusConfig) ? (connectionState as StatusKey) : 'default');
  const config = statusConfig[statusKey];

  return (
    <header className="sticky top-0 z-30 w-full border-b border-cyan-500/25 bg-[#060a12]/90 backdrop-blur-2xl px-4 sm:px-8 py-3.5 flex items-center justify-between transition-all shadow-[0_12px_36px_rgba(0,0,0,0.65)]">
      {/* Brand Identity */}
      <div className="flex items-center gap-3.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onOpenMemoryHUD}
              className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-0.5 shadow-[0_0_20px_rgba(0,240,255,0.35)] flex items-center justify-center group cursor-pointer active:scale-95 transition-transform"
              title="Open Sovereign Memory Core"
            >
              <div className="w-full h-full bg-[#060a12] rounded-[14px] flex items-center justify-center overflow-hidden relative">
                <div className="absolute inset-0 bg-cyan-500/15 rounded-full animate-pulse" />
                <Cpu className="w-5 h-5 text-cyan-400 relative z-10 drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]" />
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            <div className="px-3 py-1.5 text-sm font-mono text-cyan-300">Sovereign Memory Core</div>
          </TooltipContent>
        </Tooltip>

        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-black tracking-[0.25em] text-white font-['Orbitron',sans-serif] flex items-center gap-2">
              <span className="bg-gradient-to-r from-cyan-300 via-sky-200 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(0,240,255,0.4)]">
                J.A.R.V.I.S.
              </span>
            </h1>
            <Badge variant="secondary" className="hidden sm:inline-flex text-[9.5px] uppercase font-mono font-bold tracking-widest px-2 py-0.5 border-cyan-400/30 bg-cyan-500/15 text-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.15)]">
              <Globe className="w-3 h-3 text-cyan-400" />
              <span className="ml-1">AGI Core</span>
            </Badge>
          </div>
          <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5 tracking-wide">
            Persona: <span className="text-cyan-300 font-semibold">{selectedPersonaName || 'J.A.R.V.I.S.'}</span>
            <span className="text-slate-600">\u2022</span>
            <span className="text-slate-400">Autonomous OS</span>
          </p>
        </div>
      </div>

      {/* Right Action Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Status Badge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={statusKey === 'demo' ? 'secondary' : 'default'}
              className={cn(
                'inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-full text-xs font-semibold border font-mono',
                config.color,
                config.pulse && 'shadow-[0_0_12px_rgba(0,240,255,0.25)]'
              )}
            >
              {config.pulse && (
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: config.iconColor.replace('text-', '') }} />
              )}
              {!config.pulse && config.iconColor !== 'text-slate-400' && (
                <span className={cn('w-3.5 h-3.5', config.iconColor, config.pulse ? 'animate-bounce' : 'animate-pulse')} />
              )}
              <span className="hidden md:inline">{config.label}</span>
              <span className="md:hidden">{config.short}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            <div className="px-3 py-1.5 text-sm font-mono text-cyan-300">Connection Status</div>
          </TooltipContent>
        </Tooltip>

        {/* PWA Install Button */}
        <PwaInstallButton />

        {/* Connectors Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <ConnectorButton onOpenDirectory={onOpenConnectors} />
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            <div className="px-3 py-1.5 text-sm font-mono text-cyan-300">Connectors & Integrations</div>
          </TooltipContent>
        </Tooltip>

        {/* CEO HUD Button */}
        {onOpenCeoHUD && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={onOpenCeoHUD}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-cyan-300 bg-blue-950/40 hover:bg-blue-900/50 border-cyan-500/30 hover:border-cyan-400 transition-all shadow-[0_0_15px_rgba(0,240,255,0.15)] active:scale-95 group"
              >
                <Shield className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline font-mono">CEO HUD</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              <div className="px-3 py-1.5 text-sm font-mono text-cyan-300">Executive Orchestration HUD</div>
            </TooltipContent>
          </Tooltip>
        )}

        {/* OpenShell Security Button */}
        {onOpenSecurityHUD && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={onOpenSecurityHUD}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-500/30 hover:border-emerald-400 transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)] active:scale-95 group"
              >
                <Shield className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform animate-pulse" />
                <span className="hidden sm:inline font-mono">OpenShell</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              <div className="px-3 py-1.5 text-sm font-mono text-emerald-300">Security & Sandbox Matrix</div>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Agent Space Button */}
        {onToggleAgentSpace && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={onToggleAgentSpace}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 border-cyan-500/30 hover:border-cyan-400 transition-all shadow-[0_0_15px_rgba(0,240,255,0.15)] active:scale-95 group"
              >
                <Bot className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform animate-pulse" />
                <span className="hidden sm:inline font-mono">Agent Space</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              <div className="px-3 py-1.5 text-sm font-mono text-cyan-300">Agent Space</div>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Memory Matrix Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              onClick={onOpenMemoryHUD}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 border-cyan-500/30 hover:border-cyan-400 transition-all shadow-[0_0_15px_rgba(0,240,255,0.15)] active:scale-95 group"
            >
              <Brain className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline font-mono">Memory</span>
              <Badge variant="secondary" className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border-cyan-400/40 text-[10px] font-mono font-bold tabular-nums">
                {memoryCount}
              </Badge>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            <div className="px-3 py-1.5 text-sm font-mono text-cyan-300">4-Tier Memory Matrix Core</div>
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
};