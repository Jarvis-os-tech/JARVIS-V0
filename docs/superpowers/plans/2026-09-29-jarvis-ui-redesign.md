# J.A.R.V.I.S. UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the J.A.R.V.I.S. frontend into the high-tech cockpit layout featuring a collapsible left sidebar, 3D Three.js particle swarm visualizer in electric cyan (omitting inner circle mesh), live clock/date HUD, real-time Uplink Log terminal, and grounded MultiInputBar, while maintaining full integration with the Gemini Live WebSocket gateway and Sovereign Memory vault.

**Architecture:** The UI layout is restructured from a top navbar into a persistent collapsible sidebar (`Sidebar.tsx`) managing view state (`Dashboard`, `Memory`, `Connectors`, `Custom Agents`, `Settings`). The `Dashboard` view renders a dual-pane cockpit: the left pane hosts `ThreeOrbVisualizer.tsx` (900 Three.js particles with additive glow reacting to live microphone/assistant audio), and the right pane hosts `UplinkLog.tsx` and `MultiInputBar.tsx`. Ambient depth is provided by a full-bleed WebGL background shader (`AmbientBackground.tsx`).

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, Three.js (`three`, `@types/three`), Lucide React, Web Audio API, WebSocket (`ws`).

**Spec:** [`docs/superpowers/specs/2026-09-29-jarvis-ui-redesign-design.md`](file:///home/g0pi/Downloads/jarvis/docs/superpowers/specs/2026-09-29-jarvis-ui-redesign-design.md)

## Global Constraints
- Target branch is `dev`. Push to `main` is gated until user confirmation.
- Create git backup branch `backup-ui-pre-redesign` before applying code modifications.
- Unified single electric cyan color palette (`#00d8ff` / `0x2fb3ff`).
- Omit the solid inner sphere circle mesh from the particle orb; the particles and additive light alone form the core.
- Port must run clean under `npm run lint` (`tsc --noEmit`) and `npm run build`.

---

### Task 1: Safety Backup & Dependency Setup

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: Existing git state
- Produces: `backup-ui-pre-redesign` git branch and installed `three` + `@types/three` dependencies.

- [ ] **Step 1: Create backup branch**

```bash
git checkout -b backup-ui-pre-redesign
git add -A && git commit -m "chore: snapshot prior to UI redesign" || true
git checkout dev
```

- [ ] **Step 2: Install Three.js dependencies**

```bash
npm install three @types/three
```

- [ ] **Step 3: Verify installation**

Run: `node -e "require('three'); console.log('Three.js installed successfully')"`
Expected: Output `Three.js installed successfully`

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install three and @types/three dependencies"
```

---

### Task 2: WebGL Ambient Background Shader Component

**Files:**
- Create: `frontend/src/components/AmbientBackground.tsx`

**Interfaces:**
- Consumes: Window resize events, WebGL context
- Produces: `<AmbientBackground />` component rendering radial cyan glow and noise.

- [ ] **Step 1: Write `AmbientBackground.tsx`**

```tsx
import React, { useEffect, useRef } from 'react';

export const AmbientBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationFrameId: number;

    const syncSize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    window.addEventListener('resize', syncSize);
    syncSize();

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    if (!gl) return;

    const vs = `
      attribute vec2 a_position;
      varying vec2 v_texCoord;
      void main() {
        v_texCoord = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fs = `
      precision highp float;
      varying vec2 v_texCoord;
      uniform float u_time;
      uniform vec2 u_resolution;
      void main() {
        vec2 uv = (v_texCoord - 0.5) * 2.0;
        uv.x *= u_resolution.x / u_resolution.y;
        float d = length(uv - vec2(0.35, 0.0));
        float glow = exp(-d * 2.2) * 0.25;
        vec3 color = vec3(0.0, 0.75, 1.0) * glow;
        float grain = fract(sin(dot(v_texCoord * u_resolution.xy, vec2(12.9898, 78.233)) + u_time) * 43758.5453);
        color += vec3(0.0, 0.05, 0.09) * grain * 0.03;
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const compileShader = (type: number, src: string) => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const prog = gl.createProgram();
    const vsShader = compileShader(gl.VERTEX_SHADER, vs);
    const fsShader = compileShader(gl.FRAGMENT_SHADER, fs);
    if (!prog || !vsShader || !fsShader) return;

    gl.attachShader(prog, vsShader);
    gl.attachShader(prog, fsShader);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uResolution = gl.getUniformLocation(prog, 'u_resolution');

    const render = (t: number) => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, t * 0.0003);
      if (uResolution) gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationFrameId = requestAnimationFrame(render);
    };

    render(0);

    return () => {
      window.removeEventListener('resize', syncSize);
      cancelAnimationFrame(animationFrameId);
      gl.deleteProgram(prog);
      gl.deleteShader(vsShader);
      gl.deleteShader(fsShader);
      gl.deleteBuffer(buf);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full z-0 opacity-55 pointer-events-none" />;
};
```

- [ ] **Step 2: Lint and verify**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/AmbientBackground.tsx
git commit -m "feat: add WebGL AmbientBackground shader component"
```

---

### Task 3: 3D Three.js Particle Swarm Visualizer (No Solid Inner Circle)

**Files:**
- Create: `frontend/src/components/ThreeOrbVisualizer.tsx`

**Interfaces:**
- Consumes: `connectionState`, `inputVolume`, `outputVolume`, `isVoiceActive`, `onToggleVoice`
- Produces: `<ThreeOrbVisualizer />` rendering 900 cyan particles, point light source, dynamic reactivity to speech, and toggle button.

- [ ] **Step 1: Write `ThreeOrbVisualizer.tsx`**

```tsx
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ConnectionState } from '../types';

interface ThreeOrbVisualizerProps {
  connectionState: ConnectionState;
  inputVolume: number; // 0-100
  outputVolume: number; // 0-100
  isVoiceActive: boolean;
  onToggleVoice: () => void;
  speakerName?: string;
}

export const ThreeOrbVisualizer: React.FC<ThreeOrbVisualizerProps> = ({
  connectionState,
  inputVolume,
  outputVolume,
  isVoiceActive,
  onToggleVoice,
  speakerName = 'JARVIS'
}) => {
  const orbContainerRef = useRef<HTMLDivElement | null>(null);
  const isSpeakingRef = useRef(false);
  const isListeningRef = useRef(false);
  const inputVolRef = useRef(0);
  const outputVolRef = useRef(0);

  useEffect(() => {
    isSpeakingRef.current = connectionState === 'speaking';
    isListeningRef.current = connectionState === 'listening';
    inputVolRef.current = inputVolume;
    outputVolRef.current = outputVolume;
  }, [connectionState, inputVolume, outputVolume]);

  useEffect(() => {
    const container = orbContainerRef.current;
    if (!container) return;

    let animationFrameId: number;
    const w = 520;
    const h = 520;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    container.appendChild(renderer.domElement);

    const PARTICLE_COUNT = 900;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const radii = new Float32Array(PARTICLE_COUNT);
    const speeds = new Float32Array(PARTICLE_COUNT);
    const offsets = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const r = 1.0 + Math.random() * 0.35;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      radii[i] = r;
      speeds[i] = 0.15 + Math.random() * 0.35;
      offsets[i] = theta;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    function makeGlowTexture() {
      const size = 64;
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const ctx = c.getContext('2d');
      if (ctx) {
        const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.4, 'rgba(255,255,255,0.8)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
      }
      return new THREE.CanvasTexture(c);
    }

    const glowTexture = makeGlowTexture();
    const particleMat = new THREE.PointsMaterial({
      color: 0x2fb3ff,
      map: glowTexture,
      size: 0.05,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    const core = new THREE.Points(particleGeo, particleMat);
    scene.add(core);
    core.userData = { radii, speeds, offsets, basePositions: positions.slice() };

    // Point Light for radiant additive center illumination (NO solid inner circle mesh)
    const light = new THREE.PointLight(0x00f2ff, 3, 12);
    light.position.set(0, 0, 0);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x0055aa, 0.6));

    camera.position.z = 2.6;

    let clock = 0;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const speaking = isSpeakingRef.current ? 1 : 0;
      const listening = isListeningRef.current ? 1 : 0;
      const activeVolume = speaking ? outputVolRef.current : listening ? inputVolRef.current : 0;
      const volumeFactor = Math.min(activeVolume / 100, 1.0);

      const speedMul = 1 + speaking * 2.2 + volumeFactor * 1.5;
      const spread = 1 + speaking * 0.25 + volumeFactor * 0.15;
      clock += 0.01 * speedMul;

      const pos = core.geometry.attributes.position.array as Float32Array;
      const { speeds: spd, offsets: off, basePositions: basePos } = core.userData;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const bx = basePos[i * 3];
        const by = basePos[i * 3 + 1];
        const bz = basePos[i * 3 + 2];
        const angle = off[i] + clock * spd[i] * speedMul;
        const r = Math.sqrt(bx * bx + bz * bz);

        const rawX = Math.cos(angle) * r * spread;
        const rawY = by * spread;
        const rawZ = Math.sin(angle) * r * spread;

        const dist = Math.sqrt(rawX * rawX + rawY * rawY + rawZ * rawZ);
        const maxDist = 1.15;
        if (dist > maxDist) {
          pos[i * 3] = (rawX / dist) * maxDist;
          pos[i * 3 + 1] = (rawY / dist) * maxDist;
          pos[i * 3 + 2] = (rawZ / dist) * maxDist;
        } else {
          pos[i * 3] = rawX;
          pos[i * 3 + 1] = rawY;
          pos[i * 3 + 2] = rawZ;
        }
      }
      core.geometry.attributes.position.needsUpdate = true;

      core.rotation.y += 0.0015;
      particleMat.size = 0.05 + speaking * 0.02 + volumeFactor * 0.02;
      light.intensity = 3 + speaking * 2 + volumeFactor * 3;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      glowTexture.dispose();
      light.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const getButtonText = () => {
    if (connectionState === 'connecting') return 'SYNCHRONIZING...';
    if (connectionState === 'listening') return 'MIC LISTENING — CLICK TO MUTE';
    if (connectionState === 'speaking') return 'J.A.R.V.I.S. VOCALIZING';
    if (isVoiceActive) return 'LINK ACTIVE — CLICK TO MUTE';
    return 'CLICK TO START LISTENING';
  };

  return (
    <div className="relative w-[520px] h-[520px] shrink-0 flex flex-col items-center justify-center">
      <div className="relative w-full h-[450px] flex items-center justify-center">
        <div
          ref={orbContainerRef}
          onClick={onToggleVoice}
          className="absolute inset-0 cursor-pointer"
          title="Click Orb to Toggle Voice Uplink"
        />
        {/* Floating speaker tag */}
        <div className="absolute top-[20px] px-4 py-1.5 rounded-full border border-[#00beff]/20 bg-[#040a12]/70 backdrop-blur-md text-[13px] font-mono tracking-wider font-semibold text-[#8fd8ff] pointer-events-none select-none shadow-[0_0_15px_rgba(0,190,255,0.15)] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00beff] shadow-[0_0_6px_#00beff] animate-pulse" />
          SPEAKER: {speakerName}
        </div>
      </div>

      {/* Activation Action Pill */}
      <button
        type="button"
        onClick={onToggleVoice}
        className={`z-20 mt-1 px-6 py-2 rounded-full border font-mono text-[12px] tracking-wider transition-all flex items-center gap-2.5 backdrop-blur-md cursor-pointer select-none ${
          isVoiceActive
            ? connectionState === 'speaking'
              ? 'border-blue-500/50 bg-blue-950/40 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.3)] animate-pulse'
              : 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
            : 'border-cyan-500/30 bg-[#0a141c]/80 text-cyan-400 hover:bg-cyan-500/20 hover:text-white shadow-[0_0_15px_rgba(0,190,255,0.15)]'
        }`}
        title="Click to toggle voice session"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isVoiceActive
              ? connectionState === 'speaking'
                ? 'bg-blue-400 shadow-[0_0_6px_#60a5fa]'
                : 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
              : 'bg-cyan-400 animate-ping'
          }`}
        />
        {getButtonText()}
      </button>
    </div>
  );
};
```

- [ ] **Step 2: Lint and verify**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ThreeOrbVisualizer.tsx
git commit -m "feat: add ThreeOrbVisualizer component without inner circle mesh"
```

---

### Task 4: Collapsible Left Sidebar Component

**Files:**
- Create: `frontend/src/components/Sidebar.tsx`

**Interfaces:**
- Consumes: `activeTab`, `onSelectTab`, `isOpen`, `onToggleOpen`
- Produces: `<Sidebar />` with navigation pills, collapse toggle, and `JARVIS PRIME v2.1.0` footer.

- [ ] **Step 1: Write `Sidebar.tsx`**

```tsx
import React from 'react';
import { LayoutDashboard, Clock, Network, Bot, Settings, ChevronLeft } from 'lucide-react';

export type SidebarTab = 'dashboard' | 'memory' | 'connectors' | 'agents' | 'settings';

interface SidebarProps {
  activeTab: SidebarTab;
  onSelectTab: (tab: SidebarTab) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onToggleOpen,
}) => {
  return (
    <aside
      className={`h-full py-7 bg-[#040a12]/55 flex flex-col backdrop-blur-md shrink-0 transition-all duration-300 ${
        isOpen ? 'w-[230px] px-4 border-r border-[#00beff]/12' : 'w-0 px-0 opacity-0 overflow-hidden border-r-0'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between mb-8 px-1.5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-[34px] h-[34px] rounded-full bg-gradient-to-tr from-cyan-500 via-blue-500 to-indigo-600 shadow-[0_0_15px_rgba(6,182,212,0.5)] flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-white/20 animate-pulse" />
          </div>
          <div className="text-[19px] font-bold tracking-[2px] text-[#dff6ff] font-mono">
            JARVIS
          </div>
        </div>
        <button
          onClick={onToggleOpen}
          className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-pointer"
          title="Collapse Sidebar"
        >
          <ChevronLeft className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 flex flex-col gap-1.5 overflow-y-auto">
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-[14.5px] font-medium tracking-[0.2px] transition-all w-full text-left cursor-pointer ${
            activeTab === 'dashboard'
              ? 'text-[#5fd6ff] bg-[#00b4ff]/12 shadow-[inset_0_0_0_1px_rgba(0,190,255,0.25)]'
              : 'text-[#8fa8b8] hover:text-[#cdeeff] hover:bg-[#00beff]/6'
          }`}
        >
          <LayoutDashboard className="w-[18px] h-[18px] opacity-85 shrink-0" />
          Dashboard
        </button>

        <button
          onClick={() => onSelectTab('memory')}
          className={`flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-[14.5px] font-medium tracking-[0.2px] transition-all w-full text-left cursor-pointer ${
            activeTab === 'memory'
              ? 'text-[#5fd6ff] bg-[#00b4ff]/12 shadow-[inset_0_0_0_1px_rgba(0,190,255,0.25)]'
              : 'text-[#8fa8b8] hover:text-[#cdeeff] hover:bg-[#00beff]/6'
          }`}
        >
          <Clock className="w-[18px] h-[18px] opacity-85 shrink-0" />
          Memory
        </button>

        <button
          onClick={() => onSelectTab('connectors')}
          className={`flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-[14.5px] font-medium tracking-[0.2px] transition-all w-full text-left cursor-pointer ${
            activeTab === 'connectors'
              ? 'text-[#5fd6ff] bg-[#00b4ff]/12 shadow-[inset_0_0_0_1px_rgba(0,190,255,0.25)]'
              : 'text-[#8fa8b8] hover:text-[#cdeeff] hover:bg-[#00beff]/6'
          }`}
        >
          <Network className="w-[18px] h-[18px] opacity-85 shrink-0" />
          Connectors
        </button>

        <button
          onClick={() => onSelectTab('agents')}
          className={`flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-[14.5px] font-medium tracking-[0.2px] transition-all w-full text-left cursor-pointer ${
            activeTab === 'agents'
              ? 'text-[#5fd6ff] bg-[#00b4ff]/12 shadow-[inset_0_0_0_1px_rgba(0,190,255,0.25)]'
              : 'text-[#8fa8b8] hover:text-[#cdeeff] hover:bg-[#00beff]/6'
          }`}
        >
          <Bot className="w-[18px] h-[18px] opacity-85 shrink-0" />
          Custom Agents
        </button>

        <button
          onClick={() => onSelectTab('settings')}
          className={`flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-[14.5px] font-medium tracking-[0.2px] transition-all w-full text-left cursor-pointer ${
            activeTab === 'settings'
              ? 'text-[#5fd6ff] bg-[#00b4ff]/12 shadow-[inset_0_0_0_1px_rgba(0,190,255,0.25)]'
              : 'text-[#8fa8b8] hover:text-[#cdeeff] hover:bg-[#00beff]/6'
          }`}
        >
          <Settings className="w-[18px] h-[18px] opacity-85 shrink-0" />
          Settings
        </button>
      </nav>

      {/* Brand Footer */}
      <div className="flex items-center gap-3 py-2.5 px-1.5 mt-3.5 border-t border-[#00beff]/10 pt-4.5 shrink-0">
        <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 shadow-[0_0_12px_rgba(6,182,212,0.4)] shrink-0 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-white/20" />
        </div>
        <div>
          <div className="text-[13.5px] font-semibold text-[#dff6ff]">JARVIS PRIME</div>
          <div className="text-[11.5px] text-[#5c7a8c]">v2.1.0</div>
        </div>
      </div>
    </aside>
  );
};
```

- [ ] **Step 2: Lint and verify**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Sidebar.tsx
git commit -m "feat: add collapsible Sidebar component"
```

---

### Task 5: Uplink Log Terminal Component

**Files:**
- Create: `frontend/src/components/UplinkLog.tsx`

**Interfaces:**
- Consumes: `messages`, `onClearLog`
- Produces: `<UplinkLog />` rendering real-time system and transcript logs with auto-scroll and `[CLEAR LOG]`.

- [ ] **Step 1: Write `UplinkLog.tsx`**

```tsx
import React, { useEffect, useRef } from 'react';

export interface LogMessage {
  id: string;
  role: 'SYSTEM' | 'USER' | 'JARVIS';
  text: string;
  isFinal?: boolean;
}

interface UplinkLogProps {
  messages: LogMessage[];
  onClearLog: () => void;
}

export const UplinkLog: React.FC<UplinkLogProps> = ({ messages, onClearLog }) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between border-b border-[#00beff]/10 pb-3 mb-3 shrink-0">
        <span className="text-[12px] font-bold text-cyan-400 tracking-wider font-mono">UPLINK LOG</span>
        {messages.length > 0 && (
          <button
            onClick={onClearLog}
            className="text-[9px] font-bold text-gray-500 hover:text-red-400 transition-colors uppercase cursor-pointer font-mono"
          >
            [CLEAR LOG]
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 pr-2 font-mono scrollbar-thin scrollbar-thumb-cyan-950/20 flex flex-col justify-start select-text text-left text-[11px]"
      >
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
            <div className="text-[10px] text-gray-600 font-mono uppercase tracking-[3px]">
              [ Awaiting Transmission ]
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={
                msg.role === 'SYSTEM'
                  ? 'bg-[#060e16]/80 rounded-xl p-3 text-gray-400 border border-white/5'
                  : msg.role === 'USER'
                    ? 'bg-white/5 rounded-xl p-3 text-white border border-white/10 self-end ml-auto max-w-[90%]'
                    : 'bg-[#00d8ff]/5 rounded-xl p-3 text-[#00d8ff] border border-[#00d8ff]/15 max-w-[90%]'
              }
            >
              {msg.role === 'SYSTEM' ? `[System] ${msg.text}` : msg.text}
              {!msg.isFinal && msg.role !== 'SYSTEM' && (
                <span className="animate-pulse ml-1 text-[#00d8ff]">_</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Lint and verify**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/UplinkLog.tsx
git commit -m "feat: add UplinkLog terminal component"
```

---

### Task 6: Grounded Command Uplink Bar (`MultiInputBar.tsx`)

**Files:**
- Create: `frontend/src/components/MultiInputBar.tsx`

**Interfaces:**
- Consumes: `onSendMessage`, `isVoiceActive`, `onToggleVoice`, `isProcessing`
- Produces: `<MultiInputBar />` with `+` action button, expanding textarea, mic toggle, send button.

- [ ] **Step 1: Write `MultiInputBar.tsx`**

```tsx
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Mic, MicOff, Send } from 'lucide-react';

interface MultiInputBarProps {
  onSendMessage: (text: string) => void;
  isVoiceActive: boolean;
  onToggleVoice: () => void;
  isProcessing?: boolean;
}

export const MultiInputBar: React.FC<MultiInputBarProps> = ({
  onSendMessage,
  isVoiceActive,
  onToggleVoice,
  isProcessing = false,
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleSubmit = () => {
    if (!text.trim() || isProcessing) return;
    onSendMessage(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative w-full bg-[#060c14]/90 border border-cyan-500/25 rounded-2xl p-2 px-3 shadow-[0_0_25px_rgba(0,190,255,0.1)] backdrop-blur-xl flex items-end gap-2.5">
      <button
        type="button"
        className="w-8 h-8 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 hover:text-white hover:bg-cyan-500/20 flex items-center justify-center transition-all cursor-pointer shrink-0 mb-0.5"
        title="Add Telemetry / Attachments"
        onClick={() => alert('Attachment uplink active')}
      >
        <Plus className="w-4 h-4" />
      </button>

      <textarea
        ref={textareaRef}
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Direct uplink active. Send telemetry, documents, or queries..."
        className="flex-1 bg-transparent text-[13px] text-white placeholder-slate-500 font-mono resize-none focus:outline-none py-1.5 max-h-[120px] leading-relaxed"
      />

      <div className="flex items-center gap-1.5 shrink-0 mb-0.5">
        <button
          type="button"
          onClick={onToggleVoice}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isVoiceActive
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
              : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/30'
          }`}
          title={isVoiceActive ? 'Mute Microphone' : 'Enable Microphone'}
        >
          {isVoiceActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!text.trim() || isProcessing}
          className="w-8 h-8 rounded-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:hover:bg-cyan-500 text-slate-950 flex items-center justify-center transition-all cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.3)]"
          title="Send Query"
        >
          <Send className="w-3.5 h-3.5 fill-current" />
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Lint and verify**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/MultiInputBar.tsx
git commit -m "feat: add MultiInputBar command component"
```

---

### Task 7: Integrate Master Layout & View Switching into `App.tsx`

**Files:**
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `AmbientBackground`, `Sidebar`, `ThreeOrbVisualizer`, `UplinkLog`, `MultiInputBar`, existing audio & WebSocket routines
- Produces: Complete redesigned J.A.R.V.I.S. UI with live clock/date, view switching, and audio integration.

- [ ] **Step 1: Update `App.tsx` state and layout**
  - Add `activeTab` state (`dashboard`, `memory`, `connectors`, `agents`, `settings`).
  - Add `isSidebarOpen` state.
  - Add `clockTime` and `clockDate` ticking effects.
  - Add `uplinkLogs` state array initialized with `[System] JARVIS : Connected`.
  - Wire incoming transcripts and Gemini Live responses directly into `uplinkLogs`.
  - Wire `ThreeOrbVisualizer` with `connectionState`, `inputVolume`, `outputVolume`, and `handleStartSession`/`handleStopSession`.
  - Render `Sidebar`, `ThreeOrbVisualizer`, `UplinkLog`, and `MultiInputBar` inside the redesigned layout grid.

- [ ] **Step 2: Verify TypeScript Compilation**

Run: `npm run lint`
Expected: PASS with 0 errors

- [ ] **Step 3: Verify Production Bundling**

Run: `npm run build`
Expected: PASS with dist assets created cleanly

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: complete J.A.R.V.I.S. UI redesign with Three.js cockpit and sidebar"
```

---

### Task 8: Verification & Demonstration

**Files:**
- Run server and test all endpoints

- [ ] **Step 1: Dev Server Launch Test**

Run dev command for 5 seconds to ensure clean startup without runtime crashes.

- [ ] **Step 2: Verify in Chrome MCP**

Navigate to `http://localhost:3000`, take snapshot / screenshot, and verify visual alignment with target mockup.
