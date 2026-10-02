import React, { useRef, useEffect, useState } from "react";
import {
  Activity,
  Terminal,
  ChevronDown,
  ChevronUp,
  Trash2,
  Cpu,
  Layers,
  Sparkles,
} from "lucide-react";
import type { AGUIMessage } from "@/lib/agui-types";
import { ChatMessageItem } from "./ChatMessageItem";
import { cn } from "@/lib/utils";

export interface CompanionExecutionStreamProps {
  messages: AGUIMessage[];
  isStreaming?: boolean;
  onClearMessages?: () => void;
  className?: string;
}

export function CompanionExecutionStream({
  messages,
  isStreaming = false,
  onClearMessages,
  className,
}: CompanionExecutionStreamProps) {
  const [collapsed, setCollapsed] = useState(false);
  const streamEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll stream when new events arrive
  useEffect(() => {
    if (!collapsed) {
      streamEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isStreaming, collapsed]);

  const toolExecutionsCount = messages.reduce((acc, m) => acc + (m.toolCalls?.length || 0), 0);

  return (
    <div
      className={cn(
        "glass flex flex-col rounded-3xl border border-hairline bg-[oklch(0.18_0.015_256/_75%)] shadow-2xl backdrop-blur-2xl transition-all duration-300 overflow-hidden",
        collapsed ? "h-14 shrink-0" : "flex-1 min-h-[320px]",
        className,
      )}
    >
      {/* Stream Header Bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-hairline bg-black/30 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span
              className={cn(
                "absolute inline-flex h-full w-full rounded-full animate-ping opacity-75",
                isStreaming ? "bg-amber-hud" : "bg-cyan-hud",
              )}
            />
            <span
              className={cn(
                "relative inline-flex h-2 w-2 rounded-full",
                isStreaming ? "bg-amber-hud" : "bg-cyan-hud",
              )}
            />
          </span>

          <div className="flex items-center gap-2 font-mono text-xs font-bold tracking-wider text-foreground">
            <Layers className="h-3.5 w-3.5 text-cyan-hud" />
            <span>EXECUTION & REASONING STREAM</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-hairline bg-white/5 px-2 py-0.5 font-mono text-[9px] text-muted-foreground">
            <Cpu className="h-2.5 w-2.5 text-cyan-hud" />
            <span>{toolExecutionsCount} TOOLS</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onClearMessages && messages.length > 0 && !collapsed && (
            <button
              type="button"
              onClick={onClearMessages}
              title="Clear execution feed"
              aria-label="Clear execution feed"
              className="key grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand Stream" : "Collapse Stream"}
            aria-label={collapsed ? "Expand Stream" : "Collapse Stream"}
            className="key flex items-center gap-1 rounded-xl border border-hairline px-2 py-1 font-mono text-[10px] text-muted-foreground hover:text-foreground"
          >
            <span>{collapsed ? "EXPAND" : "MINIMIZE"}</span>
            {collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Stream Messages Body */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth min-h-0">
          {messages.length === 0 ? (
            <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center p-6">
              <div className="neu-inset mb-3 grid h-12 w-12 place-items-center rounded-2xl text-cyan-hud">
                <Terminal className="h-5 w-5" />
              </div>
              <p className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
                COGNITIVE STREAM STANDBY
              </p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground/80 leading-relaxed">
                Tool dispatches, system thermals, volume adjustments, and neural reasoning steps
                will project dynamically here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <ChatMessageItem key={message.id} message={message} />
              ))}
              <div ref={streamEndRef} />
            </div>
          )}
        </div>
      )}

      {/* Real-time Streaming Status Footer */}
      {!collapsed && isStreaming && (
        <div className="flex shrink-0 items-center gap-2 border-t border-hairline bg-black/40 px-4 py-2 text-[11px] font-mono text-amber-hud">
          <Activity className="h-3.5 w-3.5 animate-spin" />
          <span>SYNTHESIZING NEURAL THOUGHT TOKENS...</span>
        </div>
      )}
    </div>
  );
}
