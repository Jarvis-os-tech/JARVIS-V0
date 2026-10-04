import React, { useState, useEffect, useRef } from 'react';

const GLYPHS = '/\\|<>[]{}=+*#%&$0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const GHOST = 5;
const MIN_RATE = 28;
const MAX_LAG_MS = 250;
const FRAME_MS = 38;

function scramble(slice: string, seed: number) {
  let out = '';
  for (let i = 0; i < slice.length; i++) {
    const c = slice[i];
    if (c === ' ' || c === '\n') {
      out += c;
    } else {
      const idx = Math.abs((seed * 17 + i * 31) % GLYPHS.length);
      out += GLYPHS[idx];
    }
  }
  return out;
}

interface DecodeTextProps {
  text: string;
  speed?: number;
  className?: string;
}

export const DecodeText: React.FC<DecodeTextProps> = ({ text, className = '' }) => {
  const settled = useRef(0);
  const raf = useRef<number>(0);
  const latest = useRef(text);
  const [tick, bump] = useState(0);

  useEffect(() => {
    latest.current = text;
    if (raf.current || settled.current >= text.length) return;

    let prev = performance.now();
    let painted = 0;

    const step = (now: number) => {
      const dt = Math.min(now - prev, 120) / 1000;
      prev = now;

      const target = latest.current.length;
      const rate = Math.max(MIN_RATE, (target - settled.current) / (MAX_LAG_MS / 1000));
      settled.current = Math.min(target, settled.current + rate * dt);

      if (now - painted >= FRAME_MS) {
        painted = now;
        bump((n) => n + 1);
      }

      if (settled.current < latest.current.length) {
        raf.current = requestAnimationFrame(step);
      } else {
        raf.current = 0;
        bump((n) => n + 1);
      }
    };

    raf.current = requestAnimationFrame(step);
  }, [text]);

  useEffect(() => {
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
  }, []);

  const n = Math.floor(settled.current);
  if (n >= text.length) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {text.slice(0, n)}
      <span className="decode-ghost">{scramble(text.slice(n, n + GHOST), tick)}</span>
      <span className="decode-veil">{text.slice(n + GHOST)}</span>
    </span>
  );
};

export default DecodeText;
