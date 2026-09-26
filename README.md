# J.A.R.V.I.S. - Autonomous AI Operating System & Engineering Squad

J.A.R.V.I.S. is an autonomous, localized digital co-worker built with React 19, TypeScript, Express, and Google Gemini Live API.

---

## 📁 4-Subfolder Architecture

The project is structured into four primary subfolders:

```
jarvis/
├── .agents/          # Instruction folder, agent guidelines, and autonomous workflows
├── frontend/         # React 19 SPA, Tailwind CSS v4, Arc-Reactor HUD, and client services
├── backend/          # Express API, Gemini Live WebSocket gateway, and system modules
└── project_docs/     # Architecture documents, Coworker personas (COWORKERS.md), and history
```

* **[`.agents/`](file:///home/g0pi/Downloads/jarvis/.agents)**: Houses autonomous engineering protocols (e.g. [`coding-agnts.md`](file:///home/g0pi/Downloads/jarvis/.agents/workflows/coding-agnts.md)), prompt instructions, and rules.
* **[`frontend/`](file:///home/g0pi/Downloads/jarvis/frontend)**: Contains all UI code, components, HUD controls, optical PiP previews, and audio capture worklets.
* **[`backend/`](file:///home/g0pi/Downloads/jarvis/backend)**: Houses `server.ts`, the Gemini Live WebSocket server (`/live`), and `system_modules/` (memory matrix, personas, workspace tools).
* **[`project_docs/`](file:///home/g0pi/Downloads/jarvis/project_docs)**: Central repository for all project specifications, including [`ARCHITECTURE.md`](file:///home/g0pi/Downloads/jarvis/project_docs/ARCHITECTURE.md) and [`COWORKERS.md`](file:///home/g0pi/Downloads/jarvis/project_docs/COWORKERS.md).

---

## 🚀 Quick Start

### 1. Prerequisites
* Node.js (v18+)
* Valid `GEMINI_API_KEY` in `.env`

### 2. Install & Run
```bash
npm install
npm run dev
```

* **Dev Server**: Runs on `http://localhost:3000` (auto-launches in your browser).
* **Linting / Typecheck**: `npm run lint` (`tsc --noEmit`)
* **Production Build**: `npm run build`
