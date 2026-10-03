/**
 * J.A.R.V.I.S. Design System - Theme Configuration
 * 
 * Based on shadcn/ui design principles adapted for J.A.R.V.I.S. HUD aesthetic
 * Dark-first, cybernetic, cyan/blue accent system with glassmorphism
 */

export const theme = {
  colors: {
    // Base
    background: '#060a12',
    foreground: '#e0f2fe',
    
    // Card/Surface
    card: '#0a1628',
    cardForeground: '#e0f2fe',
    cardBorder: '#06b6d4',
    
    // Popover
    popover: '#0a1628',
    popoverForeground: '#e0f2fe',
    
    // Primary (Cyan)
    primary: '#06b6d4',
    primaryForeground: '#060a12',
    primaryMuted: '#06b6d4/15',
    primaryGlow: '#06b6d4',
    
    // Secondary (Blue/Indigo)
    secondary: '#1e3a5f',
    secondaryForeground: '#bae6fd',
    secondaryBorder: '#0ea5e9',
    
    // Accent (Purple for skills)
    accent: '#a855f7',
    accentForeground: '#faf5ff',
    accentMuted: '#a855f7/15',
    
    // Success (Emerald)
    success: '#10b981',
    successForeground: '#060a12',
    successMuted: '#10b981/15',
    
    // Warning (Amber)
    warning: '#f59e0b',
    warningForeground: '#060a12',
    warningMuted: '#f59e0b/15',
    
    // Destructive (Red)
    destructive: '#ef4444',
    destructiveForeground: '#fef2f2',
    destructiveMuted: '#ef4444/15',
    
    // Muted
    muted: '#1e293b',
    mutedForeground: '#64748b',
    
    // Border/Input
    border: '#06b6d4/20',
    input: '#0c1e3a',
    ring: '#06b6d4',
    
    // Glass
    glass: '#0a1628/80',
    glassBorder: '#06b6d4/20',
    glassStrong: '#0a1628/95',
    
    // Status
    connected: '#06b6d4',
    speaking: '#3b82f6',
    listening: '#0ea5e9',
    connecting: '#06b6d4',
    error: '#ef4444',
    demo: '#f59e0b',
    
    // Text
    textPrimary: '#f0f9ff',
    textSecondary: '#bae6fd',
    textMuted: '#64748b',
    textDim: '#475569',
    
    // Fonts
    fontSans: 'Inter, system-ui, sans-serif',
    fontMono: 'JetBrains Mono, Fira Code, monospace',
    fontDisplay: 'Orbitron, Rajdhani, sans-serif',
  },
  
  radii: {
    none: '0',
    sm: '0.25rem',
    DEFAULT: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    full: '9999px',
  },
  
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    // JARVIS specific
    glow: '0 0 20px rgba(6, 182, 212, 0.35)',
    glowStrong: '0 0 40px rgba(6, 182, 212, 0.5)',
    card: '0 8px 32px rgba(0, 0, 0, 0.5)',
    cardHover: '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 25px rgba(0, 240, 255, 0.18)',
    neon: '0 0 12px rgba(6, 182, 212, 0.4)',
    neonStrong: '0 0 24px rgba(6, 182, 212, 0.6)',
  },
  
  animation: {
    duration: {
      fast: '150ms',
      normal: '200ms',
      slow: '300ms',
    },
    easing: {
      DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
  },
  
  zIndex: {
    hide: -1,
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    modal: 1300,
    popover: 1400,
    tooltip: 1500,
    toast: 1700,
  },
  
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

export type Theme = typeof theme;
export type ColorKey = keyof typeof theme.colors;
export type RadiusKey = keyof typeof theme.radii;
export type ShadowKey = keyof typeof theme.shadows;

export const cssVariables = `
  :root {
    --background: ${theme.colors.background};
    --foreground: ${theme.colors.foreground};
    --card: ${theme.colors.card};
    --card-foreground: ${theme.colors.cardForeground};
    --popover: ${theme.colors.popover};
    --popover-foreground: ${theme.colors.popoverForeground};
    --primary: ${theme.colors.primary};
    --primary-foreground: ${theme.colors.primaryForeground};
    --secondary: ${theme.colors.secondary};
    --secondary-foreground: ${theme.colors.secondaryForeground};
    --accent: ${theme.colors.accent};
    --accent-foreground: ${theme.colors.accentForeground};
    --muted: ${theme.colors.muted};
    --muted-foreground: ${theme.colors.mutedForeground};
    --border: ${theme.colors.border};
    --input: ${theme.colors.input};
    --ring: ${theme.colors.ring};
    --radius: ${theme.radii.DEFAULT};
  }
  
  .dark {
    --background: ${theme.colors.background};
    --foreground: ${theme.colors.foreground};
    --card: ${theme.colors.card};
    --card-foreground: ${theme.colors.cardForeground};
    --popover: ${theme.colors.popover};
    --popover-foreground: ${theme.colors.popoverForeground};
    --primary: ${theme.colors.primary};
    --primary-foreground: ${theme.colors.primaryForeground};
    --secondary: ${theme.colors.secondary};
    --secondary-foreground: ${theme.colors.secondaryForeground};
    --accent: ${theme.colors.accent};
    --accent-foreground: ${theme.colors.accentForeground};
    --muted: ${theme.colors.muted};
    --muted-foreground: ${theme.colors.mutedForeground};
    --border: ${theme.colors.border};
    --input: ${theme.colors.input};
    --ring: ${theme.colors.ring};
  }
`;

export default theme;