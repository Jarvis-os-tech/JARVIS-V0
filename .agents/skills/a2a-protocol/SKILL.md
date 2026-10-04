---
name: a2a-protocol
description: Linux Foundation / Google Agent-to-Agent (A2A) Protocol - interoperability standard for AI agent discovery, Agent Cards, JSON-RPC 2.0 task delegation, and cross-framework multi-agent squads.
---

# Agent-to-Agent (A2A) Protocol in J.A.R.V.I.S.

## Overview

The **Agent-to-Agent (A2A) Protocol** is an open standard stewarded by the Linux Foundation and originally pioneered by Google. While protocols like MCP connect models to tools and static data, A2A connects independent, heterogeneous AI agents so they can discover each other, delegate complex tasks, and collaborate asynchronously.

In J.A.R.V.I.S., the A2A protocol powers:
1. **Agent Cards**: Standardized metadata (`/.well-known/agent-card.json` and `/.well-known/agent.json`) describing the agent's identity, skills, supported interfaces, and input/output modes.
2. **JSON-RPC 2.0 / REST Task Dispatch**: Structured message exchange (`tasks.send`, `tasks.get`, `tasks.cancel`).
3. **Multi-Domain Interoperability**: Seamless bridging between CLI agents (Claude Code, Codex, Hermes, OpenCode), IDE agents (Orca IDE, Antigravity IDE), Web agents, and J.A.R.V.I.S. core.
4. **Local Python SDK**: Powered by the official `a2a-sdk` installed in `a2a-protocol/.venv/`.

---

## Workspace Structure

- `a2a-protocol/`: Official A2A protocol specification repository.
  - `specification/a2a.proto`: Core Protobuf definition.
  - `sdk-python/`: Official Python SDK source.
  - `.venv/`: Dedicated Python virtual environment with `a2a-sdk`, `fastapi`, `uvicorn`, `grpcio`.
  - `jarvis_a2a_agent.py`: Local A2A agent service exposing `/.well-known/agent-card.json` on port 3001.
- `a2a`: Symlink to `a2a-protocol/` for convenient path resolution.
- `backend/system_modules/intelligent_system/`:
  - `a2a_types.ts`: Canonical TypeScript type definitions conforming to `a2a.proto`.
  - `a2a_hub.ts`: Central hub hosting the master agent card and routing JSON-RPC tasks.
  - `a2a_service_bridge.ts`: TypeScript service bridge to spawn and control the local Python A2A service.

---

## Using A2A in J.A.R.V.I.S.

### 1. Discovering Agent Cards
Query the J.A.R.V.I.S. master card:
```bash
curl -s http://127.0.0.1:3000/.well-known/agent-card.json
```

Or query connected squad status:
```bash
curl -s http://127.0.0.1:3000/api/a2a/status
```

### 2. Delegating Tasks via JSON-RPC 2.0
Send a task to any agent in the squad:
```bash
curl -X POST http://127.0.0.1:3000/api/a2a/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "task-001",
    "method": "tasks.send",
    "params": {
      "targetAgent": "Hermes",
      "prompt": "Analyze test coverage for backend system modules."
    }
  }'
```

### 3. Starting the Dedicated Python A2A Service
```bash
./a2a-protocol/.venv/bin/python a2a-protocol/jarvis_a2a_agent.py --port 3001
```
Or trigger it via J.A.R.V.I.S. REST API:
```bash
curl -X POST http://127.0.0.1:3000/api/a2a/start-service
```
