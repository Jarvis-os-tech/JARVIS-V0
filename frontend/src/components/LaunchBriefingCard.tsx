import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Activity, 
  Cpu, 
  MessageSquareCode,
  Compass
} from 'lucide-react';

export interface LaunchBriefing {
  signatureGreeting: string;
  lastDone: string;
  previousContext: string;
  forwardSteps: string[];
  spokenText?: string;
  timestamp?: number;
}

interface LaunchBriefingCardProps {
  briefing: LaunchBriefing | null;
  onDismiss: () => void;
  onExecuteStep?: (step: string) => void;
}

export const LaunchBriefingCard: React.FC<LaunchBriefingCardProps> = ({
  briefing,
  onDismiss,
  onExecuteStep
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!briefing) return null;

  return (
    <div className="w-full max-w-4xl my-3 animate-fade-in relative z-20">
      <div className="relative rounded-2xl bg-[#09111e]/90 border border-cyan-500/30 backdrop-blur-xl shadow-[0_0_30px_rgba(0,240,255,0.08)] overflow-hidden transition-all duration-300">
        {/* Hologram top edge scanner line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />

        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-cyan-950/30 border-b border-cyan-500/20">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff] animate-ping" />
            <span className="font-mono text-[11px] tracking-wider uppercase text-cyan-300 font-semibold flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              J.A.R.V.I.S. Launch Briefing // Signature Protocol Verified
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded-lg hover:bg-cyan-500/10 text-cyan-400/80 hover:text-cyan-300 transition-colors"
              title={isCollapsed ? 'Expand Briefing' : 'Collapse Briefing'}
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
            <button
              onClick={onDismiss}
              className="p-1 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
              title="Dismiss Briefing"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        {!isCollapsed && (
          <div className="p-4 sm:p-5 flex flex-col gap-4 text-xs">
            {/* Signature Greeting Banner */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-100">
              <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[10px] uppercase text-cyan-400/80 font-bold tracking-widest">
                  Verbal Signature Acknowledgment
                </span>
                <p className="text-sm font-medium text-white tracking-wide">
                  "{briefing.signatureGreeting}"
                </p>
              </div>
            </div>

            {/* Grid: Last Done & Previous Context */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* What We Have Last Done */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-700/50 flex flex-col gap-1.5 hover:border-cyan-500/30 transition-colors">
                <div className="flex items-center gap-2 text-cyan-400 font-mono text-[11px] font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Recent Operations // Last Done</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11.5px]">
                  {briefing.lastDone}
                </p>
              </div>

              {/* Previous Questions & Comments Context */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-700/50 flex flex-col gap-1.5 hover:border-cyan-500/30 transition-colors">
                <div className="flex items-center gap-2 text-cyan-400 font-mono text-[11px] font-semibold">
                  <MessageSquareCode className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Episodic Memory // Previous Queries</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11.5px]">
                  {briefing.previousContext}
                </p>
              </div>
            </div>

            {/* Clear Forward Steps */}
            <div className="flex flex-col gap-2 pt-1 border-t border-cyan-500/10">
              <div className="flex items-center justify-between text-cyan-400 font-mono text-[11px] font-semibold">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-300" />
                  Clear Forward Steps Primed
                </span>
                <span className="text-[10px] text-cyan-400/60 uppercase">Click any step to dispatch</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {briefing.forwardSteps.map((step, idx) => (
                  <button
                    key={idx}
                    onClick={() => onExecuteStep?.(step)}
                    className="group p-2.5 rounded-xl bg-slate-950/70 border border-cyan-500/20 hover:border-cyan-400/60 hover:bg-cyan-950/30 transition-all text-left flex flex-col justify-between gap-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[9px] font-bold">
                        STEP 0{idx + 1}
                      </span>
                      <ArrowRight className="w-3 h-3 text-cyan-400/60 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <span className="text-slate-200 group-hover:text-white text-[11px] leading-snug">
                      {step}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
