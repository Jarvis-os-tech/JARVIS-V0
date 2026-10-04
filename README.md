<div align="center">

# ⚡ J.A.R.V.I.S. OS (Mark 85)
### Autonomous AI Operating System & Multi-Agent Engineering Squad

[![React 19](https://img.shields.io/badge/React-19.0-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-38bdf8?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Gemini Live API](https://img.shields.io/badge/Gemini_Live-Multimodal_Audio-8e75ff?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![NVIDIA OpenShell](https://img.shields.io/badge/NVIDIA-OpenShell_Sandbox-76b900?style=for-the-badge&logo=nvidia&logoColor=white)](https://github.com/NVIDIA/OpenShell)
[![A2A Protocol](https://img.shields.io/badge/Protocol-A2A_Interoperability-00f0ff?style=for-the-badge)](https://github.com/a2aproject/a2a)

<p align="center">
  <strong>An autonomous, localized, self-repairing AGI/ASI operating system inspired by Tony Stark's J.A.R.V.I.S.</strong><br>
  Featuring real-time full-duplex voice streaming, ambient holographic HUD widgets, 4-tier sovereign memory matrix, Omarchy 4 system controls, and a multi-agent coworker squad.
</p>

---

</div>

## 🌌 System Overview

J.A.R.V.I.S. is not a simple chatbot—it is a **fully dynamic, self-evolving, autonomous AI operating system**. It merges bidirectional real-time multimodal audio, deep desktop & OS actuators, sovereign persistent memory, and containerized security sandboxing into a unified holographic cockpit.

```
                                ┌─────────────────────────────────────────┐
                                │   J.A.R.V.I.S. HOLOGRAPHIC COCKPIT     │
                                │   (React 19 + Tailwind v4 + Web Audio)   │
                                └────────────────────┬────────────────────┘
                                                     │
                             ┌───────────────────────┴───────────────────────┐
                             │                                               │
               ┌─────────────▼─────────────┐                   ┌─────────────▼─────────────┐
               │     LEFT SYSTEMS RAIL     │                   │     RIGHT SIGNAL RAIL     │
               │  - Neural Core Status     │                   │  - 0-100% Dynamic dB Bar  │
               │  - Live WebSocket Link    │                   │  - Latency Telemetry      │
               │  - Security Sandbox State │                   │  - 60 FPS Audio Spectrum  │
               │  - MCP Tools Active       │                   │  - Microphone Mute Toggle │
               └─────────────┬─────────────┘                   └─────────────┬─────────────┘
                             │                                               │
                             └───────────────────────┬───────────────────────┘
                                                     │
                                       ┌─────────────▼─────────────┐
                                       │   COSMIC GALAXY NEXUS     │
                                       │ Realtime Full-Duplex Audio │
                                       │  Zero-Latency Barge-In    │
                                       └─────────────┬─────────────┘
                                                     │
                             ┌───────────────────────┴───────────────────────┐
                             │                                               │
               ┌─────────────▼─────────────┐                   ┌─────────────▼─────────────┐
               │    SOVEREIGN MEMORY       │                   │    MULTI-AGENT SQUAD      │
               │  - Personal Data Engrams  │                   │  - Hermes (Lead Engineer) │
               │  - Preferences Bank       │                   │  - Athena (Architect)     │
               │  - Execution Directives   │                   │  - A2A Protocol Bridge    │
               │  - SQLite + Vector Sync   │                   │  - OpenShell Sandboxing   │
               └───────────────────────────┘                   └───────────────────────────┘
```

---

## ✨ Core Features & Architectural Highlights

### 1. 🛸 Fresh Holographic Cockpit & Ambient HUD Suite ("Webgits")
- **Cosmic Galaxy Visualizer**: Canvas-driven multi-orbital galaxy core that reacts dynamically to microphone frequency and speaker synthesis.
- **Ambient HUD Rails**:
  - `SystemsRail`: Real-time system vitals (Neural Core, Gateway, Memory Vault, Security Sandbox, MCP Tools) with diamond status ticks.
  - `SignalRail`: Vertical real-time decibel level meter (0–100%), audio latency telemetry, and mic toggle.
  - `ToolBadge`: Floating top pill showing active tool and subagent actuation (`accessing [tool_name]...`).
  - `DecodeText`: Matrix glyph scrambler (`requestAnimationFrame`-driven) for cryptographic text decryptor animations.
  - `ConversationLogHUD`: Bottom ambient dialogue transcript.
  - `CornerBrackets`: Viewport targeting reticles with telemetry labels (`MK-85.A`, `SEC.09`, `GEO.STARK`, `LIVE.GRID`).
- **Tactile Web Audio SFX**: Synthesizer sound effects for mode switches, errors, tool triggers, and reactor hums (`frontend/src/lib/sfx.ts`).
- **Multi-Armor Stark Themes**: Dynamic switching between Mark 85 Cyan, Mark 42 Gold/Crimson, Stealth Emerald, and Quantum Violet.

### 2. 🗂️ Unified Left Navigation & Dedicated Views
The persistent left navigation rail allows instant view switching without dropping the live Gemini audio WebSocket link:
- **Dashboard**: Holo-Nexus center stage flanked by ambient HUD widgets.
- **Tasks**: Directory of active and completed autonomous background tasks with real-time logs.
- **Memory**: 3-pillar sovereign memory matrix (Personal Data, Preferences, Directives) with inline editing, search, and SQLite sync.
- **Agents**: Coworker squad matrix (Hermes, Athena, etc.) with A2A goal delegation and streaming terminal outputs.

### 3. 🧠 Central Brain: Multi-Agent Sovereign Memory
- **Unified Adapter Mesh**: 5 bi-directional memory adapters (Antigravity, Browser, Claude, Codex, Hermes).
- **Deterministic 3-Pillar Triad**:
  1. **Personal Data**: User identity, roles, and project context.
  2. **Preferences**: Architectural, procedural, and aesthetic choices.
  3. **Directives**: Behavioral constraints and operational laws.
- **Auto-Distillation & Ledgers**: Asynchronous conversation turns are distilled into structured markdown ledgers and SQLite tables (`.jarvis_data/`).
- **Cascade Purge & Sync**: Server-side sync endpoint (`/api/memory/triad`) with automatic conflict resolution.

### 4. 🛡️ NVIDIA OpenShell Sandbox & Security Boundary
- Isolated container runtime for arbitrary code execution and terminal commands.
- Configurable security policies (`openshell_policy.json`) restricting network egress, filesystem access, and environment secrets.
- Primary server binds securely to `127.0.0.1` by default with token authentication (`JARVIS_API_TOKEN`).

### 5. 🤝 Google / Linux Foundation A2A Protocol
- Implements standard Agent Cards for inter-framework discovery.
- Bidirectional JSON-RPC 2.0 task delegation across heterogeneous AI frameworks.
- Enables J.A.R.V.I.S. to orchestrate external agents (Hermes, Codex, OpenClaw) into a unified problem-solving squad.

### 6. ⚙️ Pre-Built Omarchy 4 (Quattro) Integration
- Direct internal access to **367+ OS command center tools**:
  - Hyprland / desktop workspace navigation.
  - Wallpaper & holographic theme synchronization.
  - Dynamic hardware & audio diagnostics.
  - Media controls, volume attenuation, and system service monitoring.

### 7. 🔄 Autonomous Self-Repair & Proactive Heartbeat
- Intercepts failed tool executions and bash command errors.
- Diagnoses root causes, queries documentation/the internet for solutions, and autonomously repairs itself.
- Runs a proactive perception-cognition-action heartbeat to assist without waiting for prompts.

---

## 📁 4-Subfolder Architecture

The workspace strictly adheres to the clean 4-subfolder standard:

```
jarvis/
├── .agents/                 # Engineering workflows, skills, and agent rules
│   ├── skills/              # Specialized domain capabilities & tools
│   └── workflows/           # Autonomous execution protocols
├── frontend/                # React 19 SPA, Tailwind CSS v4, Holographic Cockpit
│   ├── src/
│   │   ├── components/      # UI components, Header, Nav Rail, Modals
│   │   │   ├── hud/         # Ambient HUD suite (Rails, ToolBadge, Scrambler)
│   │   │   ├── orbs/        # Cosmic Galaxy orb visualizer
│   │   │   └── views/       # Dashboard, Tasks, Memory, Agents full-page views
│   │   ├── lib/             # Stark design system, Web Audio SFX
│   │   └── services/        # Memory engine, auth, demo voice fallback
│   └── index.html           # Cockpit mount point
├── backend/                 # Express API server, Gemini Live WebSocket gateway
│   ├── server.ts            # Core API server and WebSocket broker
│   └── system_modules/      # Autonomous system modules
│       ├── intelligent_system/ # Self-repair, intent routing, A2A, OpenShell
│       └── memory_matrix/   # SQLite database & vector synchronization
└── project_docs/            # Architecture specs, diagrams, coworker personas
    ├── ARCHITECTURE.md      # Deep architectural blueprints
    └── COWORKERS.md         # Digital co-worker definitions and capabilities
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Package Manager**: `npm`
- **Gemini API Key**: Multimodal Live API access from [Google AI Studio](https://aistudio.google.com/)
- **OS**: Linux (optimized for Hyprland/Wayland, cross-compatible with X11 and macOS/Windows)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Jarvis-os-tech/JARVIS-V0.git
cd JARVIS-V0

# 2. Install dependencies
npm install

# 3. Configure environment secrets
cp .env.example .env
# Edit .env and supply your GEMINI_API_KEY
```

### Environment Configuration (`.env`)

```ini
PORT=3000
JARVIS_HOST=127.0.0.1
GEMINI_API_KEY=your_gemini_api_key_here
VOICE_NAME=Puck
JARVIS_API_TOKEN=your_secure_auth_token_here
```

### Launching J.A.R.V.I.S.

```bash
# Start development server (auto-launches browser at http://localhost:3000)
npm run dev
```

---

## 🧪 Quality Gates & Verification

All code in J.A.R.V.I.S. is strictly validated against automated quality gates:

```bash
# 1. Type Safety Check (TypeScript compiler check with no emit)
npm run lint

# 2. Production Bundle Compilation (Vite build)
npm run build
```

---

## 🌿 Branching & Release Policy

- **Active Development**: All feature work, commits, and pull requests must target the **`dev`** branch.
- **Main Branch Gate**: Pushes to **`main`** are locked behind explicit user confirmation and quality gate verification.

```bash
# Workflow example:
git checkout dev
# ... implement feature ...
npm run lint && npm run build
git commit -m "feat(module): description"
git push origin refs/heads/dev:refs/heads/dev
```

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

<div align="center">
  <sub>Built with ❤️ by the J.A.R.V.I.S. Engineering Squad</sub>
</div>
