---
name: jarvis-ui-system
description: Authoritative Frontend Architecture & Cybernetic HUD Design System for J.A.R.V.I.S. (React 19, Tailwind CSS v4, Arc-Reactor telemetry, 60fps animations, accessible Stark OS UI). Use when designing, building, or refactoring any frontend UI components, HUD widgets, or visualizers.
---

# J.A.R.V.I.S. Frontend UI & HUD Design System

**Owner:** K.A.R.E.N. (Senior Frontend & UX Lead)

## 1. Overview & Core Philosophy

The J.A.R.V.I.S. interface is a mission-critical, cybernetic operating system HUD inspired by Tony Stark's systems. It balances futuristic aesthetic excellence with razor-sharp engineering rigor:

- **Futuristic Yet Functional**: High-density telemetry, subtle cyan/cobalt holographics, and glowing indicators that communicate actionable real-time state.
- **Zero-Slop UI**: Clean typographical hierarchy, crisp borders, purposeful micro-animations, and no generic cookie-cutter templates.
- **60fps Performance**: GPU-accelerated rendering (`transform` and `opacity` only). Zero layout thrashing or unoptimized re-renders.
- **Strict Accessibility (WCAG AA)**: Clear focus rings, legible high-contrast text, semantic HTML, and `aria-live` announcements for dynamic agent states.

---

## 2. Tech Stack Standards

- **Framework**: React 19 SPA (Functional components, hooks, suspense).
- **Styling**: Tailwind CSS v4 (native `@theme`, CSS custom properties, utility classes).
- **Icons**: `lucide-react` (uniform stroke width: `1.75px` or `2px`, sizing: `16px`, `20px`, `24px`).
- **Telemetry Visualizers**: HTML5 Canvas with `requestAnimationFrame` or SVG for audio waveforms and Arc-Reactor pulses.
- **Build Tool**: Vite (`vite.config.ts`), running through Express backend proxy at `http://localhost:3000`.

---

## 3. Color Palette & Cybernetic Tokens

```css
/* Core Cybernetic Theme */
--bg-void: #030712;          /* Deepest space background */
--bg-surface: #0b1120;       /* Surface / card panels (semi-transparent) */
--bg-panel-elevated: #111827;/* Modals and elevated flyouts */

/* Neon Accents */
--accent-arc-cyan: #00f0ff;  /* Primary Arc-Reactor glow & active states */
--accent-cobalt: #3b82f6;    /* Secondary data accents */
--accent-gold: #f59e0b;      /* Stark Industries telemetry & warnings */
--accent-emerald: #10b981;   /* System nominal / operational */
--accent-ruby: #ef4444;      /* Critical alert / error / security trigger */
--accent-violet: #8b5cf6;    /* Neural net & intelligence stream */

/* Typography & Contrast */
--text-primary: #f8fafc;     /* High-contrast headings and active metrics */
--text-secondary: #94a3b8;   /* Telemetry labels and metadata */
--text-muted: #64748b;       /* Inactive indicators and timestamps */
--border-subtle: rgba(56, 189, 248, 0.15); /* Sleek cyan border */
--border-glow: rgba(0, 240, 255, 0.4);      /* Active glowing highlight */
```

---

## 4. Component Architectural Guidelines

### File Structure & Size
- **Max 300 Lines of Code**: Every UI component must remain under 300 LOC. If a component exceeds 300 lines, extract sub-views, custom hooks, or utility helpers.
- **Colocation**: Keep component styles, types, and sub-components organized in dedicated folders within `frontend/src/components/`.

### Arc-Reactor Visualizer & Telemetry
- Audio waveform visualizers must bind to audio stream frequency bins.
- Avoid updating React component state on every audio frame (`requestAnimationFrame` loops should mutate canvas contexts directly, not trigger `setState` 60 times a second).

### HUD Cards & Panels
- Apply subtle glassmorphism: `backdrop-blur-md bg-slate-900/60 border border-cyan-500/20 rounded-lg`.
- Use tabular numbers (`font-mono font-variant-numeric: tabular-nums`) for all countdowns, memory stats, CPU metrics, and timestamps to eliminate layout shifts.

### Error Boundaries & Loading States
- Every major HUD view (`ArcReactor`, `CoworkerSelector`, `LiveLogs`, `VoiceVisualizer`) must be wrapped with defensive fallbacks.
- Never let an unhandled render error crash the entire operating system dashboard.

---

## 5. Verification Checklist

Before finalizing any frontend changes:
1. Run `npm run lint` (`tsc --noEmit`) to verify zero TypeScript errors.
2. Run `npm run build` to verify Vite bundles cleanly without syntax or packaging errors.
3. Test responsiveness on standard laptop displays (`1366x768` to `1920x1080`).
4. Ensure no console spam or unhandled promise rejections appear in browser developer tools.
