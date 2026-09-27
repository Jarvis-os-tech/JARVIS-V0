"""
J.A.R.V.I.S. OS — Desktop Automation & Computer Use Module
Provides deterministic input synthesis (mouse, keyboard, shortcuts) and window inspection
via the native C++ desktop_control actuator.
"""

import os
import json
import time
import asyncio
import pathlib
import subprocess
from typing import Dict, Any, Optional

import shutil

def _resolve_binary(name: str) -> pathlib.Path:
    env_dir = os.environ.get("JARVIS_WORKERS_BIN")
    if env_dir:
        cand = pathlib.Path(env_dir) / name
        if cand.exists():
            return cand
    local_cand = pathlib.Path(__file__).resolve().parent.parent / "native_workers" / "bin" / name
    if local_cand.exists():
        return local_cand
    which = shutil.which(name)
    if which:
        return pathlib.Path(which)
    return local_cand

DESKTOP_BIN = _resolve_binary("desktop_control")

async def _exec_desktop(args: list) -> Dict[str, Any]:
    """Helper to invoke native desktop_control binary."""
    if DESKTOP_BIN.exists():
        try:
            proc = await asyncio.create_subprocess_exec(
                str(DESKTOP_BIN), *args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate()
            if proc.returncode == 0 and stdout:
                try:
                    return json.loads(stdout.decode().strip())
                except json.JSONDecodeError:
                    return {"success": True, "output": stdout.decode().strip()}
            return {"success": False, "error": stderr.decode().strip()}
        except Exception as ex:
            return {"success": False, "error": str(ex)}
    return {"success": False, "error": "Native desktop_control binary not available"}

async def mouse_click(x: int = -1, y: int = -1, button: str = "left", count: int = 1) -> Dict[str, Any]:
    """Clicks at (x, y) or at current cursor position if x/y are negative."""
    return await _exec_desktop(["click", str(x), str(y), button, str(count)])

async def mouse_move(x: int, y: int) -> Dict[str, Any]:
    """Moves cursor to absolute coordinates (x, y)."""
    return await _exec_desktop(["move", str(x), str(y)])

async def mouse_scroll(dx: int = 0, dy: int = -1) -> Dict[str, Any]:
    """Synthesizes mouse scroll wheel events (positive dy scrolls up, negative down)."""
    return await _exec_desktop(["scroll", str(dx), str(dy)])

async def type_text(text: str) -> Dict[str, Any]:
    """Types raw text string into the currently focused window."""
    return await _exec_desktop(["type_text", text])

async def send_hotkey(combo: str) -> Dict[str, Any]:
    """Dispatches a key combo shortcut (e.g. 'ctrl+c', 'ctrl+w', 'alt+F4', 'super')."""
    return await _exec_desktop(["hotkey", combo])

async def take_screenshot(output_path: Optional[str] = None) -> Dict[str, Any]:
    """Takes a full-resolution screenshot and saves it to output_path."""
    path = output_path or f"/tmp/jarvis_screenshot_{int(time.time())}.png"
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)

    res = await _exec_desktop(["screenshot", path])
    if res.get("success") or os.path.exists(path):
        return {"success": True, "image_path": path, "message": f"Screenshot saved to {path}"}

    # Shell fallbacks
    for cmd in [f"grim '{path}' 2>/dev/null", f"gnome-screenshot -f '{path}' 2>/dev/null", f"scrot '{path}' 2>/dev/null"]:
        subprocess.run(cmd, shell=True)
        if os.path.exists(path):
            return {"success": True, "image_path": path, "message": f"Screenshot saved to {path} via fallback"}

    return {"success": False, "error": "No screenshot utility available"}
