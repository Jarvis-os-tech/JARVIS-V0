# J.A.R.V.I.S. Frontend (`frontend`)

The frontend layer of J.A.R.V.I.S. is an interactive, real-time React 19 application styled with Tailwind CSS v4 and animated using Motion.

## Directory Structure
```
frontend/
├── src/
│   ├── components/         # Holographic Arc-Reactor, Coworker HUD cards, PiP vision canvas
│   ├── data/               # Coworker personas presets and quick prompt templates
│   ├── services/           # WebSocket Live API client, audio worklets, Google OAuth
│   ├── utils/              # Voice intent detection, audio encoding/decoding
│   ├── App.tsx             # Main dashboard assembly and audio pipeline state
│   ├── main.tsx            # React 19 root bootstrap
│   ├── index.css           # Tailwind v4 theme, neon glow effects, and custom scrollbars
│   └── types.ts            # Frontend TypeScript types and interfaces
├── index.html              # HTML shell with service worker cache management
├── vite.config.ts          # Vite configuration with Tailwind CSS v4 and React plugins
├── firebase-applet-config.json # Firebase authentication configuration
└── README.md
```

## Running Frontend
The frontend is served seamlessly in development through the Express server via Vite middleware:
```bash
npm run dev
```
To create a standalone production bundle:
```bash
npm run build
```
The compiled output is output directly to `dist/` at the repository root.
