# J.A.R.V.I.S. Workspace Rules & Guidelines

## Workspace Information
- **Workspace Root**: `/home/g0pi/Downloads/jarvis`
- **Application**: J.A.R.V.I.S. Autonomous AI Operating System (React 19, Vite, Express, TypeScript, WebSocket, Gemini Live API)

## 4-Subfolder Architecture
The workspace is organized into four core subfolders:
1. **`.agents/`**: Instructions, autonomous engineering frameworks, and workflows (e.g., [`coding-agnts.md`](file:///home/g0pi/Downloads/jarvis/.agents/workflows/coding-agnts.md)).
2. **`frontend/`**: React 19 SPA, Tailwind CSS v4, HUD components, Arc-Reactor visualizer, `index.html`, and `vite.config.ts`.
3. **`backend/`**: Express API server ([`backend/server.ts`](file:///home/g0pi/Downloads/jarvis/backend/server.ts)), Gemini Live WebSocket gateway (`/live`), and system modules ([`backend/system_modules/`](file:///home/g0pi/Downloads/jarvis/backend/system_modules)).
4. **`project_docs/`**: All project documentation, specs, architecture diagrams, coworker personas ([`COWORKERS.md`](file:///home/g0pi/Downloads/jarvis/project_docs/COWORKERS.md)), and conversation records.

## Core Operating Law (Dynamic AGI/ASI Directive)
- **Never Hardcoded**: J.A.R.V.I.S. is a fully dynamic, self-evolving, autonomous AI operating system (AGI/ASI architecture) inspired by Tony Stark's J.A.R.V.I.S. It must NEVER rely on brittle hardcoded assumptions.
- **Autonomous Self-Repair**: When any command, tool, or action fails, J.A.R.V.I.S. intercepts the error, diagnoses the root cause, dynamically probes alternatives, gathers documentation/fixes from the internet if needed, heals itself, and completes the mission.
- **Continuous Self-Improving Loop**: J.A.R.V.I.S. records every execution episode, reflects on outcomes, synthesizes behavioral rules and lessons into its sovereign memory bank, and injects them into its live reasoning matrix.
- **Pre-Built Omarchy 4 (Quattro) Integration**: Omarchy 4's pre-built agent skills and 367+ command center tools (workspace switching, dynamic wallpaper and theme changing, system & hardware AI diagnostics, hardware toggles) are directly integrated into J.A.R.V.I.S. as native internal capabilities.
- **Proactive Heartbeat**: Operates with an autonomous perception-cognition-action heartbeat, continuously monitoring system health and assisting proactively rather than acting as a merely passive assistant.

## Server & Runtime Configuration
- **Port**: Always run the server on port `3000` (backed by `PORT` in `.env` and `Number(process.env.PORT) || 3000` in `backend/server.ts`).
- **Dev Command**: `npm run dev` (executes `tsx backend/server.ts`).
- **Auto-Launch**: When the server is started and localhost is ready, it automatically launches the default browser at `http://localhost:3000` (via cross-platform `xdg-open` / `open` / `start`).
- **Environment**: All secrets, API keys, and endpoint configurations are managed in `.env`.
- **Security Boundary**: The primary server binds to `127.0.0.1` by default. Set `JARVIS_API_TOKEN` before using a non-loopback `JARVIS_HOST`; delegated agents are workspace-scoped and YOLO approval bypass is disabled unless `JARVIS_AGENT_YOLO=true` is explicitly set.

## Verification & Quality Gates
- **Type Checking**: Run `npm run lint` (`tsc --noEmit`) before completing server or client code changes.
- **Production Build**: Run `npm run build` to verify frontend bundling and backend compilation.

## Branching & Release Policy
- **Active Development**: All ongoing development, commits, and pushes MUST target the `dev` branch.
- **Main Branch Gate**: Do NOT push to `main` until the user explicitly confirms and approves (e.g. "all are ok push to main branch").
