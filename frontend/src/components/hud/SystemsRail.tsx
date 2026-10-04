import React from 'react';
import { ConnectionState } from '../../types';

interface SystemsRailProps {
  connectionState: ConnectionState;
  memoryCount: number;
  activeTasksCount: number;
  themeColor?: string;
  onOpenConnectors?: () => void;
  onOpenMemoryHUD?: () => void;
  onOpenSecurityHUD?: () => void;
}

export const SystemsRail: React.FC<SystemsRailProps> = ({
  connectionState,
  memoryCount,
  activeTasksCount,
  themeColor = '#00f0ff',
  onOpenConnectors,
  onOpenMemoryHUD,
  onOpenSecurityHUD,
}) => {
  const isCoreLive = connectionState !== 'disconnected' && connectionState !== 'error';
  const isSpeaking = connectionState === 'speaking';

  const systems = [
    {
      id: 'core',
      label: 'NEURAL CORE',
      status: isSpeaking ? 'VOCALIZING' : isCoreLive ? 'SYNCED' : 'STANDBY',
      active: isCoreLive,
      color: isSpeaking ? '#38bdf8' : isCoreLive ? '#10b981' : '#64748b',
    },
    {
      id: 'network',
      label: 'GATEWAY',
      status: connectionState === 'connecting' ? 'SYNCING' : isCoreLive ? '127.0.0.1:3000' : 'STANDBY',
      active: isCoreLive,
      color: isCoreLive ? '#00f0ff' : '#64748b',
    },
    {
      id: 'memory',
      label: 'MEMORY VAULT',
      status: `${memoryCount} ITEMS`,
      active: true,
      color: '#00f0ff',
      onClick: onOpenMemoryHUD,
    },
    {
      id: 'security',
      label: 'SECURITY',
      status: 'SANDBOX SECURE',
      active: true,
      color: '#10b981',
      onClick: onOpenSecurityHUD,
    },
    {
      id: 'connectors',
      label: 'MCP TOOLS',
      status: activeTasksCount > 0 ? `${activeTasksCount} ACTIVE` : 'READY',
      active: activeTasksCount > 0,
      color: activeTasksCount > 0 ? '#f59e0b' : '#38bdf8',
      onClick: onOpenConnectors,
    },
  ];

  return (
    <aside className="rail rail-left w-48 sm:w-56 p-3.5 rounded-2xl bg-[#060e1a]/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] select-none">
      <div className="flex items-center justify-between pb-2 mb-1 border-b border-cyan-500/15">
        <span className="rail-title !mb-0 tracking-[0.3em]">SYSTEM STATUS</span>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-400/20">
          NODE 01
        </span>
      </div>

      <div className="space-y-2 mt-1">
        {systems.map((sys) => {
          return (
            <div
              key={sys.id}
              onClick={sys.onClick}
              className={`flex items-center justify-between py-1.5 px-2 rounded-lg transition-all ${
                sys.onClick ? 'cursor-pointer hover:bg-cyan-500/10 hover:border-cyan-500/30' : ''
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="tick"
                  style={{
                    backgroundColor: sys.color,
                    boxShadow: sys.active ? `0 0 8px ${sys.color}` : 'none',
                  }}
                />
                <span className="text-[11px] font-mono font-medium tracking-wide text-slate-200">
                  {sys.label}
                </span>
              </div>
              <span
                className="text-[9.5px] font-mono font-semibold truncate max-w-[80px]"
                style={{ color: sys.color }}
              >
                {sys.status}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-2.5 pt-2 border-t border-cyan-500/10 flex items-center justify-between text-[9px] font-mono text-slate-400">
        <span>PWR: 99.4%</span>
        <span>TEMP: 34°C</span>
      </div>
    </aside>
  );
};

export default SystemsRail;
