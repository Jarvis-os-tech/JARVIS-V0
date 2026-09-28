import React, { useState } from "react";
import { Search, Plug, RefreshCw, AlertCircle } from "lucide-react";
import type { ConnectorWithStatus } from "./connector-types";
import { ConnectorCard } from "./ConnectorCard";
import { ConnectorDetail } from "./ConnectorDetail";
import { useConnectors } from "./useConnectors";

// ============================================================================
// CONNECTORS VIEW
// Self-contained, full-featured connector directory view with search, filter tabs,
// connection statistics, responsive grid layout, and deep inspection modal.
// ============================================================================

export interface ConnectorsViewProps {
  onClose?: () => void;
  className?: string;
}

export const ConnectorsView: React.FC<ConnectorsViewProps> = ({ onClose, className = "" }) => {
  const {
    connectors,
    isLoading,
    isAuthenticating,
    error,
    selectedConnector,
    setSelectedConnector,
    fetchConnectors,
    connect,
    disconnect,
  } = useConnectors({ autoFetch: true });

  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "connected" | "available">("all");

  const safeConnectors = Array.isArray(connectors) ? connectors : [];

  // Filtering logic
  const filteredConnectors = safeConnectors.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tools?.some((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterMode === "connected") return c.status?.connected;
    if (filterMode === "available") return !c.status?.connected;
    return true;
  });

  const connectedCount = safeConnectors.filter((c) => c.status?.connected).length;

  return (
    <div className={`flex flex-col h-full bg-[#0a0f1d] text-white rounded-2xl overflow-hidden border border-[#2a2a3e]/60 ${className}`}>
      {/* View Header */}
      <div className="flex items-center justify-between p-6 border-b border-[#2a2a3e]/40 bg-[#0d1326]/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Plug size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wide flex items-center gap-2">
              Model Context Protocol Connectors
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {connectedCount} / {safeConnectors.length} Connected
              </span>
            </h1>
            <p className="text-[12px] text-gray-400">
              Integrate external developer & productivity tools into JARVIS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchConnectors()}
            disabled={isLoading}
            className="p-2 rounded-xl bg-[#1a1a2e]/80 border border-[#2a2a3e]/80 hover:border-cyan-500/40 text-gray-400 hover:text-cyan-300 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh connectors"
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-cyan-500/20">
        {selectedConnector ? (
          <ConnectorDetail
            connector={selectedConnector}
            onBack={() => setSelectedConnector(null)}
            onConnect={connect}
            onDisconnect={disconnect}
            isAuthenticating={isAuthenticating}
          />
        ) : (
          <div className="flex flex-col gap-6">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Search input */}
              <div className="relative w-full sm:w-80">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search connectors or tools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#12182b] border border-[#2a2a3e] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
              </div>

              {/* Status Tabs */}
              <div className="flex items-center bg-[#12182b] p-1 rounded-xl border border-[#2a2a3e] self-stretch sm:self-auto">
                <button
                  onClick={() => setFilterMode("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filterMode === "all"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  All ({safeConnectors.length})
                </button>
                <button
                  onClick={() => setFilterMode("connected")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filterMode === "connected"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Connected ({connectedCount})
                </button>
                <button
                  onClick={() => setFilterMode("available")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filterMode === "available"
                      ? "bg-gray-500/20 text-gray-300 border border-gray-500/30"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Available ({safeConnectors.length - connectedCount})
                </button>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-950/30 border border-red-500/30 rounded-xl text-red-300 text-xs">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Connector Grid */}
            {isLoading && safeConnectors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
                <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
                <span className="text-xs font-mono">Loading connector catalog...</span>
              </div>
            ) : filteredConnectors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500">
                <Plug size={36} className="mb-2 text-gray-600" />
                <p className="text-sm font-semibold text-gray-300">No connectors found</p>
                <p className="text-xs text-gray-500 mt-1 max-w-sm">
                  {searchQuery
                    ? `No connectors or tools match "${searchQuery}"`
                    : "No connectors currently match the selected filter."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredConnectors.map((connector: ConnectorWithStatus) => (
                  <ConnectorCard
                    key={connector.id}
                    connector={connector}
                    onClick={() => setSelectedConnector(connector)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectorsView;
