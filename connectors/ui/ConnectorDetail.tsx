import React, { useState } from "react";
import { ArrowLeft, ExternalLink, Shield, Copy, Check } from "lucide-react";
import type { ConnectorWithStatus } from "./connector-types";
import { CONNECTOR_ICONS } from "./ConnectorCard";

// ============================================================================
// CONNECTOR DETAIL VIEW
// Full detail panel for a selected connector — replaces the card grid.
// Displays description, tool schemas, permissions, auth status & URLs.
// ============================================================================

export interface ConnectorDetailProps {
  connector: ConnectorWithStatus;
  onBack: () => void;
  onConnect: (connectorId: string) => void;
  onDisconnect: (connectorId: string) => void;
  isAuthenticating?: boolean;
}

export const ConnectorDetail: React.FC<ConnectorDetailProps> = ({
  connector,
  onBack,
  onConnect,
  onDisconnect,
  isAuthenticating,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const isConnected = connector.status?.connected;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(connector.connectorUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#1a1a1a]">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-cyan-400 transition-colors mb-6 group cursor-pointer w-fit"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
        <span>Back</span>
      </button>

      {/* Header: Icon + Title + Connect Button */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            {CONNECTOR_ICONS[connector.icon] || (
              <div className="w-10 h-10 rounded-xl bg-cyan-950/40 border border-cyan-500/20 flex items-center justify-center text-cyan-400 text-sm font-bold">
                MCP
              </div>
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{connector.name}</h2>
            <p className="text-[12px] text-gray-400 mt-0.5">{connector.tagline}</p>
          </div>
        </div>

        {/* Connect / Disconnect Button */}
        <div className="shrink-0">
          {isConnected ? (
            <button
              onClick={() => onDisconnect(connector.id)}
              className="px-4 py-2 rounded-lg text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all cursor-pointer group"
            >
              <span className="group-hover:hidden">Connected ✓</span>
              <span className="hidden group-hover:inline">Disconnect</span>
            </button>
          ) : (
            <button
              onClick={() => onConnect(connector.id)}
              disabled={isAuthenticating}
              className="px-5 py-2 rounded-lg text-[11px] font-semibold bg-white text-black hover:bg-gray-200 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait flex items-center gap-2"
            >
              {isAuthenticating ? (
                <>
                  <div className="w-3 h-3 rounded-full border-2 border-gray-400 border-t-black animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="mb-6">
        <p className="text-[13px] text-gray-300 leading-relaxed">{connector.description}</p>
      </div>

      {/* Author */}
      <div className="mb-6">
        <p className="text-[12px] text-gray-500 mb-1">
          Developed by{" "}
          <a
            href={connector.authorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1"
          >
            {connector.author}
            <ExternalLink size={10} />
          </a>
        </p>
        <p className="text-[11px] text-gray-600 leading-relaxed flex items-start gap-1.5">
          <Shield size={12} className="shrink-0 mt-0.5 text-gray-600" />
          Only use connectors from developers you trust. JARVIS cannot verify that tools will work as intended or that they won't change.
        </p>
      </div>

      {/* Separator */}
      <div className="border-t border-[#2a2a3e]/60 my-2" />

      {/* Tools */}
      <div className="mb-6 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-[13px] font-bold text-white">Tools</h3>
          <span className="text-[10px] text-gray-500 bg-[#2a2a3e]/60 px-2 py-0.5 rounded-full font-mono">
            {connector.tools.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {connector.tools.map((tool) => (
            <span
              key={tool.name}
              title={tool.description}
              className="text-[11px] text-gray-300 bg-[#1a1a2e]/80 border border-[#2a2a3e]/80 px-3 py-1.5 rounded-lg font-mono hover:border-cyan-500/30 hover:text-cyan-300 transition-all cursor-default"
            >
              {tool.name}
            </span>
          ))}
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-[#2a2a3e]/60 my-2" />

      {/* Details */}
      <div className="mt-4">
        <h3 className="text-[13px] font-bold text-white mb-4">Details</h3>

        <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-[12px]">
          <div>
            <span className="text-gray-500 block mb-1">Author</span>
            <a
              href={connector.authorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1"
            >
              {connector.author}
              <ExternalLink size={10} />
            </a>
          </div>

          <div>
            <span className="text-gray-500 block mb-1">Connector URL</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-300 font-mono text-[11px] truncate max-w-[200px]">
                {connector.connectorUrl}
              </span>
              <button
                onClick={handleCopyUrl}
                className="text-gray-500 hover:text-cyan-400 transition-colors cursor-pointer shrink-0"
                title="Copy URL"
              >
                {copiedUrl ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
            </div>
          </div>
        </div>

        {/* Links */}
        {(connector.docsUrl || connector.supportUrl || connector.privacyUrl) && (
          <div className="mt-5">
            <span className="text-gray-500 text-[12px] block mb-2">More info</span>
            <div className="flex flex-col gap-1.5">
              {connector.docsUrl && (
                <a
                  href={connector.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1 text-[12px] w-fit"
                >
                  Documentation <ExternalLink size={10} />
                </a>
              )}
              {connector.supportUrl && (
                <a
                  href={connector.supportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1 text-[12px] w-fit"
                >
                  Support <ExternalLink size={10} />
                </a>
              )}
              {connector.privacyUrl && (
                <a
                  href={connector.privacyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1 text-[12px] w-fit"
                >
                  Privacy Policy <ExternalLink size={10} />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Connected At info */}
        {isConnected && connector.status?.connectedAt && (
          <div className="mt-5 text-[10px] text-gray-600 font-mono">
            Connected since: {new Date(connector.status.connectedAt).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectorDetail;
