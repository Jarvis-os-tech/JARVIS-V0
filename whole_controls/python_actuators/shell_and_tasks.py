"""
J.A.R.V.I.S. OS — Linux Shell & Background Task Runner
Executes shell commands asynchronously without blocking the event loop or audio stream.
"""

import os
import time
import asyncio
from typing import Dict, Any, Optional

_BACKGROUND_TASKS: Dict[str, Dict[str, Any]] = {}

async def execute_linux_command(
    command: str,
    timeout: float = 10.0,
    cwd: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes a shell command asynchronously.
    Enforces timeout protection so calls never freeze the server or event loop.
    """
    if not command.strip():
        return {"success": False, "error": "Empty command provided"}

    try:
        proc = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=cwd or os.getcwd()
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        success = (proc.returncode == 0)
        return {
            "success": success,
            "exit_code": proc.returncode,
            "stdout": stdout.decode("utf-8", errors="replace").strip(),
            "stderr": stderr.decode("utf-8", errors="replace").strip(),
            "command": command
        }
    except asyncio.TimeoutError:
        try:
            proc.kill()
        except Exception:
            pass
        return {"success": False, "error": f"Command timed out after {timeout} seconds", "command": command}
    except Exception as ex:
        return {"success": False, "error": str(ex), "command": command}

async def start_background_task(command: str, task_name: str = "Background Job") -> Dict[str, Any]:
    """
    Spawns an asynchronous background task.
    Returns immediately with task_id so voice flow is unhindered while job runs.
    """
    task_id = f"task_{int(time.time() * 1000)}"
    _BACKGROUND_TASKS[task_id] = {
        "id": task_id,
        "name": task_name,
        "command": command,
        "status": "running",
        "started_at": time.time(),
        "result": None
    }

    async def _runner():
        res = await execute_linux_command(command, timeout=300.0)
        _BACKGROUND_TASKS[task_id]["status"] = "completed" if res.get("success") else "failed"
        _BACKGROUND_TASKS[task_id]["result"] = res
        _BACKGROUND_TASKS[task_id]["completed_at"] = time.time()

    asyncio.create_task(_runner())
    return {
        "success": True,
        "task_id": task_id,
        "status": "started",
        "message": f"Task '{task_name}' launched in background."
    }

async def get_background_tasks() -> Dict[str, Any]:
    """Returns the state of all spawned background jobs."""
    return {"success": True, "tasks": list(_BACKGROUND_TASKS.values())}
