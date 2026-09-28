import React from "react";
import { Plug, ExternalLink } from "lucide-react";
import type { ConnectorWithStatus } from "./connector-types";
import { CONNECTOR_ICONS, DEFAULT_CONNECTOR_ICON } from "./ConnectorCard";

// ============================================================================
// CONNECTOR MENU
// Quick-access floating dropdown menu displaying connection statuses
// and fast access to manage connectors directly from an input bar or header.
// ============================================================================

export interface ConnectorMenuProps {
  connectors: ConnectorWithStatus[];
  onOpenDirectory?: () => void;
  onSelectConnector?: (connector: ConnectorWithStatus) => void;
  className?: string;
}

export const ConnectorMenu: React.FC<ConnectorMenuProps> = ({
  connectors,
  onOpenDirectory,
  onSelectConnector,
  className = "",
}) => {
  const connectedCount = connectors.filter((c) => c.status?.connected).length;

  return (
    <div
      className={`w-64 bg-[#0a0f1d]/95 border border-cyan-500/30 rounded-xl overflow-hidden shadow-[0_0_25px_rgba(0,216,255,0.2)] backdrop-blur-md z-50 flex flex-col p-2 animate-in fade-in duration-150 ${className}`}
    >
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-cyan-500/10 mb-1">
        <span className="text-[10px] font-bold tracking-wider text-cyan-400 uppercase flex items-center gap-1.5">
          <Plug size={12} />
          Active Connectors
        </span>
        <span className="text-[9px] font-mono text-gray-400">
          {connectedCount}/{connectors.length}
        </span>
      </div>

      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
        {connectors.length === 0 ? (
          <div className="px-3 py-2 text-[11px] text-gray-500 text-center">No connectors found</div>
        ) : (
          connectors.map((conn) => {
            const isConn = conn.status?.connected;
            return (
              <button
                key={conn.id}
                type="button"
                onClick={() => onSelectConnector?.(conn)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-cyan-500/10 transition-colors text-left group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-5 h-5 shrink-0 flex items-center justify-center scale-75 origin-center">
                    {CONNECTOR_ICONS[conn.icon] || DEFAULT_CONNECTOR_ICON}
                  </div>
                  <span className="text-[11px] font-medium text-gray-300 group-hover:text-white truncate">
                    {conn.name}
                  </span>
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isConn ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-gray-600"
                    }`}
                  />
                  <span className="text-[9px] font-mono text-gray-500">
                    {isConn ? "On" : "Off"}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {onOpenDirectory && (
        <button
          type="button"
          onClick={onOpenDirectory}
          className="mt-1 pt-1.5 border-t border-cyan-500/10 w-full flex items-center justify-center gap-1.5 py-1 text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <span>Manage in Directory</span>
          <ExternalLink size={10} />
        </button>
      )}
    </div>
  );
};

export default ConnectorMenu;
