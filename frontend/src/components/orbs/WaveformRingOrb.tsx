import React, { useEffect, useRef } from 'react';

interface WaveformRingOrbProps {
  connectionState: string;
  volume: number; // 0 - 100
  themeColor?: string;
  secondaryColor?: string;
  size?: number;
}

export const WaveformRingOrb: React.FC<WaveformRingOrbProps> = ({
  connectionState,
  volume,
  themeColor = '#00f0ff',
  secondaryColor = '#38bdf8',
  size = 380,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = size / 2;
    const cy = size / 2;
    const baseRadius = (size / 2) * 0.55;
    const segmentCount = 96;

    const render = () => {
      ctx.clearRect(0, 0, size, size);

      const isSpeaking = connectionState === 'speaking';
      const isListening = connectionState === 'listening';
      const volBoost = volume / 100;

      phase += 0.03 + volBoost * 0.05;

      // 1. Central Ambient Core Sphere
      const coreR = baseRadius * 0.5 + Math.sin(phase * 2) * 3 + volBoost * 16;
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 1.6);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.35, themeColor);
      coreGrad.addColorStop(0.85, secondaryColor);
      coreGrad.addColorStop(1, 'transparent');

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, coreR * 1.6, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.shadowColor = themeColor;
      ctx.shadowBlur = 20 + volBoost * 25;
      ctx.fill();
      ctx.restore();

      // 2. Inner Rotating Reticle
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-phase * 0.4);
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius * 0.82, 0, Math.PI * 2);
      ctx.strokeStyle = `${themeColor}44`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 16]);
      ctx.stroke();
      ctx.restore();

      // 3. Acoustic Waveform Radial Segments
      for (let i = 0; i < segmentCount; i++) {
        const angle = (i / segmentCount) * Math.PI * 2;
        const wave1 = Math.sin(angle * 6 + phase * 2) * (10 + volBoost * 28);
        const wave2 = Math.cos(angle * 10 - phase * 3) * (6 + volBoost * 18);
        const barHeight = 8 + Math.abs(wave1 + wave2) + volBoost * 34;

        const innerR = baseRadius - (volBoost * 6);
        const outerR = innerR + barHeight;

        const x1 = cx + Math.cos(angle) * innerR;
        const y1 = cy + Math.sin(angle) * innerR;
        const x2 = cx + Math.cos(angle) * outerR;
        const y2 = cy + Math.sin(angle) * outerR;

        const isHighlight = i % 4 === 0;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = isHighlight ? themeColor : `${secondaryColor}cc`;
        ctx.lineWidth = isHighlight ? 2.5 : 1.5;
        ctx.lineCap = 'round';
        if (volBoost > 0.15) {
          ctx.shadowColor = themeColor;
          ctx.shadowBlur = isHighlight ? 12 : 6;
        }
        ctx.stroke();
        ctx.restore();
      }

      // 4. Outer HUD Orbiting Ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(phase * 0.2);
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius * 1.65, 0, Math.PI * 2);
      ctx.strokeStyle = `${themeColor}33`;
      ctx.lineWidth = 1;
      ctx.setLineDash([12, 28, 4, 28]);
      ctx.stroke();
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [connectionState, volume, themeColor, secondaryColor, size]);

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none">
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="filter drop-shadow-[0_0_35px_rgba(0,240,255,0.2)]"
      />
    </div>
  );
};

export default WaveformRingOrb;
