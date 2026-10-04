import React from 'react';

interface CornerBracketsProps {
  themeColor?: string;
}

export const CornerBrackets: React.FC<CornerBracketsProps> = ({
  themeColor = '#00f0ff',
}) => {
  return (
    <div className="pointer-events-none select-none">
      {/* Top Left */}
      <div
        className="hud-corner hud-corner-tl"
        style={{ borderColor: themeColor }}
      >
        <span className="absolute -top-3.5 left-0 text-[8px] font-mono text-cyan-400/60 font-semibold tracking-wider">
          MK-85.A
        </span>
      </div>

      {/* Top Right */}
      <div
        className="hud-corner hud-corner-tr"
        style={{ borderColor: themeColor }}
      >
        <span className="absolute -top-3.5 right-0 text-[8px] font-mono text-cyan-400/60 font-semibold tracking-wider">
          SEC.09
        </span>
      </div>

      {/* Bottom Left */}
      <div
        className="hud-corner hud-corner-bl"
        style={{ borderColor: themeColor }}
      >
        <span className="absolute -bottom-3.5 left-0 text-[8px] font-mono text-cyan-400/60 font-semibold tracking-wider">
          GEO.STARK
        </span>
      </div>

      {/* Bottom Right */}
      <div
        className="hud-corner hud-corner-br"
        style={{ borderColor: themeColor }}
      >
        <span className="absolute -bottom-3.5 right-0 text-[8px] font-mono text-cyan-400/60 font-semibold tracking-wider">
          LIVE.GRID
        </span>
      </div>
    </div>
  );
};

export default CornerBrackets;
