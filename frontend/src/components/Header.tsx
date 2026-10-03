import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { ConnectionState } from '../types';
import { 
  Globe, 
  Cpu, 
  Brain, 
  Shield, 
  Bot, 
  Volume2, 
  VolumeX, 
  Palette, 
  ChevronDown,
  LayoutGrid,
  Menu
} from 'lucide-react';
import { ConnectorButton } from '@connectors/ui';
import { PwaInstallButton } from './PwaInstallButton';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { THEMES, ThemeId } from '../lib/design-system';
import { sfx } from '../lib/sfx';

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
  currentTheme?: ThemeId;
  onSelectTheme?: (themeId: ThemeId) => void;
  onToggleLeftTelemetry?: () => void;
  onToggleRightTelemetry?: () => void;
}

const statusConfig = {
  connected: {
    label: 'LIVE LINK ACTIVE',
    short: 'LIVE',
    color: 'text-cyan-300 bg-cyan-500/15 border-cyan-400/40',
    pulse: true,
  },
  speaking: {
    label: 'J.A.R.V.I.S. VOCALIZING',
    short: 'SPEAKING',
    color: 'text-blue-300 bg-blue-500/20 border-blue-400/50',
    pulse: false,
  },
  listening: {
    label: 'AUDIO SENSORS ACTIVE',
    short: 'LISTENING',
    color: 'text-sky-300 bg-sky-500/20 border-sky-400/50',
    pulse: true,
  },
  connecting: {
    label: 'SYNCHRONIZING...',
    short: 'SYNC',
    color: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20',
    pulse: false,
  },
  error: {
    label: 'LINK OFFLINE',
    short: 'OFFLINE',
    color: 'text-red-400 bg-red-500/10 border-red-500/20',
    pulse: false,
  },
  demo: {
    label: 'Demo Voice Mode',
    short: 'Demo',
    color: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
    pulse: false,
  },
  disconnected: {
    label: 'STANDBY',
    short: 'STANDBY',
    color: 'text-slate-300 bg-slate-800 border-slate-700',
    pulse: false,
  },
  default: {
    label: 'STANDBY',
    short: 'STANDBY',
    color: 'text-slate-300 bg-slate-800 border-slate-700',
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
  onOpenConnectors,
  onOpenCeoHUD,
  onOpenSecurityHUD,
  onToggleAgentSpace,
  currentTheme = 'cyan',
  onSelectTheme = () => {},
  onToggleLeftTelemetry,
  onToggleRightTelemetry,
}) => {
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isSfxMuted, setIsSfxMuted] = useState(sfx.getMuted());

  const statusKey: StatusKey = isDemoMode ? 'demo' : ((connectionState in statusConfig) ? (connectionState as StatusKey) : 'default');
  const config = statusConfig[statusKey];

  const handleToggleSfx = () => {
    const nextMuted = !isSfxMuted;
    sfx.setMuted(nextMuted);
    setIsSfxMuted(nextMuted);
    if (!nextMuted) sfx.playPip(1600);
  };

  const handleThemeChange = (themeId: ThemeId) => {
    sfx.playPip(1200);
    onSelectTheme(themeId);
    setIsThemeOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-cyan-500/20 bg-[#060a12]/92 backdrop-blur-2xl px-3 sm:px-6 py-2.5 flex items-center justify-between transition-all shadow-[0_12px_36px_rgba(0,0,0,0.65)] select-none">
      
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        {/* Mobile Left Drawer Toggle */}
        {onToggleLeftTelemetry && (
          <button
            onClick={() => {
              sfx.playPip(1000);
              onToggleLeftTelemetry();
            }}
            className="lg:hidden p-2 rounded-xl bg-slate-900 border border-white/5 text-slate-300 hover:text-cyan-300 cursor-pointer"
            title="Toggle Telemetry Wing"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => {
                sfx.playModalOpen();
                onOpenMemoryHUD();
              }}
              className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-0.5 shadow-[0_0_18px_rgba(0,240,255,0.35)] flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
              title="Open Sovereign Memory Vault"
            >
              <div className="w-full h-full bg-[#060a12] rounded-[10px] flex items-center justify-center overflow-hidden relative">
                <div className="absolute inset-0 bg-cyan-500/15 rounded-full animate-pulse" />
                <Cpu className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 relative z-10 drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]" />
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            <div className="px-2 py-1 text-xs font-mono text-cyan-300">Sovereign Memory Core</div>
          </TooltipContent>
        </Tooltip>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-black tracking-[0.25em] text-white font-['Orbitron',sans-serif]">
              <span className="bg-gradient-to-r from-cyan-300 via-sky-200 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(0,240,255,0.4)]">
                J.A.R.V.I.S.
              </span>
            </h1>
            <Badge variant="secondary" className="hidden sm:inline-flex text-[9px] uppercase font-mono font-bold tracking-widest px-1.5 py-0.2 border-cyan-400/30 bg-cyan-500/15 text-cyan-300">
              <Globe className="w-2.5 h-2.5 text-cyan-400 mr-1" />
              AGI OS
            </Badge>
          </div>
          <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 tracking-wide">
            <span>Unit:</span>
            <span className="text-cyan-300 font-semibold">{selectedPersonaName || 'J.A.R.V.I.S.'}</span>
            <span className="text-slate-600">//</span>
            <span className="text-slate-400">Mark 85 HUD</span>
          </p>
        </div>
      </div>

      {/* Right Action Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Status Badge */}
        <Badge
          variant={statusKey === 'demo' ? 'secondary' : 'default'}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border font-mono',
            config.color,
            config.pulse && 'shadow-[0_0_12px_rgba(0,240,255,0.25)]'
          )}
        >
          {config.pulse && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
          <span className="hidden md:inline">{config.label}</span>
          <span className="md:hidden">{config.short}</span>
        </Badge>

        {/* Multi-Armor Theme Shifter Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              sfx.playPip(1100);
              setIsThemeOpen(!isThemeOpen);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-xs font-mono text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Switch Armor HUD Theme"
          >
            <Palette className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden xl:inline text-[11px]">{THEMES[currentTheme]?.name || 'Theme'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isThemeOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-[#0a1120]/95 backdrop-blur-xl border border-cyan-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.7)] p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
              <div className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                Stark Armor Protocols
              </div>
              {(Object.keys(THEMES) as ThemeId[]).map((tId) => {
                const t = THEMES[tId];
                const isActive = currentTheme === tId;
                return (
                  <button
                    key={tId}
                    onClick={() => handleThemeChange(tId)}
                    className={cn(
                      'w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs font-mono transition-all cursor-pointer',
                      isActive ? 'bg-cyan-500/20 text-white font-bold border border-cyan-500/30' : 'text-slate-300 hover:bg-white/5'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.primary }} />
                      <span>{t.name}</span>
                    </div>
                    {isActive && <span className="text-[10px] text-cyan-400">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Audio Synthesizer SFX Mute/Unmute */}
        <button
          onClick={handleToggleSfx}
          className={cn(
            'p-2 rounded-xl border text-xs transition-all cursor-pointer',
            isSfxMuted
              ? 'bg-slate-900 border-white/5 text-slate-500'
              : 'bg-cyan-500/15 border-cyan-400/30 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
          )}
          title={isSfxMuted ? 'Unmute HUD Sound Effects' : 'Mute HUD Sound Effects'}
        >
          {isSfxMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Connectors Directory */}
        <ConnectorButton onOpenDirectory={onOpenConnectors} />

        {/* CEO Executive HUD Button */}
        {onOpenCeoHUD && (
          <button
            onClick={() => {
              sfx.playModalOpen();
              onOpenCeoHUD();
            }}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono font-semibold text-cyan-300 bg-blue-950/40 hover:bg-blue-900/50 border border-cyan-500/30 transition-all cursor-pointer"
            title="Executive CEO HUD"
          >
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden lg:inline">CEO HUD</span>
          </button>
        )}

        {/* OpenShell Security Button */}
        {onOpenSecurityHUD && (
          <button
            onClick={() => {
              sfx.playModalOpen();
              onOpenSecurityHUD();
            }}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono font-semibold text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 transition-all cursor-pointer"
            title="OpenShell Security"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline">OpenShell</span>
          </button>
        )}

        {/* Agent Space Toggle Button */}
        {onToggleAgentSpace && (
          <button
            onClick={() => {
              sfx.playPip(1300);
              onToggleAgentSpace();
            }}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono font-semibold text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 transition-all cursor-pointer"
            title="Agent Space"
          >
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden lg:inline">Agent Space</span>
          </button>
        )}

        {/* Sovereign Memory Trigger */}
        <button
          onClick={() => {
            sfx.playModalOpen();
            onOpenMemoryHUD();
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono font-semibold text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 transition-all cursor-pointer"
          title="Memory Matrix"
        >
          <Brain className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden lg:inline">Memory</span>
          <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
            {memoryCount}
          </span>
        </button>

        {/* PWA Install */}
        <PwaInstallButton />

        {/* Mobile Right Drawer Toggle */}
        {onToggleRightTelemetry && (
          <button
            onClick={() => {
              sfx.playPip(1000);
              onToggleRightTelemetry();
            }}
            className="lg:hidden p-2 rounded-xl bg-slate-900 border border-white/5 text-slate-300 hover:text-cyan-300 cursor-pointer"
            title="Toggle Memory/Tasks Wing"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;