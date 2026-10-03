import React, { useState, useEffect } from 'react';
import {
  BackgroundTask,
  TaskCategory,
  SkillDisplayCard,
} from '../types';
import {
  Zap,
  Activity,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  ChevronDown,
  CloudSun,
  Newspaper,
  Bell,
  Search,
  FileText,
  Bot,
  Calculator,
  Cpu,
  Layers,
  Sparkles,
  ExternalLink,
  Code2,
  ShieldAlert,
  Radio,
  Send,
} from 'lucide-react';

interface ParallelTaskDockProps {
  activeTasks: BackgroundTask[];
  completedTasks: BackgroundTask[];
  onCancelTask: (taskId: string) => void;
  onSelectDisplayCard: (card: SkillDisplayCard) => void;
  onDismissCompletedTask?: (taskId: string) => void;
}

export const ParallelTaskDock: React.FC<ParallelTaskDockProps> = ({
  activeTasks,
  completedTasks,
  onCancelTask,
  onSelectDisplayCard,
  onDismissCompletedTask,
}) => {
  const [isOpenHistory, setIsOpenHistory] = useState(false);
  const [nowTime, setNowTime] = useState<number>(Date.now());

  // Live timer tick for active task durations
  useEffect(() => {
    if (activeTasks.length === 0) return;
    const interval = setInterval(() => {
      setNowTime(Date.now());
    }, 200);
    return () => clearInterval(interval);
  }, [activeTasks.length]);

  const getCategoryIcon = (category: TaskCategory, className = 'w-3.5 h-3.5') => {
    switch (category) {
      case 'hermes':
        return <Bot className={className} />;
      case 'prime_agent':
        return <Code2 className={className} />;
      case 'ultron':
        return <ShieldAlert className={className} />;
      case 'system':
        return <Activity className={className} />;
      case 'weather':
        return <CloudSun className={className} />;
      case 'news':
        return <Newspaper className={className} />;
      case 'productivity':
        return <Bell className={className} />;
      case 'obsidian':
        return <FileText className={className} />;
      case 'research':
        return <Search className={className} />;
      case 'calculation':
        return <Calculator className={className} />;
      default:
        return <Cpu className={className} />;
    }
  };

  const getCategoryColor = (category: TaskCategory) => {
    switch (category) {
      case 'hermes':
        return 'text-purple-400 border-purple-500/30 bg-purple-950/70';
      case 'prime_agent':
        return 'text-indigo-400 border-indigo-500/30 bg-indigo-950/70';
      case 'ultron':
        return 'text-red-400 border-red-500/30 bg-red-950/70';
      case 'system':
        return 'text-teal-400 border-teal-500/30 bg-teal-950/70';
      case 'weather':
        return 'text-sky-400 border-sky-500/30 bg-sky-950/70';
      case 'news':
        return 'text-blue-400 border-blue-500/30 bg-blue-950/70';
      case 'productivity':
        return 'text-amber-400 border-amber-500/30 bg-amber-950/70';
      case 'obsidian':
        return 'text-emerald-400 border-emerald-500/30 bg-emerald-950/70';
      case 'research':
        return 'text-cyan-400 border-cyan-500/30 bg-cyan-950/70';
      default:
        return 'text-slate-300 border-slate-700 bg-slate-900/80';
    }
  };

  const hasTasks = activeTasks.length > 0 || completedTasks.length > 0;

  return (
    <div
      id="parallel-task-dock"
      className="w-full max-w-2xl mx-auto my-2 px-2 transition-all"
    >
      {/* 24/7 Fleet & Presence Status Strip */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 mb-2.5 rounded-xl bg-[#09101d]/90 border border-cyan-500/20 backdrop-blur-md text-[11px] font-mono shadow-[0_4px_18px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar">
          <span className="flex items-center gap-1.5 text-cyan-400 font-bold shrink-0 tracking-wider">
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>SWARM FLEET:</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-950/70 border border-purple-500/40 text-purple-300 shrink-0 font-medium shadow-[0_0_8px_rgba(168,85,247,0.2)]">
            <Bot className="w-3 h-3 text-purple-400" />
            Hermes (Lead Engineer)
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 shrink-0">
            <Code2 className="w-2.5 h-2.5" />
            Prime Agent
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-950/60 border border-red-500/40 text-red-300 shrink-0">
            <ShieldAlert className="w-2.5 h-2.5" />
            Ultron
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 font-medium text-[10px] font-mono shadow-[0_0_8px_rgba(16,185,129,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            PARALLEL BUS READY
          </span>
        </div>
      </div>

      {/* Active Running Background Delegations */}
      {activeTasks.length > 0 && (
        <div className="space-y-2 mb-2">
          {activeTasks.map((task) => {
            const elapsedSec = ((nowTime - task.startTime) / 1000).toFixed(1);
            return (
              <div
                key={task.id}
                className="relative overflow-hidden rounded-2xl border border-cyan-400/50 bg-[#09101d]/95 p-3.5 shadow-[0_12px_36px_rgba(0,0,0,0.6),0_0_20px_rgba(0,240,255,0.18)] backdrop-blur-2xl flex items-center justify-between gap-3 animate-pulse"
              >
                {/* Background progress bar shimmer */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-transparent pointer-events-none transition-all duration-300"
                  style={{ width: `${task.progressPercent || 25}%` }}
                />

                <div className="flex items-center gap-3 min-w-0 z-10">
                  <div className="p-2 rounded-xl bg-cyan-950/90 border border-cyan-400/40 text-cyan-300 shrink-0 shadow-[0_0_12px_rgba(0,240,255,0.3)]">
                    <Zap className="w-4 h-4 animate-spin text-cyan-400" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase border ${getCategoryColor(task.type)} shadow-sm`}>
                        {getCategoryIcon(task.type, 'w-2.5 h-2.5')}
                        {task.type.replace('_', ' ')}
                      </span>
                      <span className="text-xs font-bold text-white truncate max-w-xs sm:max-w-md">
                        {task.title}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-cyan-300/90 truncate">
                      {task.progressMessage || 'Processing in parallel background...'} ({task.progressPercent || 15}%)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 z-10">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-950/90 border border-cyan-500/30 font-mono text-[11px] font-bold tabular-nums text-cyan-300 shadow-sm">
                    {elapsedSec}s
                  </span>
                  <button
                    onClick={() => onCancelTask(task.id)}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950/80 hover:text-rose-400 text-slate-400 border border-slate-700/50 transition-colors active:scale-95"
                    title="Cancel Task"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed Tasks Accordion */}
      {completedTasks.length > 0 && (
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-md overflow-hidden text-xs">
          <button
            onClick={() => setIsOpenHistory(!isOpenHistory)}
            className="w-full flex items-center justify-between px-3 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 transition-colors font-mono text-[11px]"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Parallel History ({completedTasks.length} completed)</span>
            </div>
            {isOpenHistory ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>

          {isOpenHistory && (
            <div className="divide-y divide-slate-800/60 max-h-56 overflow-y-auto px-1 py-1">
              {completedTasks.slice(0, 10).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 hover:bg-slate-900/50 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {t.status === 'completed' ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                    )}
                    <span className="font-medium text-slate-200 truncate max-w-xs">
                      {t.title}
                    </span>
                    {t.durationMs !== undefined && (
                      <span className="font-mono text-[10px] text-slate-400 shrink-0">
                        {t.durationMs < 1000 ? `${t.durationMs}ms` : `${(t.durationMs / 1000).toFixed(1)}s`}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {t.displayCard && (
                      <button
                        onClick={() => onSelectDisplayCard(t.displayCard!)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] transition-colors"
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        Inspect Card
                      </button>
                    )}
                    {onDismissCompletedTask && (
                      <button
                        onClick={() => onDismissCompletedTask(t.id)}
                        className="p-1 text-slate-500 hover:text-slate-300 rounded"
                        title="Dismiss"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
