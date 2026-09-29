# J.A.R.V.I.S. Architecture & Technical Design

## 1. System Overview

J.A.R.V.I.S. (Just A Rather Very Intelligent System) is an autonomous AI operating system and engineering co-worker operating locally on the user's host machine. The system integrates real-time bidirectional multimodal streaming via the Gemini Live API with a 4-tier cognitive memory engine, holographic UI visualizers, and a multi-agent engineering squad.

---

## 2. Four-Subfolder Project Organization

The codebase is partitioned into four decoupled, single-responsibility subfolders:

```
jarvis/
├── .agents/                    # Instruction folder & autonomous agent workflows
│   ├── workflows/
│   │   └── coding-agnts.md     # 24/7 autonomous engineering protocol & constraints
│   └── README.md
│
├── frontend/                   # Interactive User Interface Layer
│   ├── src/
│   │   ├── components/         # Arc Reactor, HUD, Persona cards, Audio telemetry
│   │   ├── data/               # Persona presets, quick prompts
│   │   ├── services/           # Live WebSocket client, audio capture/playback, Google Auth
│   │   ├── utils/              # Voice transfer intent regex, audio encoders
│   │   ├── App.tsx             # Root React dashboard
│   │   ├── main.tsx            # React 19 entry point
│   │   └── types.ts            # Frontend domain models
│   ├── index.html              # HTML5 entry with Service Worker cache purger
│   ├── vite.config.ts          # Vite build & Tailwind CSS v4 pipeline
│   └── firebase-applet-config.example.json # Firebase config template (gitignored)
│
├── backend/                    # Core Runtime, API & Systems Layer
│   ├── server.ts               # Express API, /live WebSocket gateway, Vite dev middleware
│   └── system_modules/
│       ├── intelligent_system/ # Multi-tiered memory matrix, personas, workspace tools
│       └── voice_latency/      # PCM audio queue player, low-latency streaming pipeline
│
└── project_docs/               # Central Project Documentation
    ├── ARCHITECTURE.md         # System design, network topologies, memory engine
    ├── COWORKERS.md            # Multi-agent squad architecture (6 personas, War Room)
    ├── JARVIS_CONVERSATION_HISTORY.txt # Session historical context
    └── README.md               # Documentation directory index
```

---

## 3. High-Level Data & Communication Flow

```mermaid
flowchart TD
    User(["👤 Operator (Mic / Camera / Screen / Chat)"])

    subgraph Client ["frontend/ (React 19 + Tailwind v4)"]
        ArcReactor["Arc-Reactor Visualizer\n(Real-Time Audio Telemetry)"]
        HUD["Coworker HUD Selector\n(Persona Switcher & Status)"]
        AudioPipeline["Audio Capture & PCM 16kHz Streaming"]
    end

    subgraph Server ["backend/server.ts (Node.js + Express)"]
        WSServer["WebSocket Gateway (/live)"]
        GeminiClient["Gemini Live API Client (@google/genai)"]
        ToolDispatcher["Tool Execution Engine"]
    end

    subgraph Memory ["backend/system_modules/intelligent_system/"]
        STM["Short-Term Working Context"]
        EPI["Episodic Milestones & Decisions"]
        SEM["Semantic Knowledge Graph"]
        LTM["Long-Term Protocols"]
    end

    User <==>|Audio PCM / Video / Text| Client
    Client <==>|Bidirectional WS (/live)| WSServer
    WSServer <==>|Gemini Live Protocol| GeminiClient
    GeminiClient <--> Memory
    GeminiClient -->|Tool Calls| ToolDispatcher
```

---

## 4. Multi-Agent Coworker Personas

The system supports sub-second persona transitions via verbal triggers or HUD selection:

| Persona | Role | Voice Model | Specialization |
| :--- | :--- | :--- | :--- |
| **J.A.R.V.I.S.** | Principal Tech Architect | `Puck` | System Design, Refactoring, Clean Architecture |
| **F.R.I.D.A.Y.** | DevOps & Infrastructure Lead | `Kore` | Docker, Kubernetes, CI/CD, Cloud SRE |
| **U.L.T.R.O.N.** | Tech News & AI Intelligence | `Charon` | ArXiv papers, AI releases, Ecosystem Trends |
| **E.D.I.T.H.** | Cybersecurity & Code Auditor | `Zephyr` | AppSec, OAuth, JWT, Zero Trust, CVE Audits |
| **K.A.R.E.N.** | Senior Frontend & UX Lead | `Aoede` | React 19, Tailwind v4, 60fps UX, A11y |
| **V.I.S.I.O.N.** | Data Science & ML Engine | `Fenrir` | Vector DBs, RAG, PyTorch, Math Logic |

For detailed interaction protocols and the War Room standup mode, see [`project_docs/COWORKERS.md`](file:///home/g0pi/Downloads/jarvis/project_docs/COWORKERS.md).
