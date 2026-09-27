# J.A.R.V.I.S. Autonomy Strategy: The Autonomous Coworker

## 1. Vision
To transform J.A.R.V.I.S. from a reactive "Request-Response" voice assistant into a **Persistent Autonomous Coworker**. This system will possess situational awareness, learn from its environment without explicit instruction, and take proactive initiative in workspace management and software engineering.

---

## 2. The 4-Tier Autonomy Framework

### I. The Heartbeat (Situational Awareness)
*   **The Problem:** J.A.R.V.I.S. currently only "thinks" when spoken to.
*   **The Solution:** A background "Pulse" daemon (Rust) that monitors the host system 24/7.
*   **Features:**
    *   **Workspace Watcher:** Monitors filesystem events (saves, git commits, new files).
    *   **Telemetry Stream:** Tracks build successes/failures, terminal errors, and system health (CPU/Thermal).
    *   **Context Buffer:** Maintains a real-time "Current State" summary in the `events_mesh` table.

### II. The Internal Monologue (Cognitive Reflection)
*   **The Problem:** Knowledge extraction is currently rule-based and shallow.
*   **The Solution:** A scheduled "Reflection Loop" using LLM-based reasoning.
*   **Features:**
    *   **Nightly Synthesis:** Background worker analyzes the day's conversations and actions to extract "Lessons Learned" and "Workflow Patterns."
    *   **Knowledge Graph Expansion:** Automatically generates `KnowledgeTriples` from code analysis (e.g., "Module A depends on Module B").
    *   **Goal Tracking:** Manages a persistent `GOALS.md` in the Obsidian Vault, breaking user directives into autonomous sub-tasks.

### III. Proactive Actuation (Initiative)
*   **The Problem:** J.A.R.V.I.S. waits for permission for every small task.
*   **The Solution:** An "Action Queue" for low-risk autonomous operations.
*   **Features:**
    *   **Shadow Engineering:** J.A.R.V.I.S. runs tests, lints code, and researches documentation in a hidden background process while the user works.
    *   **Self-Healing Loop:** Automatically attempts to diagnose and fix build failures or environment issues before reporting them.
    *   **Proactive Greeting:** Initiates voice/HUD communication when a significant discovery or risk is identified.

### IV. Multi-modal Mastery (Environmental Memory)
*   **The Problem:** Vision and Audio are transient and session-locked.
*   **The Solution:** Persistent visual and auditory episodic memory.
*   **Features:**
    *   **Visual Indexing:** Stores summaries of screen captures/camera frames in the `memory.db`, allowing J.A.R.V.I.S. to "remember" code or diagrams shown days ago.
    *   **Ambient Listening:** (User Permitted) Monitors ambient audio for context cues, allowing for "Look at this" or "Remember what we talked about" references.

---

## 3. Implementation Roadmap

### Phase 1: The Pulse (Weeks 1-2)
*   **Goal:** Establish situational awareness.
*   **Action:** Implement the Rust `WorkspaceWatcher` daemon.
*   **Output:** Continuous logging of workspace changes to `diary_entries`.

### Phase 2: Contextual Startup (Weeks 3-4)
*   **Goal:** Enable "Morning Briefing" behavior.
*   **Action:** Update the `GeminiLiveBrain` to pre-load the latest `events_mesh` and `diary_entries` on session start.
*   **Output:** J.A.R.V.I.S. starts every session with a contextual summary.

### Phase 3: The Reflection Loop (Weeks 5-6)
*   **Goal:** Implement self-learning.
*   **Action:** Deploy the Python-based "Memory Miner" as a background worker for deep semantic extraction.
*   **Output:** Automatic updating of the Knowledge Graph and User Preferences.

### Phase 4: Autonomous Tasking (Weeks 7-8)
*   **Goal:** Full coworker functionality.
*   **Action:** Enable the `action_queue` for actuators to run autonomously based on LLM "Internal Monologue" decisions.
*   **Output:** J.A.R.V.I.S. performs code cleanup, testing, and documentation without user prompts.

---

## 4. Technical Constraints & Security
*   **Resource Efficiency:** All background loops must be throttled to < 2% CPU usage to avoid impacting host performance.
*   **Local Sovereignty:** All memory and reasoning must prioritize the local SQLite and Obsidian vault.
*   **Security Barriers:** Autonomous actuators are strictly forbidden from destructive commands (`rm -rf`, `format`) without explicit user "high-clearance" confirmation.
*   **Privacy:** Ambient sensing (Camera/Mic) must have clear HUD visual indicators when active.
