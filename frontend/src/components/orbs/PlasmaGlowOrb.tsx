import React, { useEffect, useRef } from 'react';

interface PlasmaGlowOrbProps {
  connectionState: string;
  volume: number; // 0 - 100
  themeColor?: string;
  secondaryColor?: string;
  size?: number;
}

export const PlasmaGlowOrb: React.FC<PlasmaGlowOrbProps> = ({
  connectionState,
  volume,
  themeColor = '#00f0ff',
  secondaryColor = '#818cf8',
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
    const baseRadius = (size / 2) * 0.42;

    const render = () => {
      ctx.clearRect(0, 0, size, size);

      const isSpeaking = connectionState === 'speaking';
      const isListening = connectionState === 'listening';
      const volBoost = volume / 100;

      phase += 0.025 + volBoost * 0.04;

      // 1. Fluid Multi-Lobal Blob Outline
      const points = 72;
      const dynamicRadius = baseRadius + volBoost * 28;

      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const wave1 = Math.sin(angle * 3 + phase * 2.2) * (14 + volBoost * 20);
        const wave2 = Math.cos(angle * 5 - phase * 1.8) * (10 + volBoost * 16);
        const wave3 = Math.sin(angle * 7 + phase * 3.1) * (6 + volBoost * 12);
        const r = Math.max(15, dynamicRadius + wave1 + wave2 + wave3);

        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();

      // Fluid Plasma Gradient Fill
      const grad = ctx.createRadialGradient(
        cx + Math.sin(phase) * 15,
        cy + Math.cos(phase) * 15,
        5,
        cx,
        cy,
        dynamicRadius * 1.4
      );

      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, themeColor);
      grad.addColorStop(0.7, secondaryColor);
      grad.addColorStop(1, 'rgba(6, 10, 18, 0)');

      ctx.save();
      ctx.fillStyle = grad;
      ctx.shadowColor = themeColor;
      ctx.shadowBlur = 35 + volBoost * 40;
      ctx.fill();
      ctx.restore();

      // 2. Translucent Counter-Rotating Secondary Membrane
      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const wave1 = Math.sin(angle * 4 - phase * 1.5) * (12 + volBoost * 15);
        const wave2 = Math.cos(angle * 6 + phase * 2.5) * (8 + volBoost * 10);
        const r = Math.max(10, dynamicRadius * 0.85 + wave1 + wave2);

        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 3. Ambient Pulsating Core Spot
      ctx.beginPath();
      ctx.arc(
        cx + Math.cos(phase * 1.5) * 8,
        cy + Math.sin(phase * 1.5) * 8,
        dynamicRadius * 0.3,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 15;
      ctx.fill();

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
        className="filter drop-shadow-[0_0_40px_rgba(0,240,255,0.25)]"
      />
    </div>
  );
};

export default PlasmaGlowOrb;
