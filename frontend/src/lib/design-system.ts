/**
 * J.A.R.V.I.S. Unified Futuristic Design System & Theme Engine
 * Multi-Theme Armor Presets: Mark 85 Arc Cyan, Mark 42 Gold/Crimson, Stealth Emerald, Quantum Violet
 */

export type ThemeId = 'cyan' | 'gold' | 'emerald' | 'violet';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  codename: string;
  primary: string;
  primaryGlow: string;
  secondary: string;
  accent: string;
  bg: string;
  panel: string;
  card: string;
  border: string;
  text: string;
  reactorColor: string;
  reactorSecondary: string;
  particleColor: string;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  cyan: {
    id: 'cyan',
    name: 'Mark 85 Arc Cyan',
    codename: 'STARK CLASSIC',
    primary: '#00f0ff',
    primaryGlow: 'rgba(0, 240, 255, 0.45)',
    secondary: '#38bdf8',
    accent: '#818cf8',
    bg: '#060a12',
    panel: '#0a1120',
    card: '#0d1527',
    border: 'rgba(0, 240, 255, 0.22)',
    text: '#e6edf8',
    reactorColor: '#00f0ff',
    reactorSecondary: '#1d4ed8',
    particleColor: '#38bdf8',
  },
  gold: {
    id: 'gold',
    name: 'Mark 42 Gold & Crimson',
    codename: 'ARMOR PROTOCOL',
    primary: '#f59e0b',
    primaryGlow: 'rgba(245, 158, 11, 0.45)',
    secondary: '#ef4444',
    accent: '#fbbf24',
    bg: '#0c0806',
    panel: '#150e09',
    card: '#1c130d',
    border: 'rgba(245, 158, 11, 0.24)',
    text: '#fef3c7',
    reactorColor: '#fbbf24',
    reactorSecondary: '#b91c1c',
    particleColor: '#f59e0b',
  },
  emerald: {
    id: 'emerald',
    name: 'Stealth Emerald',
    codename: 'E.D.I.T.H. DEFENSE',
    primary: '#10b981',
    primaryGlow: 'rgba(16, 185, 129, 0.45)',
    secondary: '#34d399',
    accent: '#059669',
    bg: '#040d08',
    panel: '#07160e',
    card: '#0c2016',
    border: 'rgba(16, 185, 129, 0.24)',
    text: '#ecfdf5',
    reactorColor: '#10b981',
    reactorSecondary: '#064e3b',
    particleColor: '#6ee7b7',
  },
  violet: {
    id: 'violet',
    name: 'Quantum Violet',
    codename: 'A2A NEURAL MATRIX',
    primary: '#a855f7',
    primaryGlow: 'rgba(168, 85, 247, 0.45)',
    secondary: '#c084fc',
    accent: '#6366f1',
    bg: '#090514',
    panel: '#120a24',
    card: '#180e30',
    border: 'rgba(168, 85, 247, 0.24)',
    text: '#faf5ff',
    reactorColor: '#a855f7',
    reactorSecondary: '#4c1d95',
    particleColor: '#c084fc',
  },
};

/**
 * Apply theme CSS variables to documentElement
 */
export function applyTheme(themeId: ThemeId): void {
  if (typeof document === 'undefined') return;
  const t = THEMES[themeId] || THEMES.cyan;
  const root = document.documentElement;

  root.style.setProperty('--primary', t.primary);
  root.style.setProperty('--primary-glow', t.primaryGlow);
  root.style.setProperty('--secondary', t.secondary);
  root.style.setProperty('--accent', t.accent);
  root.style.setProperty('--background', t.bg);
  root.style.setProperty('--panel', t.panel);
  root.style.setProperty('--card', t.card);
  root.style.setProperty('--border', t.border);
  root.style.setProperty('--foreground', t.text);
  root.style.setProperty('--ring', t.primaryGlow);
  root.style.setProperty('--cyan-hud', t.primary);

  try {
    localStorage.setItem('jarvis_theme', themeId);
  } catch {}
}

export function getInitialTheme(): ThemeId {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('jarvis_theme') as ThemeId;
    if (saved && THEMES[saved]) return saved;
  }
  return 'cyan';
}

export const design = {
  colors: {
    bg: {
      primary: '#060a12',
      secondary: '#0a1120',
      tertiary: '#0e1828',
      inverse: '#f0f9ff',
    },
    cyan: {
      reactor: '#00f0ff',
      reactorDim: 'rgba(0, 240, 255, 0.12)',
      reactorGlow: 'rgba(0, 240, 255, 0.4)',
    },
    text: {
      primary: '#e0f2fe',
      secondary: '#bae6fd',
      muted: '#7dd3fc',
    },
  },
  fonts: {
    display: 'Orbitron, Rajdhani, sans-serif',
    hud: 'Rajdhani, JetBrains Mono, monospace',
    mono: 'JetBrains Mono, Fira Code, monospace',
    sans: 'Outfit, Rajdhani, sans-serif',
  },
} as const;

export default design;