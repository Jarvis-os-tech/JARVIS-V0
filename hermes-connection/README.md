# 🏛️ Hermes Connection Suite (`hermes-connection`)

> **J.A.R.V.I.S. OS Sub-Agent Communication Infrastructure**  
> Complete implementation, protocols, tools, memory bridges, and diagnostic tools for bidirectional communication between **J.A.R.V.I.S. OS** and **Hermes**.

---

## 🧭 Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │    Gemini Live Session (Voice/Audio)    │
                      └──────────────────┬─────────────────────┘
                                         │ Tool Calling (delegate_to_hermes)
                                         ▼
                      ┌────────────────────────────────────────┐
                      │     JARVIS Actuator Dispatcher         │
                      │      (brain/actuator_dispatcher.py)    │
                      └──────────────────┬─────────────────────┘
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        │                                │                                │
        ▼                                ▼                                ▼
┌──────────────────────┐      ┌──────────────────────┐      ┌──────────────────────┐
│  Headless CLI Bridge │      │ TCP Socket / Gateway │      │     Memory Bridge    │
│   (cli_bridge.py)    │      │  (gateway_client.py) │      │  (memory_bridge.py)  │
└──────────┬───────────┘      └──────────┬───────────┘      └──────────┬───────────┘
           │                             │                             │
           │ Subprocess Exec             │ Port 9119 HTTP / Probe      │ §-delimited parse
           ▼                             ▼                             ▼
┌──────────────────────┐      ┌──────────────────────┐      ┌──────────────────────┐
│  `hermes chat` CLI   │      │ hermes-gateway.service│     │ ~/.hermes/memories/  │
│  (Session Management)│      │ (Systemd Daemon)     │      │ MEMORY.md & USER.md  │
└──────────────────────┘      └──────────────────────┘      └──────────────────────┘
```

---

## 📁 Directory Structure

| File | Purpose |
| :--- | :--- |
| [`__init__.py`](file:///home/g0pi/Projects/Jarvis-OS/hermes-connection/__init__.py) | Package root exporting `HermesConnection`, `exec_hermes`, `check_hermes_health`, etc. |
| [`config.py`](file:///home/g0pi/Projects/Jarvis-OS/hermes-connection/config.py) | Configuration dataclass, environment variable resolution, and binary discovery. |
| [`cli_bridge.py`](file:///home/g0pi/Projects/Jarvis-OS/hermes-connection/cli_bridge.py) | Asynchronous headless CLI delegation with query file management and output sanitization. |
| [`gateway_client.py`](file:///home/g0pi/Projects/Jarvis-OS/hermes-connection/gateway_client.py) | Health check, systemd user service inspector, and TCP socket (port 9119) probing. |
| [`memory_bridge.py`](file:///home/g0pi/Projects/Jarvis-OS/hermes-connection/memory_bridge.py) | Read-only sync of Hermes `MEMORY.md` and `USER.md` with `§` parsing and SHA-256 deduplication. |
| [`actuator_tools.py`](file:///home/g0pi/Projects/Jarvis-OS/hermes-connection/actuator_tools.py) | Gemini Live tool schemas, event lifecycle hooks, and React UI display card formatters. |
| [`connection.py`](file:///home/g0pi/Projects/Jarvis-OS/hermes-connection/connection.py) | Unified client class (`HermesConnection`) combining CLI, Gateway, and Memory sync. |
| [`test_connection.py`](file:///home/g0pi/Projects/Jarvis-OS/hermes-connection/test_connection.py) | Standalone verification and diagnostic script. |
| [`templates/system_prompt_hermes.j2`](file:///home/g0pi/Projects/Jarvis-OS/hermes-connection/templates/system_prompt_hermes.j2) | Jinja2 prompt template defining Hermes persona, fleet commands, and operator triggers. |
| [`service/hermes-gateway.service`](file:///home/g0pi/Projects/Jarvis-OS/hermes-connection/service/hermes-gateway.service) | Systemd user unit definition for running Hermes gateway daemon on port 9119. |

---

## ⚡ 1. Headless CLI Delegation Protocol (`cli_bridge.py`)

When J.A.R.V.I.S. delegates deep research or reasoning to Hermes, it spawns Hermes in headless mode:
- **Temporary Query File**: Prompt is written to `.hermes_query_<timestamp>_<hex>.tmp` to avoid shell escaping or argument size issues.
- **CLI Invocations**:
  ```bash
  hermes -p default chat --continue <session_id> --create-if-missing --query-file <tmp_file> --oneshot -Q --max-turns 12 --yolo
  ```
- **Output Sanitization**:
  - Removes ANSI escape sequences (`\x1b[...]`).
  - Filters `Warning: Unknown toolsets: omh`.
  - Filters cache loading and empty session notices.
  - Extracts active `session_id`.
  - Removes box borders (`┊`) for clean spoken synthesis.

---

## 🔌 2. Gateway Probing & Network Client (`gateway_client.py`)

Hermes can also run as a continuous background daemon on `127.0.0.1:9119`:
- **Systemd Check**: Probes `systemctl --user is-active hermes-gateway.service`.
- **Socket Probe**: Quick TCP connection to `127.0.0.1:9119` (0.5s timeout).
- **HTTP REST Fallback**: Supports posting prompts directly to `/chat` when gateway daemon is running.

---

## 🧠 3. Sovereign Memory Synchronization (`memory_bridge.py`)

Hermes maintains personal memory in `~/.hermes/memories/`:
- `MEMORY.md`: System facts, tool notes, and learned domain knowledge.
- `USER.md`: Operator profile, preferences, and biographical facts.
- **Section Delimiter**: Blocks are delimited by the section sign (`§`).
- **Deduplication**: Content is SHA-256 hashed and stored into JARVIS Tier 3 (Knowledge Tier) memory nodes without duplication.

---

## 🎙️ 4. Gemini Live Tool Calling (`actuator_tools.py`)

Registered under JARVIS's Gemini Live tool declarations:
```json
{
  "name": "delegate_to_hermes",
  "description": "Delegate complex multi-step reasoning, deep research, personal memory vault synthesis, creative long-form writing, and multi-turn workflows to Hermes sub-agent.",
  "parameters": {
    "type": "OBJECT",
    "properties": {
      "prompt": { "type": "STRING", "description": "The task instructions, context, or query for Hermes." },
      "max_turns": { "type": "NUMBER", "description": "Maximum reasoning turns (default 12)." }
    },
    "required": ["prompt"]
  }
}
```

During execution, the following WebSocket events stream to the UI:
1. `task_started` (`Hermes ⟶ <prompt>`)
2. `agent_log` (`level="info"`, `level="step"`)
3. `task_progress` (`35%`, `Hermes deep reasoning & personal vault synthesis...`)
4. `task_completed` with `display_card`:
   ```json
   {
     "type": "hermes_response",
     "title": "Hermes ⟶ ...",
     "data": { "text": "...", "prompt": "...", "sessionId": "..." }
   }
   ```

---

## 🧪 5. Testing & Diagnostics

Run the standalone verification suite:
```bash
.venv/bin/python hermes-connection/test_connection.py
```

Check Python syntax / bytecode compilation:
```bash
.venv/bin/python -m py_compile hermes-connection/*.py
```

Run system core engine dry-run:
```bash
python3 main.py --dry-run
```
