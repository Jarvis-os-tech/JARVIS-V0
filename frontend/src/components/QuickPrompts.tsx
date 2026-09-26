import React from 'react';
import { QuickPrompt } from '../types';
import { Code, Server, Globe, ShieldCheck, Layout, Cpu, Sparkles } from 'lucide-react';

interface QuickPromptsProps {
  prompts: QuickPrompt[];
  onSelectPrompt: (prompt: string) => void;
  disabled?: boolean;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Code: <Code className="w-4 h-4 text-cyan-400" />,
  Server: <Server className="w-4 h-4 text-emerald-400" />,
  Globe: <Globe className="w-4 h-4 text-amber-400" />,
  ShieldCheck: <ShieldCheck className="w-4 h-4 text-indigo-400" />,
  Layout: <Layout className="w-4 h-4 text-rose-400" />,
  Cpu: <Cpu className="w-4 h-4 text-sky-400" />
};

export const QuickPrompts: React.FC<QuickPromptsProps> = ({
  prompts,
  onSelectPrompt,
  disabled,
}) => {
  return (
    <div className="w-full max-w-2xl mx-auto my-2 px-4">
      <p className="text-center text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-2.5">
        Tap a quick topic or ask verbal question to your dev team
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {prompts.map((p) => {
          const icon = ICON_MAP[p.iconName] || <Sparkles className="w-4 h-4 text-cyan-400" />;

          return (
            <button
              key={p.id}
              onClick={() => onSelectPrompt(p.prompt)}
              disabled={disabled}
              className="flex items-center gap-2 px-3.5 py-2 rounded-full glass-pill hover:bg-white/15 text-xs font-medium text-zinc-200 shadow-md transition-all hover:scale-105 disabled:opacity-50 cursor-pointer border border-white/10"
            >
              {icon}
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
