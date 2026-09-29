# J.A.R.V.I.S. UI Redesign Specification

**Date:** 2026-09-29  
**Status:** Approved by User  
**Target:** J.A.R.V.I.S. Frontend Layout & Interactive Voice Cockpit  

---

## 1. Context & Objectives

The goal is to redesign the J.A.R.V.I.S. user interface to match the high-tech cockpit design from `JARVIS-V1`:
1. Replace the legacy top navbar layout with a **persistent collapsible left sidebar** featuring tab-based view switching.
2. Implement the **3D Three.js Particle Swarm Visualizer** with radiant particle dynamics and ambient lighting, removing the flat inner sphere mesh in favor of an organic volumetric particle cloud with a unified electric-cyan theme (`#00d8ff`).
3. Add a real-time **Uplink Log** terminal panel streaming transcripts and system telemetry.
4. Integrate a grounded **Command Uplink Bar** (`MultiInputBar`) for direct text, attachments, and mic toggling.
5. Display a live digital clock (`3:04 PM`) and formatted calendar date in the top-right HUD.
6. Preserve all existing Gemini Live WebSocket audio streaming, 4-tier Sovereign Memory banks, and MCP Connectors capabilities.

---

## 2. Safety & Backup Strategy

Before applying any code changes or dependency installations, a dedicated backup branch must be created:
```bash
git checkout -b backup-ui-pre-redesign
git add -A && git commit -m "chore: snapshot prior to UI redesign"
git checkout dev
```
All development and integration work will strictly take place on `dev`.

---

## 3. Architecture & Components

```
+----------------------------------------------------------------------------------------------------+
| WebGL Background Shader Canvas (Subtle ambient glow & noise)                                       |
+-------------------+--------------------------------------------------------------------------------+
|                   | Top Bar: [• JARVIS Online (Click to Speak)] [• SPEAKER: JARVIS]   3:04 PM      |
| [O] JARVIS    [<] |                                                      Tuesday, 29 Sept 2026     |
|                   +---------------------------------------+----------------------------------------+
| 🏠 Dashboard      |                                       | UPLINK LOG                [CLEAR LOG]  |
| 🕒 Memory         |       THREE.JS PARTICLE VISUALIZER    | +------------------------------------+ |
| 🔀 Connectors     |        (900 orbiting particles,       | | [System] JARVIS : Connected        | |
| 🤖 Custom Agents  |       volumetric additive glow,       | | [User] Hello JARVIS                | |
| ⚙️ Settings        |         audio reactive pulse)         | | [JARVIS] Online and ready, sir.    | |
|                   |                                       | +------------------------------------+ |
|                   |   [Click Orb to Toggle Voice Uplink]  +----------------------------------------+
|                   |       [• CLICK TO START LISTENING]    | MULTI INPUT BAR                        |
| [O] JARVIS PRIME  |                                       | [+] [ Direct uplink active... ] (🎤) (➤)|
|     v2.1.0        |                                       |                                        |
+-------------------+---------------------------------------+----------------------------------------+
```

### 3.1 Background WebGL Shader
- Fullscreen background `<canvas>` rendering a subtle radial cyan glow (`#00beff`) and organic film grain via custom vertex and fragment shaders.

### 3.2 Collapsible Sidebar (`Sidebar.tsx`)
- **Expanded State (230px)**:
  - Header: Glowing cyan 3D orb icon, bold `JARVIS` title, and `<` collapse toggle.
  - Menu Items:
    - `Dashboard` (Home icon) — returns to the primary Orb + Uplink Log cockpit.
    - `Memory` (Clock icon) — renders the 4-tier Sovereign Memory vault.
    - `Connectors` (Branch/Network icon) — renders the MCP Connectors directory (`ConnectorsView`).
    - `Custom Agents` (Bot icon) — persona switcher (`JARVIS`, `FRIDAY`, `EDITH`).
    - `Settings` (Gear icon) — audio and API configurations.
  - Footer: Glowing orb avatar + `JARVIS PRIME v2.1.0`.
- **Collapsed State**:
  - Sidebar smoothly collapses to `0px` with a floating trigger button (`>`) on the main stage to restore it.

### 3.3 Three.js Particle Swarm Visualizer (`ThreeOrbVisualizer.tsx`)
- **Particle System**:
  - 900 luminous particles (`THREE.Points`) mapped to a radial gradient canvas glow texture.
  - Blending mode: `THREE.AdditiveBlending`, `depthWrite: false` for radiant bloom.
  - Point light source (`THREE.PointLight`, `0x00f2ff`) and ambient illumination.
  - **No Inner Circle Mesh**: The legacy solid `SphereGeometry` mesh is omitted. The particles themselves form the volumetric core.
  - **Color Palette**: Unified Electric Cyan (`0x2fb3ff` / `#00d8ff`).
- **Dynamic Reactivity**:
  - *Idle*: Gentle orbital motion (speeds 0.15–0.50) within a bounded spherical shell.
  - *Listening (User Audio In)*: Particle swarm accelerates and subtly constricts based on microphone volume.
  - *Speaking (JARVIS Audio Out)*: Orbital speed increases by 3.2×, particle spread expands by 25%, and particle size enlarges dynamically to audio amplitude.
- **Direct Controls**:
  - Clicking the particle canvas or the `• CLICK TO START LISTENING` pill toggles the Gemini Live voice uplink.

### 3.4 Top Bar HUD
- Left: Dynamic status pill (`• JARVIS Online (Click to Speak)` / `Listening` / `Speaking`) with animated glowing dot.
- Center-Left: Speaker tag (`• SPEAKER: JARVIS`).
- Right: Large digital clock (`h:mm A`, updated every 1s) and formatted date (`Tuesday, 29 September 2026`).

### 3.5 Uplink Log (`UplinkLog.tsx`)
- Cyan-accented header `UPLINK LOG` with `[CLEAR LOG]` button.
- Monospace message cards for `SYSTEM` (`[System] JARVIS : Connected`), `USER`, and `JARVIS` responses.
- Streaming indicator (`_`) during live voice vocalization.
- Auto-scroll lock to latest message.

### 3.6 Command Input Bar (`MultiInputBar.tsx`)
- Left: `+` action button for file/image attachments and tool shortcuts.
- Center: Auto-expanding monospace input with placeholder `Direct uplink active. Send telemetry, documents, or queries...`.
- Right: Dedicated microphone toggle button and send action.

---

## 4. Dependencies & Integration

1. **Dependencies**:
   - `three`: `^0.174.0` (or compatible)
   - `@types/three`: `^0.174.0`
2. **Audio & WebSocket Integration**:
   - Reuses existing `AudioQueuePlayer`, `float32ToInt16Base64`, and WebSocket connection to `ws://localhost:3000/live`.
   - Audio input volume (`inputVolume`) and output volume (`outputVolume`) drive `ThreeOrbVisualizer`.

---

## 5. Verification & Testing

1. **Compilation & Types**: Run `npm run lint` (`tsc --noEmit`) to verify zero TypeScript errors.
2. **Visual Inspection**: Launch via `npm run dev` and verify:
   - Sidebar expands and collapses smoothly.
   - Particle swarm renders at 60fps in Three.js without the inner solid circle.
   - Live clock ticks accurately.
   - Uplink log records messages and clears upon request.
   - View switching between Dashboard, Memory, and Connectors functions seamlessly.
   - Microphone activation triggers audio streaming and reactive particle movement.
