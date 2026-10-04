import React, { useState, useEffect } from 'react';
import { BackgroundTask, TaskCategory, SkillDisplayCard } from '../../types';
import { 
  CheckSquare, 
  Play, 
  Square, 
  Trash2, 
  Clock, 
  Zap, 
  AlertCircle, 
  CheckCircle2, 
  Bot, 
  Cpu, 
  Code2, 
  ShieldAlert, 
  Activity, 
  CloudSun, 
  Newspaper, 
  Bell, 
  Search, 
  FileText, 
  Calculator,
  ChevronDown,
  ChevronRight,
  Send,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { sfx } from '../../lib/sfx';

interface TasksViewProps {
  activeTasks: BackgroundTask[];
  completedTasks: BackgroundTask[];
  continuousPlan: any | null;
  onCancelTask: (taskId: string) => void;
  onDismissCompletedTask?: (taskId: string) => void;
  onSelectDisplayCard?: (card: SkillDisplayCard) => void;
  onSendPrompt: (prompt: string) => void;
  onCancelContinuousPlan?: () => void;
  themeColor?: string;
}

export const TasksView: React.FC<TasksViewProps> = ({
  activeTasks,
  completedTasks,
  continuousPlan,
  onCancelTask,
  onDismissCompletedTask,
  onSelectDisplayCard,
  onSendPrompt,
  onCancelContinuousPlan,
  themeColor = '#00f0ff',
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [quickInput, setQuickInput] = useState('');
  const [nowTime, setNowTime] = useState<number>(Date.now());
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (activeTasks.length === 0) return;
    const interval = setInterval(() => {
      setNowTime(Date.now());
    }, 250);
    return () => clearInterval(interval);
  }, [activeTasks.length]);

  const handleQuickDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    sfx.playPip(1500);
    onSendPrompt(quickInput.trim());
    setQuickInput('');
  };

  const getCategoryIcon = (category: TaskCategory, className = 'w-4 h-4') => {
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

  const getCategoryBadgeClass = (category: TaskCategory) => {
    switch (category) {
      case 'hermes':
        return 'text-purple-300 border-purple-500/40 bg-purple-950/60';
      case 'prime_agent':
        return 'text-indigo-300 border-indigo-500/40 bg-indigo-950/60';
      case 'ultron':
        return 'text-red-300 border-red-500/40 bg-red-950/60';
      case 'system':
        return 'text-teal-300 border-teal-500/40 bg-teal-950/60';
      default:
        return 'text-cyan-300 border-cyan-500/40 bg-cyan-950/60';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const sec = Math.floor(ms / 1000);
    const min = Math.floor(sec / 60);
    if (min > 0) return `${min}m ${sec % 60}s`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const displayedActive = filter === 'completed' ? [] : activeTasks;
  const displayedCompleted = filter === 'active' ? [] : completedTasks;

  return (
    <div className="w-full flex-1 max-w-7xl mx-auto px-4 sm:px-8 py-6 flex flex-col gap-6 animate-fade-in text-slate-100">
      
      {/* Top Header & Metrics Bar */}
      <div className="relative p-6 rounded-3xl bg-[#040c1a]/85 border border-cyan-500/30 backdrop-blur-xl shadow-[0_0_50px_rgba(0,240,255,0.12)] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="corner-bracket-tl" />
        <div className="corner-bracket-tr" />
        <div className="corner-bracket-bl" />
        <div className="corner-bracket-br" />

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.35)] shrink-0">
            <CheckSquare className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-['Orbitron',sans-serif] text-xl font-bold tracking-wider text-white">
                TASK DIRECTORY
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase tracking-widest font-semibold">
                Autonomous
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-1">
              Parallel sub-agents, asynchronous worker threads &amp; desktop automation
            </p>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-950/80 border border-cyan-500/20 flex flex-col items-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Active</span>
            <span className="text-lg font-bold font-mono text-cyan-300">{activeTasks.length}</span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-slate-950/80 border border-cyan-500/20 flex flex-col items-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Completed</span>
            <span className="text-lg font-bold font-mono text-emerald-300">{completedTasks.length}</span>
          </div>
          {continuousPlan && (
            <div className="px-4 py-2 rounded-xl bg-purple-950/70 border border-purple-500/40 flex flex-col items-center animate-pulse">
              <span className="text-[10px] font-mono text-purple-300 uppercase tracking-wider">Workflow</span>
              <span className="text-xs font-bold font-mono text-white mt-1">RUNNING</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Task Dispatch Input */}
      <form onSubmit={handleQuickDispatch} className="relative flex items-center">
        <input
          type="text"
          value={quickInput}
          onChange={(e) => setQuickInput(e.target.value)}
          placeholder="Dispatch a new autonomous task (e.g. 'Search latest AI papers and summarize in notes')..."
          className="w-full bg-[#060e1d]/90 border border-cyan-500/35 rounded-2xl py-3.5 pl-5 pr-32 text-sm text-cyan-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all shadow-[0_0_25px_rgba(0,0,0,0.5)] font-mono"
        />
        <button
          type="submit"
          disabled={!quickInput.trim()}
          className="absolute right-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-slate-950 font-bold text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Dispatch</span>
        </button>
      </form>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-2">
        <button
          onClick={() => { sfx.playPip(1000); setFilter('all'); }}
          className={`px-4 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 font-bold shadow-[0_0_15px_rgba(0,240,255,0.2)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          All Operations ({activeTasks.length + completedTasks.length})
        </button>
        <button
          onClick={() => { sfx.playPip(1000); setFilter('active'); }}
          className={`px-4 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer flex items-center gap-2 ${
            filter === 'active'
              ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 font-bold shadow-[0_0_15px_rgba(0,240,255,0.2)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <span>Active</span>
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>({activeTasks.length})</span>
        </button>
        <button
          onClick={() => { sfx.playPip(1000); setFilter('completed'); }}
          className={`px-4 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer ${
            filter === 'completed'
              ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 font-bold shadow-[0_0_15px_rgba(0,240,255,0.2)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          Archive ({completedTasks.length})
        </button>
      </div>

      {/* Continuous Workflow Banner if Active */}
      {continuousPlan && (
        <div className="p-5 rounded-2xl border border-purple-500/40 bg-purple-950/30 backdrop-blur-md shadow-[0_0_30px_rgba(168,85,247,0.15)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-purple-400 animate-spin" />
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-purple-300 font-bold">
                  Active Continuous Desktop Plan
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">
                  {continuousPlan.title || 'Multi-step Coworker Automation'}
                </h3>
              </div>
            </div>
            {onCancelContinuousPlan && (
              <button
                onClick={onCancelContinuousPlan}
                className="px-3 py-1.5 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-300 hover:bg-rose-900 text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop Plan</span>
              </button>
            )}
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
            {(continuousPlan.steps || []).map((step: any, idx: number) => (
              <div 
                key={idx} 
                className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2.5 ${
                  step.status === 'completed'
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : step.status === 'running'
                    ? 'bg-purple-950/60 border-purple-400/50 text-purple-200 animate-pulse'
                    : step.status === 'failed'
                    ? 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <span className="font-bold">
                  {step.status === 'completed' ? '✓' : step.status === 'running' ? '▶' : step.status === 'failed' ? '✗' : '·'}
                </span>
                <span className="truncate">{step.label || `Step ${idx + 1}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Tasks Grid */}
      {displayedActive.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <h2 className="text-xs font-mono uppercase tracking-widest text-cyan-300 font-bold">
              Active Executions ({displayedActive.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedActive.map((task) => {
              const elapsed = nowTime - task.startTime;
              return (
                <div
                  key={task.id}
                  className="p-5 rounded-2xl bg-[#061022]/90 border border-cyan-500/35 backdrop-blur-md shadow-[0_0_30px_rgba(0,240,255,0.1)] flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl border ${getCategoryBadgeClass(task.type)} shrink-0`}>
                        {getCategoryIcon(task.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border text-cyan-300 border-cyan-500/30 bg-cyan-950/40">
                            {task.type}
                          </span>
                          <span className="text-[11px] font-mono text-cyan-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(elapsed)}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white mt-1.5 leading-snug">
                          {task.title}
                        </h3>
                        {task.prompt && (
                          <p className="text-xs font-mono text-slate-400 mt-1 line-clamp-2">
                            {task.prompt}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => onCancelTask(task.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-700/60 hover:border-rose-500/40 transition-colors cursor-pointer"
                      title="Abort Task"
                    >
                      <Square className="w-4 h-4 fill-current" />
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>{task.progressMessage || 'Synthesizing output...'}</span>
                      <span>{task.progressPercent || 65}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-cyan-500/20">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 rounded-full animate-pulse transition-all duration-300"
                        style={{ width: `${task.progressPercent || 65}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Tasks Archive */}
      {displayedCompleted.length > 0 && (
        <div className="flex flex-col gap-3 mt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold">
              Completed Operations ({displayedCompleted.length})
            </h2>
          </div>

          <div className="flex flex-col gap-3">
            {displayedCompleted.map((task) => {
              const isExpanded = expandedTaskId === task.id;
              return (
                <div
                  key={task.id}
                  className="p-4 rounded-2xl bg-[#040916]/80 border border-cyan-500/20 hover:border-cyan-500/40 backdrop-blur-md transition-all flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border text-slate-400 border-slate-700 bg-slate-900/60">
                            {task.type}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400">
                            COMPLETED {task.durationMs ? `(${formatDuration(task.durationMs)})` : ''}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-white mt-1">
                          {task.title}
                        </h4>
                        {task.speechSummary && (
                          <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                            {task.speechSummary}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {task.displayCard && onSelectDisplayCard && (
                        <button
                          onClick={() => onSelectDisplayCard(task.displayCard!)}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 text-xs font-mono transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      )}
                      {onDismissCompletedTask && (
                        <button
                          onClick={() => onDismissCompletedTask(task.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Dismiss"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Result Payload */}
                  {isExpanded && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/20 text-xs font-mono overflow-x-auto text-slate-300 mt-2">
                      <div className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold mb-2">
                        Execution Payload &amp; Diagnostics:
                      </div>
                      <pre className="whitespace-pre-wrap leading-relaxed">
                        {typeof task.result === 'object' ? JSON.stringify(task.result, null, 2) : task.result || task.speechSummary || 'Task completed successfully.'}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {displayedActive.length === 0 && displayedCompleted.length === 0 && !continuousPlan && (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(0,240,255,0.2)] mb-4">
            <CheckSquare className="w-8 h-8 text-cyan-400" />
          </div>
          <h3 className="font-['Orbitron',sans-serif] text-base font-bold text-white tracking-wider">
            TASK DOCK IDLE
          </h3>
          <p className="text-xs font-mono text-slate-400 max-w-sm mt-2">
            No background tasks or sub-agent operations currently executing. Dispatch a request above or speak to J.A.R.V.I.S.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            <button
              onClick={() => onSendPrompt('Check current system status, memory and CPU usage')}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono transition-colors cursor-pointer"
            >
              + System Diagnostics
            </button>
            <button
              onClick={() => onSendPrompt('Plan a continuous research workflow on autonomous AI agents')}
              className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono transition-colors cursor-pointer"
            >
              + Launch Coworker Plan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
