# J.A.R.V.I.S. Agent Instructions & Workflows (`.agents`)

This folder contains the operational rules, automated engineering guidelines, and persona workflows that govern AI agents working on the J.A.R.V.I.S. project.

## Directory Structure
```
.agents/
├── workflows/
│   └── coding-agnts.md     # 24/7 Autonomous engineering framework & gating protocols
└── README.md               # Folder overview and guidelines
```

## Core Workflows

### 1. [`coding-agnts.md`](file:///home/g0pi/Downloads/jarvis/.agents/workflows/coding-agnts.md)
An autonomous multi-agent engineering framework designed to build a persistent, 24/7 digital co-worker operating natively on the host PC.

**Enforced Gating Phases:**
* **Phase 1: Requirement Triage & Resolution Definition** — Analyze non-obvious engineering constraints, map failure domains, and formulate explicit fallback routines.
* **Phase 2: System Architecture & Tech Stack Selection** — Match tools to constraints (TypeScript for UI, Python for AI/Data, Rust for low-latency systems daemons, Java for sandboxed isolation).
* **Phase 3: Technical Specification Generation** — Produce a comprehensive Technical Design Doc.
* **Phase 4: Defensive Test-Driven Development (TDD)** — Write test harnesses first, guarding against command injection, path traversal, and race conditions.
* **Phase 5: Production Compliant Code Generation** — Maintain clean separation of concerns with files kept under 300 lines of code.
