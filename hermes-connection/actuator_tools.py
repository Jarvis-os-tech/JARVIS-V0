"""
Hermes Actuator Tool Declarations & Execution Handlers for J.A.R.V.I.S. OS.
Provides Gemini Live tool definitions, event lifecycle emissions, and UI card formatters.
"""

import time
from typing import Dict, Any, Optional, Callable, Awaitable

try:
    from .cli_bridge import exec_hermes
    from .config import DEFAULT_CONFIG, HermesConfig
except (ImportError, ValueError):
    from cli_bridge import exec_hermes
    from config import DEFAULT_CONFIG, HermesConfig

# ─── GEMINI LIVE TOOL DECLARATIONS ──────────────────────────────────────────

HERMES_TOOL_DECLARATIONS = [
    {
        "name": "delegate_to_hermes",
        "description": (
            "Delegate complex multi-step reasoning, deep research, personal memory vault synthesis, "
            "creative long-form writing, and multi-turn workflows to Hermes sub-agent. "
            "Call this for in-depth research, complex analysis, or long-form problem solving."
        ),
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "prompt": {
                    "type": "STRING",
                    "description": "The task instructions, context, or research query for Hermes."
                },
                "max_turns": {
                    "type": "NUMBER",
                    "description": "Maximum number of reasoning turns to allow Hermes (default 12)."
                }
            },
            "required": ["prompt"]
        }
    },
    {
        "name": "hermes_chat",
        "description": "Direct chat conversation with Hermes sub-agent.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "prompt": {
                    "type": "STRING",
                    "description": "Message or query for Hermes."
                }
            },
            "required": ["prompt"]
        }
    },
    {
        "name": "delegate_task",
        "description": (
            "Delegate any complex task to a specialized autonomous sub-agent "
            "(Hermes for deep research/writing/vault memory; Ultron for security/diagnostics; "
            "or Prime for software engineering)."
        ),
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "task": {
                    "type": "STRING",
                    "description": "Detailed task instructions."
                },
                "target_agent": {
                    "type": "STRING",
                    "description": "Sub-agent name: 'hermes', 'ultron', or 'prime-agent'."
                }
            },
            "required": ["task"]
        }
    }
]


def format_hermes_display_card(prompt: str, response: Dict[str, Any]) -> Dict[str, Any]:
    """
    Format a standard UI presentation card for the React 19 frontend
    (LiveExecutionConsole and SkillDisplayCard).
    """
    return {
        "type": "hermes_response",
        "title": f"Hermes ⟶ {prompt[:50]}",
        "data": {
            "text": response.get("text", ""),
            "prompt": prompt,
            "sessionId": response.get("sessionId"),
            "success": response.get("success", False),
            "error": response.get("error"),
        }
    }


async def handle_hermes_tool_call(
    args: Dict[str, Any],
    event_emitter: Optional[Any] = None,
    config: Optional[HermesConfig] = None,
) -> Dict[str, Any]:
    """
    Execute a Hermes delegation tool call with full lifecycle event emissions:
    - task_started
    - agent_log (info, step, success/error)
    - task_progress
    - task_completed with UI display card

    Args:
        args: Dictionary containing 'prompt' or 'task'.
        event_emitter: Optional dispatcher instance with emit_* coroutines.
        config: Optional Hermes configuration.

    Returns:
        Result dictionary from exec_hermes.
    """
    cfg = config or DEFAULT_CONFIG
    prompt = (args.get("prompt") or args.get("task") or "").strip()
    max_turns = args.get("max_turns")
    task_id = f"task_hermes_{int(time.time() * 1000)}"

    # Helper for safe async event emission
    async def _emit(method_name: str, *a, **kw):
        if event_emitter and hasattr(event_emitter, method_name):
            try:
                fn = getattr(event_emitter, method_name)
                res = fn(*a, **kw)
                if hasattr(res, "__await__"):
                    await res
            except Exception:
                pass

    await _emit("emit_task_started", task_id, f"Hermes ⟶ {prompt[:50] or 'Deep Reasoning'}", "hermes", prompt=prompt)
    await _emit("emit_agent_log", "hermes", f"Delegation dispatched: {prompt[:70]}", level="info", task_id=task_id)
    await _emit("emit_task_progress", task_id, 35, "Hermes deep reasoning & personal vault synthesis...")
    await _emit("emit_agent_log", "hermes", "Accessing memory vault and initializing reasoning turns...", level="step", task_id=task_id)

    res = await exec_hermes(prompt, max_turns=max_turns, config=cfg)
    card = format_hermes_display_card(prompt, res)

    if res.get("success"):
        await _emit("emit_agent_log", "hermes", f"Task completed successfully (session {res.get('sessionId', 'default')})", level="success", task_id=task_id)
        await _emit("emit_task_completed", task_id, True, res, display_card=card)
    else:
        await _emit("emit_agent_log", "hermes", f"Task error: {res.get('error')}", level="error", task_id=task_id)
        await _emit("emit_task_completed", task_id, False, res, display_card=card, error=res.get("error"))

    return res
