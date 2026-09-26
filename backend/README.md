# J.A.R.V.I.S. Backend (`backend`)

The backend layer of J.A.R.V.I.S. is a persistent Node.js/TypeScript server hosting Express REST endpoints, the bidirectional Gemini Live WebSocket gateway, and local system automation modules.

## Directory Structure
```
backend/
├── server.ts               # Core HTTP server, WebSocket gateway (/live), Vite middleware & static host
├── system_modules/
│   ├── intelligent_system/ # Multi-tier cognitive memory, coworker personas, Google Workspace tools
│   └── voice_latency/      # Low-latency PCM audio processor, queue player, websocket streamer
└── README.md
```

## Features
1. **Gemini Live Gateway (`/live`)**:
   Full-duplex WebSocket proxy connecting client PCM 16kHz audio and optical frame streams directly to `@google/genai` Live session.
2. **Dynamic Personas & Voice Switching**:
   Supports runtime persona reconfiguration (e.g. `Puck` for Jarvis, `Kore` for Friday, `Zephyr` for Edith).
3. **Cognitive Memory Matrix**:
   Maintains short-term context, episodic milestones, semantic knowledge graph triples, and long-term directives.
4. **Auto-Launch & Port Governance**:
   Listens on port `3000` (or configured `PORT`) and automatically opens the user's default browser on startup.
