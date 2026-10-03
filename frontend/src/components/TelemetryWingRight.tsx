import React from 'react';
import { BackgroundTask, TriadMemoryItem } from '../types';
import { Brain, Layers, ShieldCheck, Zap, ChevronRight, Activity, Cpu } from 'lucide-react';
import { sfx } from '../lib/sfx';

interface TelemetryWingRightProps {
  memoryCount: number;
  recentMemories: TriadMemoryItem[];
  activeTasks: BackgroundTask[];
  completedTasks: BackgroundTask[];
  onOpenMemoryHUD: () => void;
  onOpenSecurityHUD: () => void;
  onCancelTask: (taskId: string) => void;
  themeColor?: string;
}

export const TelemetryWingRight: React.FC<TelemetryWingRightProps> = ({
  memoryCount,
  recentMemories = [],
  activeTasks = [],
  completedTasks = [],
  onOpenMemoryHUD,
  onOpenSecurityHUD,
  onCancelTask,
  themeColor = '#00f0ff',
}) => {
  const handleOpenMemory = () => {
    sfx.playModalOpen();
    onOpenMemoryHUD();
  };

  const handleOpenSecurity = () => {
    sfx.playModalOpen();
    onOpenSecurityHUD();
  };

  return (
    <aside className="w-full lg:w-72 xl:w-80 flex flex-col gap-3.5 select-none animate-fade-in">
      {/* 1. Sovereign Memory Vault Stream Card */}
      <div className="hud-card rounded-2xl p-3.5 relative overflow-hidden">
        <div className="corner-bracket-tl" />
        <div className="corner-bracket-tr" />
        <div className="corner-bracket-bl" />
        <div className="corner-bracket-br" />

        <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/15">
          <div className="flex items-center gap-2">
            <Brain className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="text-[10.5px] font-mono font-bold tracking-widest text-cyan-300 uppercase">
              Sovereign Memory Stream
            </span>
          </div>
          <button
            onClick={handleOpenMemory}
            className="flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-400/25 transition-colors cursor-pointer"
          >
            <span>{memoryCount} ITEMS</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Live Memory Items Feed */}
        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
          {recentMemories.length === 0 ? (
            <div className="p-3 text-center bg-slate-950/40 rounded-xl border border-white/5">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                [ 4-Tier Memory Vault Synced ]
              </span>
            </div>
          ) : (
            recentMemories.slice(0, 4).map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-2 rounded-xl bg-slate-950/50 border border-white/5 hover:border-cyan-500/30 transition-all text-left"
              >
                <div className="flex items-center justify-between text-[8.5px] font-mono text-cyan-400/80 mb-1">
                  <span className="uppercase font-bold tracking-wider">{item.category}</span>
                  <span className="text-slate-500">LIVE</span>
                </div>
                <p className="text-[11px] font-mono text-slate-300 line-clamp-2 leading-relaxed">
                  {item.content}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Active Parallel Tasks & Operations Dock */}
      <div className="hud-card rounded-2xl p-3.5 relative overflow-hidden flex-1">
        <div className="corner-bracket-tl" />
        <div className="corner-bracket-tr" />
        <div className="corner-bracket-bl" />
        <div className="corner-bracket-br" />

        <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/15">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="text-[10.5px] font-mono font-bold tracking-widest text-cyan-300 uppercase">
              Operations Radar
            </span>
          </div>
          <span className="text-[9px] font-mono text-slate-400">
            {activeTasks.length} RUNNING
          </span>
        </div>

        {/* Task List */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {activeTasks.length === 0 && completedTasks.length === 0 ? (
            <div className="p-4 text-center bg-slate-950/40 rounded-xl border border-white/5">
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                Autonomous agent dock standby
              </p>
            </div>
          ) : (
            <>
              {activeTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-2 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
                    <div className="truncate">
                      <div className="text-[11px] font-mono font-semibold text-white truncate">
                        {task.title || task.prompt || task.type}
                      </div>
                      <div className="text-[9px] font-mono text-cyan-400/80">
                        Agent executing...
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      sfx.playWarning();
                      onCancelTask(task.id);
                    }}
                    className="text-[9px] font-mono text-rose-400 hover:text-rose-300 px-1.5 py-0.5 rounded bg-rose-500/10 cursor-pointer"
                  >
                    HALT
                  </button>
                </div>
              ))}

              {completedTasks.slice(0, 2).map((task) => (
                <div
                  key={task.id}
                  className="p-2 rounded-xl bg-slate-950/40 border border-emerald-500/20 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-emerald-400 text-xs">✓</span>
                    <span className="text-[10.5px] font-mono text-slate-300 truncate">
                      {task.title || task.prompt || task.type}
                    </span>
                  </div>
                  <span className="text-[8.5px] font-mono text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded">
                    DONE
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* 3. OpenShell Security Containment Badge */}
      <button
        onClick={handleOpenSecurity}
        className="hud-card rounded-2xl p-2.5 px-3.5 relative overflow-hidden flex items-center justify-between group hover:border-emerald-400/50 cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-left">
            <div className="text-xs font-mono font-bold text-white group-hover:text-emerald-300 transition-colors">
              OpenShell Sandbox
            </div>
            <div className="text-[9.5px] font-mono text-slate-400">
              Boundary: Loopback Protected
            </div>
          </div>
        </div>
        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-bold uppercase">
          SECURE
        </span>
      </button>
    </aside>
  );
};

export default TelemetryWingRight;
