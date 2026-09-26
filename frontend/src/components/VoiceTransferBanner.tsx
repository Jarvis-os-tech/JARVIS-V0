import React from 'react';
import { Cpu, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';

interface VoiceTransferBannerProps {
  banner: {
    from: string;
    to: string;
    voiceName: string;
  } | null;
  onClose?: () => void;
}

export const VoiceTransferBanner: React.FC<VoiceTransferBannerProps> = ({ banner, onClose }) => {
  if (!banner) return null;

  return (
    <div className="w-full max-w-3xl mx-auto mb-6 px-4 animate-fade-in">
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/40 bg-zinc-900/90 p-5 backdrop-blur-xl shadow-2xl shadow-cyan-500/10 text-sm text-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Animated glowing streak */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-500 animate-pulse" />

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0">
            <Cpu className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2 font-mono font-bold text-xs uppercase tracking-wider text-cyan-400">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Voice Transfer Protocol Active</span>
              <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30 text-[10px]">
                Real-Time
              </span>
            </div>
            <div className="flex items-center gap-3 text-lg font-semibold text-zinc-100 mt-1">
              <span className="text-zinc-400">{banner.from}</span>
              <ArrowRight className="w-5 h-5 text-cyan-400 shrink-0" />
              <span className="text-cyan-300 font-bold">{banner.to}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 bg-zinc-950/80 px-4 py-2 rounded-xl border border-white/10 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-zinc-400">Voice ID Locked:</span>
          <span className="font-mono font-bold text-cyan-300">{banner.voiceName}</span>
        </div>
      </div>
    </div>
  );
};
