import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Brain, 
  Bot, 
  ChevronLeft, 
  ChevronRight, 
  Shield, 
  Network, 
  Sparkles,
  Zap,
  Activity
} from 'lucide-react';
import { sfx } from '../lib/sfx';

export type NavView = 'dashboard' | 'tasks' | 'memory' | 'agents';

interface NavigationSidebarProps {
  activeView: NavView;
  onSelectView: (view: NavView) => void;
  activeTasksCount: number;
  memoryCount: number;
  isVoiceActive: boolean;
  onOpenConnectors: () => void;
  onOpenSecurityHUD: () => void;
  themeColor?: string;
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  activeView,
  onSelectView,
  activeTasksCount,
  memoryCount,
  isVoiceActive,
  onOpenConnectors,
  onOpenSecurityHUD,
  themeColor = '#00f0ff',
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleNavClick = (view: NavView) => {
    sfx.playPip(view === activeView ? 1100 : 1400);
    onSelectView(view);
  };

  const navItems: { id: NavView; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number | string; badgeColor?: string }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: CheckSquare,
      badge: activeTasksCount > 0 ? activeTasksCount : undefined,
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 animate-pulse',
    },
    {
      id: 'memory',
      label: 'Memory',
      icon: Brain,
      badge: memoryCount > 0 ? memoryCount : undefined,
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
    },
    {
      id: 'agents',
      label: 'Agents',
      icon: Bot,
      badge: '5 A2A',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
    },
  ];

  return (
    <aside 
      className={`relative z-30 shrink-0 flex flex-col justify-between transition-all duration-300 ease-in-out border-r border-cyan-500/20 bg-[#030712]/95 backdrop-blur-xl ${
        isCollapsed ? 'w-16' : 'w-56'
      }`}
      style={{
        boxShadow: '4px 0 24px rgba(0, 0, 0, 0.6), 1px 0 0 rgba(0, 240, 255, 0.12)'
      }}
    >
      {/* Top Branding Section */}
      <div className="flex flex-col">
        <div className={`p-4 border-b border-cyan-500/15 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            {/* Holographic Arc Reactor Core Icon */}
            <div 
              className="relative w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-400/40 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,240,255,0.3)] group cursor-pointer"
              onClick={() => handleNavClick('dashboard')}
              title="J.A.R.V.I.S. Core"
            >
              <Zap className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              {isVoiceActive && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              )}
            </div>

            {!isCollapsed && (
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-['Orbitron',sans-serif] font-bold text-xs tracking-wider text-white">
                    J.A.R.V.I.S.
                  </span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold">
                    OS v4
                  </span>
                </div>
                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">
                  Autonomous Core
                </span>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              onClick={() => {
                sfx.playPip(1000);
                setIsCollapsed(true);
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors cursor-pointer"
              title="Collapse Sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Collapsed Expand Trigger */}
        {isCollapsed && (
          <div className="p-2 flex justify-center">
            <button
              onClick={() => {
                sfx.playPip(1200);
                setIsCollapsed(false);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors cursor-pointer"
              title="Expand Sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Primary Navigation Buttons: Dashboard, Tasks, Memory, Agents */}
        <nav className="p-2 space-y-1.5 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center rounded-xl transition-all duration-200 group relative cursor-pointer ${
                  isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/25 via-cyan-500/10 to-transparent text-cyan-200 border-l-2 border-cyan-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_16px_rgba(0,240,255,0.2)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border-l-2 border-transparent'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1 rounded-lg transition-transform group-hover:scale-110 ${
                    isActive ? 'text-cyan-300' : 'text-slate-400 group-hover:text-cyan-400'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {!isCollapsed && (
                    <span className={`text-xs font-mono font-medium tracking-wide ${
                      isActive ? 'text-white font-bold' : ''
                    }`}>
                      {item.label}
                    </span>
                  )}
                </div>

                {/* Badges */}
                {!isCollapsed && item.badge !== undefined && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                    {item.badge}
                  </span>
                )}

                {/* Collapsed dot badge */}
                {isCollapsed && item.badge !== undefined && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-[#030712]" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Auxiliary Controls */}
      <div className="p-2 border-t border-cyan-500/15 flex flex-col gap-1.5">
        {/* Connectors / MCP Button */}
        <button
          onClick={() => {
            sfx.playPip(1300);
            onOpenConnectors();
          }}
          className={`w-full flex items-center rounded-xl p-2 text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors cursor-pointer ${
            isCollapsed ? 'justify-center' : 'gap-3 px-3'
          }`}
          title="Model Context Protocol Connectors"
        >
          <Network className="w-4 h-4 shrink-0 text-sky-400" />
          {!isCollapsed && (
            <span className="text-xs font-mono">Connectors</span>
          )}
        </button>

        {/* Security Sandbox HUD */}
        <button
          onClick={() => {
            sfx.playPip(1300);
            onOpenSecurityHUD();
          }}
          className={`w-full flex items-center rounded-xl p-2 text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors cursor-pointer ${
            isCollapsed ? 'justify-center' : 'gap-3 px-3'
          }`}
          title="NVIDIA OpenShell Security Matrix"
        >
          <Shield className="w-4 h-4 shrink-0 text-emerald-400" />
          {!isCollapsed && (
            <span className="text-xs font-mono">Security</span>
          )}
        </button>

        {/* Live System Status Pill */}
        <div className={`mt-1 p-2 rounded-xl bg-slate-950/80 border border-cyan-500/15 flex items-center ${
          isCollapsed ? 'justify-center' : 'justify-between'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isVoiceActive ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'}`} />
            {!isCollapsed && (
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                {isVoiceActive ? 'NEURAL LINK' : 'STANDBY'}
              </span>
            )}
          </div>
          {!isCollapsed && (
            <Activity className="w-3 h-3 text-cyan-400/60" />
          )}
        </div>
      </div>
    </aside>
  );
};
