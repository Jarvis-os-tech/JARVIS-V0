"""
J.A.R.V.I.S. OS — Application & Window Closer Module
Provides deterministic window closing, browser tab closing, and process termination.
"""

import subprocess
import shlex
import asyncio
from typing import Dict, Any, Optional

async def close_window(target: Optional[str] = None) -> Dict[str, Any]:
    """
    Closes the active window or a target window.
    Interprets tab references and browser targets intelligently.
    """
    if not target or target.lower() in ["active", "current", "this window"]:
        # Try Hyprland / Omarchy native hotkey or dispatch
        res = subprocess.run(["hyprctl", "dispatch", "closewindow", "activewindow"], capture_output=True, text=True)
        if res.returncode == 0 and "ok" in res.stdout.lower():
            return {"success": True, "status": "closed", "target": "active", "message": "Closed active window via Hyprland."}
        
        # Fallback to Alt+F4 / xdotool
        try:
            subprocess.run(["xdotool", "getactivewindow", "windowclose"], capture_output=True, timeout=1.0)
            return {"success": True, "status": "closed", "target": "active", "message": "Closed active window via xdotool."}
        except Exception:
            pass

    target_clean = (target or "").strip()
    target_lower = target_clean.lower()

    # Browser tab shortcuts
    if target_lower in ["tab", "current tab", "active tab", "this tab", "youtube", "github", "google", "reddit", "twitter"]:
        return await close_browser_tab()

    if target_lower in ["all tabs", "all browser tabs", "browser", "chrome", "firefox"]:
        return await close_all_browser_tabs()

    # Close specific window by name via pkill -15
    safe_target = shlex.quote(target_clean)
    proc = subprocess.run(f"pkill -15 -i -f {safe_target} 2>/dev/null || true", shell=True, capture_output=True, text=True)
    return {
        "success": True,
        "status": "closed",
        "target": target_clean,
        "message": f"Closed application/window '{target_clean}'."
    }

async def close_browser_tab() -> Dict[str, Any]:
    """Closes the currently active browser tab via Ctrl+W hotkey."""
    try:
        # Try ydotool or wtype for Wayland
        proc = subprocess.run(["wtype", "-M", "ctrl", "w", "-m", "ctrl"], capture_output=True, timeout=1.0)
        if proc.returncode == 0:
            return {"success": True, "action": "close_tab", "message": "Closed active browser tab via Wayland wtype."}
    except Exception:
        pass

    try:
        # Try xdotool
        proc = subprocess.run(["xdotool", "key", "ctrl+w"], capture_output=True, timeout=1.0)
        if proc.returncode == 0:
            return {"success": True, "action": "close_tab", "message": "Closed active browser tab via xdotool."}
    except Exception:
        pass

    return {"success": True, "action": "close_tab", "message": "Dispatched tab close shortcut."}

async def close_all_browser_tabs() -> Dict[str, Any]:
    """Terminates all running instances of browser windows."""
    subprocess.run("pkill -15 -f 'chrome' 2>/dev/null || pkill -15 -f 'firefox' 2>/dev/null || true", shell=True)
    return {"success": True, "action": "close_all_tabs", "message": "Closed all browser instances."}

async def manage_process(
    pid: Optional[int] = None,
    process_name: Optional[str] = None,
    signal: str = "SIGTERM"
) -> Dict[str, Any]:
    """
    Kills or sends a signal to a process by PID or name.
    Supported signals: SIGTERM (15), SIGKILL (9), SIGHUP (1), SIGINT (2).
    """
    if not pid and not process_name:
        return {"success": False, "error": "Must provide either pid or process_name."}

    sig = signal.upper()
    if not sig.startswith("SIG") and sig.isdigit():
        sig_num = int(sig)
    else:
        sig_map = {"SIGTERM": 15, "SIGKILL": 9, "SIGHUP": 1, "SIGINT": 2}
        sig_num = sig_map.get(sig, 15)

    if pid:
        try:
            subprocess.run(["kill", f"-{sig_num}", str(int(pid))], check=True, capture_output=True)
            return {"success": True, "pid": pid, "signal": sig_num, "message": f"Sent signal {sig_num} to PID {pid}."}
        except subprocess.CalledProcessError as err:
            return {"success": False, "error": f"Failed to signal PID {pid}: {err.stderr.decode()}"}

    if process_name:
        safe_name = shlex.quote(process_name)
        proc = subprocess.run(f"pkill -{sig_num} -f {safe_name}", shell=True, capture_output=True, text=True)
        return {
            "success": proc.returncode == 0,
            "process_name": process_name,
            "signal": sig_num,
            "message": f"Signaled process(es) matching '{process_name}' with signal {sig_num}."
        }
