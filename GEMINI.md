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

## Server & Runtime Configuration
- **Port**: Always run the server on port `3000` (backed by `PORT` in `.env` and `Number(process.env.PORT) || 3000` in `backend/server.ts`).
- **Dev Command**: `npm run dev` (executes `tsx backend/server.ts`).
- **Auto-Launch**: When the server is started and localhost is ready, it automatically launches the default browser at `http://localhost:3000` (via cross-platform `xdg-open` / `open` / `start`).
- **Environment**: All secrets, API keys, and endpoint configurations are managed in `.env`.

## Verification & Quality Gates
- **Type Checking**: Run `npm run lint` (`tsc --noEmit`) before completing server or client code changes.
- **Production Build**: Run `npm run build` to verify frontend bundling and backend compilation.
