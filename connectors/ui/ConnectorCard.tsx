import React from "react";
import type { ConnectorWithStatus } from "./connector-types";

// ============================================================================
// CONNECTOR CARD
// Individual card in the connector grid. Shows icon, name, status, tagline.
// ============================================================================

// SVG icons for each connector
export const CONNECTOR_ICONS: Record<string, React.ReactNode> = {
  google: (
    <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none">
      <path d="M21.35 11.1H12v2.7h5.38c-0.24 1.28-0.96 2.37-2.04 3.1v2.56h3.29c1.92-1.78 3.02-4.4 3.02-7.51c0-0.56-0.1-1-0.3-1.41z" fill="#4285F4"/>
      <path d="M12 20.84c2.51 0 4.61-0.83 6.15-2.26l-3.29-2.56c-0.91 0.61-2.08 0.98-3.41 0.98c-2.43 0-4.49-1.64-5.22-3.85H2.82v2.64c1.53 3.02 5.12 5.03 9.18 5.03z" fill="#34A853"/>
      <path d="M6.78 13.15C6.59 12.59 6.48 11.99 6.48 11.38s0.11-1.21 0.3-1.77V6.97H2.82c-0.82 1.63-1.29 3.48-1.29 5.43s0.47 3.8 1.29 5.43l3.96-3.14z" fill="#FBBC05"/>
      <path d="M12 6.4c1.37 0 2.59 0.47 3.56 1.4l2.67-2.67C16.6 3.61 14.5 2.78 12 2.78c-4.06 0-7.65 2.01-9.18 5.03l3.66 2.84c0.73-2.21 2.79-3.25 5.52-3.25z" fill="#EA4335"/>
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none">
      <path d="M12 2C6.477 2 2 6.477 2 12C2 16.418 4.865 20.166 8.839 21.489C9.339 21.581 9.521 21.271 9.521 21.003C9.521 20.763 9.513 20.07 9.508 19.163C6.726 19.773 6.139 17.77 6.139 17.77C5.685 16.598 5.029 16.289 5.029 16.289C4.122 15.667 5.098 15.68 5.098 15.68C6.101 15.751 6.629 16.715 6.629 16.715C7.521 18.255 8.97 17.815 9.539 17.557C9.631 16.865 9.889 16.383 10.175 16.12C7.954 15.853 5.62 14.96 5.62 11.16C5.62 10.038 6.01 9.116 6.649 8.392C6.546 8.125 6.202 7.075 6.747 5.666C6.747 5.666 7.587 5.382 9.497 6.708C10.31 6.473 11.163 6.355 12.011 6.351C12.856 6.355 13.71 6.473 14.525 6.708C16.433 5.382 17.271 5.666 17.271 5.666C17.818 7.075 17.474 8.125 17.371 8.392C18.013 9.116 18.398 10.038 18.398 11.16C18.398 14.972 16.06 15.85 13.831 16.11C14.191 16.434 14.511 17.071 14.511 18.045C14.511 19.452 14.499 20.563 14.499 21.003C14.499 21.274 14.677 21.587 15.186 21.487C19.157 20.163 22.018 16.416 22.018 12C22.018 6.477 17.541 2 12.018 2H12Z" fill="#e0e0e0"/>
    </svg>
  ),
  playwright: (
    <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2.5" stroke="#2EAD33" />
      <line x1="2" y1="8" x2="22" y2="8" stroke="#2EAD33" />
      <circle cx="5.5" cy="5.5" r="0.8" fill="#2EAD33" stroke="none" />
      <circle cx="8.5" cy="5.5" r="0.8" fill="#2EAD33" stroke="none" />
      <circle cx="11.5" cy="5.5" r="0.8" fill="#2EAD33" stroke="none" />
      <path d="M10.5 10.5l4.5 2.5-4.5 2.5v-5z" fill="#2EAD33" stroke="none" />
    </svg>
  ),
};

export const DEFAULT_CONNECTOR_ICON = (
  <div className="w-8 h-8 rounded-lg bg-cyan-950/40 border border-cyan-500/20 flex items-center justify-center text-cyan-400 text-xs font-bold">
    MCP
  </div>
);

export interface ConnectorCardProps {
  connector: ConnectorWithStatus;
  onClick: () => void;
}

export const ConnectorCard: React.FC<ConnectorCardProps> = ({ connector, onClick }) => {
  const isConnected = connector.status?.connected;

  return (
    <button
      onClick={onClick}
      id={`connector-card-${connector.id}`}
      className="group relative w-full text-left bg-[#1a1a2e]/60 hover:bg-[#1a1a2e]/90 border border-[#2a2a3e]/60 hover:border-cyan-500/30 rounded-2xl p-5 transition-all duration-300 cursor-pointer flex flex-col gap-3 hover:shadow-[0_0_30px_rgba(0,216,255,0.06)] active:scale-[0.98]"
    >
      {/* Top row: Icon + Name + Status */}
      <div className="flex items-center gap-3 w-full">
        <div className="shrink-0">
          {CONNECTOR_ICONS[connector.icon] || DEFAULT_CONNECTOR_ICON}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-white truncate">
              {connector.name}
            </span>
            {connector.isNew && (
              <span className="text-[9px] font-bold text-amber-400/90 tracking-wider uppercase shrink-0">
                New
              </span>
            )}
          </div>
        </div>
        {/* Connect indicator */}
        <div className="shrink-0">
          {isConnected ? (
            <div className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 group-hover:border-cyan-500/30 group-hover:bg-cyan-500/10 flex items-center justify-center transition-all">
              <svg viewBox="0 0 24 24" className="w-3 h-3 text-gray-500 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Tagline */}
      <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">
        {connector.tagline}
      </p>
    </button>
  );
};

export default ConnectorCard;
