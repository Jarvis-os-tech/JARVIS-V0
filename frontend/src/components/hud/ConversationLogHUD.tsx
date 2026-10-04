import React from 'react';
import { ConversationMessage } from '../../types';
import { DecodeText } from './DecodeText';
import { Terminal, Sparkles } from 'lucide-react';

interface ConversationLogHUDProps {
  messages: ConversationMessage[];
  personaName?: string;
  themeColor?: string;
  className?: string;
}

export const ConversationLogHUD: React.FC<ConversationLogHUDProps> = ({
  messages,
  personaName = 'J.A.R.V.I.S.',
  themeColor = '#00f0ff',
  className = '',
}) => {
  // Take the last 3-4 messages for the ambient HUD view
  const recentMessages = messages.slice(-4);

  if (recentMessages.length === 0) {
    return (
      <div className={`w-full max-w-2xl px-4 py-3 rounded-xl bg-[#030914]/60 border border-cyan-500/20 backdrop-blur-md text-center ${className}`}>
        <p className="text-[11px] font-mono text-cyan-400/60 tracking-wider">
          <span className="animate-pulse">▶</span> AWAITING VOCAL TRANSMISSION OR TEXT COMMAND...
        </p>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-2xl p-3.5 rounded-2xl bg-[#030914]/75 border border-cyan-500/25 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] ${className}`}>
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/15">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[9px] font-mono tracking-[0.25em] text-cyan-300 uppercase font-bold">
            Holographic Transcript Stream
          </span>
        </div>
        <span className="text-[8.5px] font-mono text-slate-500">
          CH-01 // REALTIME
        </span>
      </div>

      <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
        {recentMessages.map((msg, idx) => {
          const isAgent = msg.sender === 'agent' || msg.sender === 'system';
          const isLatest = idx === recentMessages.length - 1;

          return (
            <div
              key={msg.id || idx}
              className={`flex items-start gap-2.5 text-xs font-mono leading-relaxed transition-all ${
                isAgent ? 'text-slate-100' : 'text-cyan-300'
              }`}
            >
              <span
                className={`text-[9px] font-bold tracking-widest shrink-0 uppercase px-1.5 py-0.5 rounded mt-0.5 ${
                  isAgent
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                {isAgent ? (personaName.charAt(0) || 'J') : 'USER'}
              </span>

              <div className="flex-1 break-words">
                {isAgent && isLatest ? (
                  <DecodeText text={msg.text} className="text-cyan-100 drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]" />
                ) : (
                  <span>{msg.text}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConversationLogHUD;
