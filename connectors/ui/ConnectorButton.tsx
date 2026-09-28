import React, { useState, useRef, useEffect } from "react";
import { Plug } from "lucide-react";
import { useConnectors } from "./useConnectors.js";
import { ConnectorMenu } from "./ConnectorMenu.js";
import type { ConnectorWithStatus } from "./connector-types.js";

export interface ConnectorButtonProps {
  onOpenDirectory?: () => void;
  onSelectConnector?: (connector: ConnectorWithStatus) => void;
  className?: string;
}

export const ConnectorButton: React.FC<ConnectorButtonProps> = ({
  onOpenDirectory,
  onSelectConnector,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { connectors, isLoading } = useConnectors({ pollingIntervalMs: 10000, autoFetch: true });
  const connectorList = Array.isArray(connectors) ? connectors : [];
  const connectedCount = connectorList.filter((c) => c.status?.connected).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold font-mono transition-all border shadow-sm cursor-pointer ${
          connectedCount > 0
            ? "bg-cyan-500/15 text-cyan-300 border-cyan-400/50 hover:bg-cyan-500/25 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
            : "bg-slate-900/80 text-slate-300 border-cyan-500/25 hover:border-cyan-400 hover:text-cyan-300"
        } ${className}`}
        title="Model Context Protocol Connectors"
      >
        <Plug
          className={`w-3.5 h-3.5 transition-colors ${
            connectedCount > 0 ? "text-emerald-400" : "text-cyan-400"
          }`}
        />
        <span className="hidden sm:inline">Connectors</span>
        <span
          className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${
            connectedCount > 0
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_8px_#34d399]"
              : "bg-slate-800 text-slate-400 border-slate-700"
          }`}
        >
          {connectedCount}/{connectors.length || 2}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50">
          <ConnectorMenu
            connectors={connectors}
            onOpenDirectory={() => {
              setIsOpen(false);
              onOpenDirectory?.();
            }}
            onSelectConnector={(conn) => {
              setIsOpen(false);
              if (onSelectConnector) {
                onSelectConnector(conn);
              } else {
                onOpenDirectory?.();
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ConnectorButton;
