import React, { useEffect, useRef } from 'react';

interface GalaxyOrbProps {
  connectionState: string;
  volume: number; // 0 - 100
  themeColor?: string;
  secondaryColor?: string;
  size?: number;
}

interface Star {
  x: number;
  y: number;
  radius: number;
  angle: number;
  dist: number;
  speed: number;
  twinklePhase: number;
  layer: number;
  color: string;
}

export const GalaxyOrb: React.FC<GalaxyOrbProps> = ({
  connectionState,
  volume,
  themeColor = '#00f0ff',
  secondaryColor = '#c084fc',
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
    const maxRadius = (size / 2) * 0.88;

    // Generate Spiral Stars
    const starCount = 180;
    const stars: Star[] = [];
    for (let i = 0; i < starCount; i++) {
      const arm = i % 2;
      const dist = (Math.pow(Math.random(), 0.7) * 0.85 + 0.15) * maxRadius;
      const armOffset = arm * Math.PI;
      const spiralAngle = (dist / maxRadius) * Math.PI * 2.8 + armOffset + (Math.random() - 0.5) * 0.4;
      const layer = Math.floor(Math.random() * 3);
      const radius = layer === 0 ? 0.8 : layer === 1 ? 1.4 : 2.2;
      const speed = (0.005 + (1 - dist / maxRadius) * 0.012) * (layer === 0 ? 0.6 : 1);

      stars.push({
        x: 0,
        y: 0,
        radius,
        angle: spiralAngle,
        dist,
        speed,
        twinklePhase: Math.random() * Math.PI * 2,
        layer,
        color: i % 3 === 0 ? '#ffffff' : i % 2 === 0 ? themeColor : secondaryColor,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, size, size);

      const isSpeaking = connectionState === 'speaking';
      const isListening = connectionState === 'listening';
      const volBoost = volume / 100;
      const spinSpeed = 0.015 + (isSpeaking ? 0.035 : isListening ? 0.02 : 0.008) + volBoost * 0.04;

      phase += spinSpeed;

      // 1. Central Cosmic Nebula Core Glow
      const coreR = Math.max(12, maxRadius * 0.28 + volBoost * 24 + Math.sin(phase * 3) * 4);
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.2);
      coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      coreGrad.addColorStop(0.25, themeColor);
      coreGrad.addColorStop(0.65, secondaryColor);
      coreGrad.addColorStop(1, 'transparent');

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, coreR * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.shadowColor = themeColor;
      ctx.shadowBlur = 24 + volBoost * 30;
      ctx.fill();
      ctx.restore();

      // 2. Outer Galactic Dust Ring
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, maxRadius * 0.95, 0, Math.PI * 2);
      ctx.strokeStyle = `${themeColor}22`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 12]);
      ctx.stroke();
      ctx.restore();

      // 3. Render Orbiting Spiral Stars & Dust
      stars.forEach((star) => {
        star.angle += star.speed * (1 + volBoost * 1.5);
        const dynamicDist = star.dist + Math.sin(phase * 2 + star.twinklePhase) * (volBoost * 8);

        const x = cx + Math.cos(star.angle) * dynamicDist;
        const y = cy + Math.sin(star.angle) * dynamicDist;

        const twinkle = 0.4 + Math.sin(phase * 4 + star.twinklePhase) * 0.6;
        const alpha = Math.max(0.2, twinkle * (star.layer === 2 ? 1 : 0.75));

        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, star.radius * (1 + volBoost * 0.6), 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.globalAlpha = alpha;

        if (star.layer === 2) {
          ctx.shadowColor = star.color;
          ctx.shadowBlur = 8;
        }
        ctx.fill();
        ctx.restore();
      });

      // 4. Acoustic Shockwave Ripples when Vocalizing
      if (isSpeaking || isListening || volume > 10) {
        const waveCount = 2;
        for (let w = 1; w <= waveCount; w++) {
          const waveRadius = coreR * 1.5 + ((phase * 40 * w) % (maxRadius * 0.9));
          const waveAlpha = Math.max(0, 1 - waveRadius / (maxRadius * 0.95));

          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, waveRadius, 0, Math.PI * 2);
          ctx.strokeStyle = isSpeaking ? `${secondaryColor}88` : `${themeColor}88`;
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = waveAlpha * 0.65;
          ctx.stroke();
          ctx.restore();
        }
      }

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

export default GalaxyOrb;
