# J.A.R.V.I.S. Autonomous Engineering Squad (`.agents/`)

This directory houses the operational rules, core engineering workflows, and curated skill matrix governing all AI coding agents working on the J.A.R.V.I.S. Autonomous Operating System.

---

## 1. Directory Structure

```
.agents/
├── workflows/
│   └── coding-agnts.md             # Mandatory 6-Phase Engineering Protocol
├── skills/                         # Curated Engineering & Systems Skills
│   ├── a2a-protocol/               # Google / Linux Foundation Agent-to-Agent protocol
│   ├── analyze-project-context/    # Codebase exploration and onboarding
│   ├── brainstorming/              # Socratic requirements & design exploration
│   ├── code-quality-check/         # Automated quality & security checklist audit
│   ├── dispatching-parallel-agents/# Parallel subagent execution
│   ├── executing-plans/            # Step-by-step plan execution with checkpoints
│   ├── generate-sandbox-policy/    # OpenShell sandbox policy authoring
│   ├── jarvis-ui-system/           # React 19 + Tailwind v4 HUD & Arc-Reactor design system
│   ├── openshell-cli/              # OpenShell sandbox runtime management
│   ├── requesting-code-review/     # Rigorous pre-merge code review protocol
│   ├── subagent-driven-development/# Coordinated multi-agent worker dispatch
│   ├── systematic-debugging/       # 4-phase root cause discovery & isolation
│   ├── test-driven-development/    # Red-Green-Refactor defensive testing
│   ├── typesafe-ai/                # End-to-end schema validation (Zod) for LLM APIs
│   ├── use-context7/               # Live library & documentation search
│   ├── using-ceo/                  # J.A.R.V.I.S. Executive Orchestrator protocol
│   ├── using-git-worktrees/        # Isolated git worktrees for safe parallel work
│   ├── verification-before-completion/ # Proof-before-assertion completion gate
│   └── writing-plans/              # Technical design & implementation plan generator
├── ceo_resources/                  # Architecture templates and code checklists
│   ├── checklists/
│   │   └── code-quality-checklist.yaml
│   ├── data/
│   │   ├── calculation-best-practices.yaml
│   │   ├── gpt-5-prompting-guide.md
│   │   ├── kb.yaml
│   │   ├── optimization-best-practices.md
│   │   └── technical-preferences.yaml
│   ├── templates/
│   │   └── architecture-tmpl.yaml
│   └── utils/
│       ├── flatten-project.sh
│       └── generate-indexes.sh
└── README.md
```

---

## 2. Core Autonomous Engineering Protocol

Every coding agent working in this repository MUST adhere strictly to the 6 phases defined in [`workflows/coding-agnts.md`](file:///home/g0pi/Downloads/jarvis/.agents/workflows/coding-agnts.md):

1. **Phase 1: Requirement Triage & Resolution Definition** — Map non-obvious engineering constraints, isolate failure domains, and formulate explicit fallback routines.
2. **Phase 2: Canonical Tech Stack Adherence**:
   - **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide icons, 60fps GPU rendering.
   - **Backend**: Node.js, Express, TypeScript, WebSockets (`/live`), OpenShell sandboxing.
   - **Native Systems**: C++ native workers (`whole_controls/native_workers/bin/`).
   - **Memory & Cognition**: Python 4-tier memory bundle (`jarvis_memory_bundle`), SQLite vector storage, A2A Protocol.
3. **Phase 3: Technical Specification Generation** — Produce a comprehensive Technical Design Doc using [`skills/writing-plans/`](file:///home/g0pi/Downloads/jarvis/.agents/skills/writing-plans/).
4. **Phase 4: Defensive Test-Driven Development (TDD)** — Write test harnesses FIRST using [`skills/test-driven-development/`](file:///home/g0pi/Downloads/jarvis/.agents/skills/test-driven-development/). Guard against command injection, path traversal, and race conditions.
5. **Phase 5: Production Compliant Code Generation** — Clean separation of concerns, zero `any` types, fail-closed boundaries, files kept strictly under 300 LOC.
6. **Phase 6: Rigorous Quality Gates & Verification** — Run `npm run lint` (`tsc --noEmit`), `npm run build`, and test suites using [`skills/verification-before-completion/`](file:///home/g0pi/Downloads/jarvis/.agents/skills/verification-before-completion/).

---

## 3. Curated Skills Matrix for Coding Agents

| Category | Skills | Purpose |
| :--- | :--- | :--- |
| **Architecture & Planning** | `writing-plans`<br>`executing-plans`<br>`analyze-project-context`<br>`brainstorming` | Design and plan complex features before touching code; trace dependencies and isolate impacts. |
| **Defensive Engineering & QA** | `test-driven-development`<br>`systematic-debugging`<br>`code-quality-check`<br>`verification-before-completion`<br>`requesting-code-review` | Root-cause debugging, defensive test harness, static checklist audit, zero-regression completion proof. |
| **Agent Coordination** | `using-ceo`<br>`subagent-driven-development`<br>`dispatching-parallel-agents`<br>`using-git-worktrees` | Executive task orchestration, isolated worktrees, peer code review, and parallel agent execution. |
| **Systems & Runtime** | `a2a-protocol`<br>`typesafe-ai`<br>`jarvis-ui-system`<br>`openshell-cli`<br>`generate-sandbox-policy`<br>`use-context7` | Linux Foundation A2A messaging, Zod type-safe LLM outputs, cybernetic HUD UX, OpenShell security sandboxing, up-to-date doc search. |

---

## 4. Absolute Operational Laws

1. **Evidence Before Assertions**: Never claim code compiles, runs, or is fixed without running the verification command and checking the output.
2. **Never Hardcoded**: J.A.R.V.I.S. is an evolving AGI/ASI operating system; all paths, models, tokens, and configurations must be dynamic, extensible, and self-healing.
3. **Worktree & Branch Hygiene**: Target `dev` branch for all work. Never commit or push directly to `main` without explicit user sign-off.
