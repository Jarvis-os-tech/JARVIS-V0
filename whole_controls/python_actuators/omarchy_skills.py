"""
J.A.R.V.I.S. OS — Omarchy OS Skills & Hyprland Controller Module
Provides sub-5ms control over the Arch Linux / Omarchy desktop environment:
- Hyprland Direct Socket IPC (workspace navigation, window tiling, focus, float, fullscreen)
- Desktop Themes & Dynamic Wallpaper Switching
- System Toggles (nightlight, status bar, touchpad, screensaver, stay-awake)
- Core Service Restarts (PipeWire audio, Bluetooth, NetworkManager, Shell)
- Smart Capture & Screen OCR
- On-Screen Display (OSD) Banner Notifications
"""

import os
import json
import asyncio
import pathlib
from typing import Dict, Any, Optional, List

try:
    from .binary_resolver import resolve_binary
except ImportError:
    from binary_resolver import resolve_binary

OMARCHY_BIN = resolve_binary("omarchy_ctrl")


async def execute_omarchy_command(domain: str, action: str, target: str = "") -> Dict[str, Any]:
    """
    Executes an Omarchy action using the high-performance native C++ worker.
    Falls back gracefully to the omarchy bash CLI if the binary is missing.
    """
    args = [domain, action]
    if target:
        args.append(str(target))

    if OMARCHY_BIN.exists():
        try:
            proc = await asyncio.create_subprocess_exec(
                str(OMARCHY_BIN), *args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate()
            if proc.returncode == 0 and stdout:
                try:
                    return json.loads(stdout.decode().strip())
                except json.JSONDecodeError:
                    return {"success": True, "raw_output": stdout.decode().strip()}
            return {"success": False, "error": stderr.decode().strip() or "Binary returned non-zero code"}
        except Exception as ex:
            return {"success": False, "error": f"Failed executing native omarchy_ctrl: {ex}"}

    # Shell CLI Fallback
    try:
        cli_cmd = ["omarchy", domain, action]
        if target:
            cli_cmd.append(str(target))
        proc = await asyncio.create_subprocess_exec(
            *cli_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        return {
            "success": proc.returncode == 0,
            "output": stdout.decode().strip(),
            "fallback": "omarchy_cli"
        }
    except Exception as ex:
        return {"success": False, "error": f"Omarchy command execution failed: {ex}"}

# ── Specific High-Level Omarchy Skills ─────────────────────────────────────────

async def switch_workspace(workspace_id: str) -> Dict[str, Any]:
    """Switches the active Hyprland workspace (e.g. 1 to 10)."""
    return await execute_omarchy_command("hyprland", "workspace", str(workspace_id))

async def cycle_window(forward: bool = True) -> Dict[str, Any]:
    """Cycles window focus to next or previous window in the active layout."""
    action = "cyclenext" if forward else "cycleprev"
    return await execute_omarchy_command("hyprland", action)

async def toggle_fullscreen() -> Dict[str, Any]:
    """Toggles fullscreen mode for the active window."""
    return await execute_omarchy_command("hyprland", "fullscreen")

async def toggle_float() -> Dict[str, Any]:
    """Toggles tiling vs floating for the active window."""
    return await execute_omarchy_command("hyprland", "float")

async def set_wallpaper(path: str) -> Dict[str, Any]:
    """Sets the desktop wallpaper using native omarchy-theme-bg-set with automatic path resolution."""
    resolved_path = os.path.expanduser(path.strip())
    # If path is a directory (e.g. ~/Downloads), find latest image
    if os.path.isdir(resolved_path):
        import glob
        img_candidates = []
        for ext in ("*.png", "*.jpg", "*.jpeg", "*.webp", "*.bmp"):
            img_candidates.extend(glob.glob(os.path.join(resolved_path, ext)))
        if img_candidates:
            resolved_path = max(img_candidates, key=os.path.getmtime)
    
    return await execute_omarchy_command("theme", "set_bg", resolved_path)

async def next_wallpaper() -> Dict[str, Any]:
    """Switches the desktop background to the next wallpaper in the Omarchy theme collection."""
    return await execute_omarchy_command("theme", "next_bg")

async def set_theme(theme_name: str) -> Dict[str, Any]:
    """Applies a named Omarchy color and UI theme."""
    return await execute_omarchy_command("theme", "set", theme_name)

async def get_current_theme() -> Dict[str, Any]:
    """Queries the currently applied Omarchy desktop theme."""
    return await execute_omarchy_command("theme", "current")

async def toggle_nightlight() -> Dict[str, Any]:
    """Toggles display blue-light filter / nightlight on or off."""
    return await execute_omarchy_command("toggle", "nightlight")

async def toggle_status_bar() -> Dict[str, Any]:
    """Toggles Waybar or the top status bar visibility."""
    return await execute_omarchy_command("toggle", "bar")

async def toggle_touchpad() -> Dict[str, Any]:
    """Toggles laptop touchpad input enabled/disabled."""
    return await execute_omarchy_command("toggle", "touchpad")

async def toggle_stay_awake() -> Dict[str, Any]:
    """Toggles screen idle inhibition / stay-awake mode."""
    return await execute_omarchy_command("toggle", "stay_awake")

async def restart_desktop_service(service_name: str) -> Dict[str, Any]:
    """Restarts a desktop system service (e.g. audio, wifi, bluetooth, bar, shell)."""
    return await execute_omarchy_command("restart", service_name)

async def capture_screen(mode: str = "smart") -> Dict[str, Any]:
    """Captures screenshot using Omarchy smart selection, fullscreen, or text OCR."""
    return await execute_omarchy_command("capture", mode)

async def send_osd_banner(message: str, icon: str = "dialog-information") -> Dict[str, Any]:
    """Renders a sleek On-Screen Display (OSD) banner directly on the monitor."""
    return await execute_omarchy_command("osd", message, icon)
