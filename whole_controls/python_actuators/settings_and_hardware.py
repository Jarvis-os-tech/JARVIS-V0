"""
J.A.R.V.I.S. OS — Settings & Hardware Actuation Module
Provides fast control over system volume, display brightness, power management profiles,
battery status, and PipeWire sound server health.
"""

import os
import json
import asyncio
import pathlib
import subprocess
from typing import Dict, Any, Optional

try:
    from .binary_resolver import resolve_binary
except ImportError:
    from binary_resolver import resolve_binary

HW_BIN = resolve_binary("hardware_ctrl")


async def _exec_hw(args: list) -> Dict[str, Any]:
    """Helper to invoke native hardware_ctrl binary."""
    if HW_BIN.exists():
        try:
            proc = await asyncio.create_subprocess_exec(
                str(HW_BIN), *args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await proc.communicate()
            if proc.returncode == 0 and stdout:
                try:
                    return json.loads(stdout.decode().strip())
                except json.JSONDecodeError:
                    return {"success": True, "output": stdout.decode().strip()}
        except Exception:
            pass
    return {"success": False, "error": "Native worker unavailable"}

# ── Volume Control ────────────────────────────────────────────────────────────

async def get_system_volume() -> Dict[str, Any]:
    """Gets the current master audio sink volume and mute status."""
    res = await _exec_hw(["get_volume"])
    if res.get("success"):
        return res
    try:
        proc = subprocess.run(["wpctl", "get-volume", "@DEFAULT_AUDIO_SINK@"], capture_output=True, text=True)
        if proc.returncode == 0:
            parts = proc.stdout.strip().split()
            vol = float(parts[1]) * 100 if len(parts) > 1 else 50
            muted = "[MUTED]" in proc.stdout
            return {"success": True, "volume_percent": int(vol), "muted": muted}
    except Exception:
        pass
    return {"success": False, "error": "Could not determine system volume"}

async def set_system_volume(
    volume: Optional[int] = None,
    relative: Optional[str] = None,
    mute: Optional[bool] = None,
    toggle_mute: bool = False
) -> Dict[str, Any]:
    """Sets master volume, adjusts relatively (e.g. +5%, -10%), or sets/toggles mute."""
    if toggle_mute:
        res = await _exec_hw(["toggle_mute"])
        if res.get("success"):
            return res
        subprocess.run(["wpctl", "set-mute", "@DEFAULT_AUDIO_SINK@", "toggle"])
        return {"success": True, "action": "toggle_mute"}

    if mute is not None:
        flag = "1" if mute else "0"
        res = await _exec_hw(["mute_volume", flag])
        if res.get("success"):
            return res
        subprocess.run(["wpctl", "set-mute", "@DEFAULT_AUDIO_SINK@", flag])
        return {"success": True, "action": "set_mute", "muted": mute}

    if relative:
        res = await _exec_hw(["set_volume", str(relative)])
        if res.get("success"):
            return res
        subprocess.run(["wpctl", "set-volume", "@DEFAULT_AUDIO_SINK@", str(relative)])
        return {"success": True, "action": "relative_volume", "change": relative}

    vol = max(0, min(150, int(volume if volume is not None else 50)))
    res = await _exec_hw(["set_volume", str(vol)])
    if res.get("success"):
        return res
    subprocess.run(["wpctl", "set-volume", "@DEFAULT_AUDIO_SINK@", f"{vol}%"])
    return {"success": True, "volume_percent": vol}

# ── Display Brightness ────────────────────────────────────────────────────────

async def get_screen_brightness() -> Dict[str, Any]:
    """Reads current display backlight brightness percentage."""
    res = await _exec_hw(["get_brightness"])
    if res.get("success"):
        return res
    try:
        proc = subprocess.run(["brightnessctl", "g"], capture_output=True, text=True)
        max_proc = subprocess.run(["brightnessctl", "m"], capture_output=True, text=True)
        if proc.returncode == 0 and max_proc.returncode == 0:
            cur = int(proc.stdout.strip())
            mx = int(max_proc.stdout.strip())
            pct = round((cur / mx) * 100)
            return {"success": True, "brightness_percent": pct}
    except Exception:
        pass
    return {"success": False, "error": "Brightness unavailable"}

async def set_display_brightness(brightness_percent: int) -> Dict[str, Any]:
    """Sets display backlight brightness from 1% to 100%."""
    pct = max(1, min(100, int(brightness_percent)))
    res = await _exec_hw(["set_brightness", str(pct)])
    if res.get("success"):
        return res
    subprocess.run(["brightnessctl", "set", f"{pct}%"], capture_output=True)
    return {"success": True, "brightness_percent": pct}

# ── Power Profiles ────────────────────────────────────────────────────────────

async def set_power_profile(profile: str = "balanced") -> Dict[str, Any]:
    """Sets system power profile: performance, balanced, or power-saver."""
    prof = profile.lower().strip()
    if "perf" in prof:
        prof = "performance"
    elif "save" in prof:
        prof = "power-saver"
    else:
        prof = "balanced"

    res = await _exec_hw(["set_power_profile", prof])
    if res.get("success"):
        return res
    subprocess.run(["powerprofilesctl", "set", prof], capture_output=True)
    return {"success": True, "profile": prof}

# ── Battery & Sound Server Diagnostics ────────────────────────────────────────

async def get_battery_status() -> Dict[str, Any]:
    """Queries hardware battery percentage, state, and health."""
    res = await _exec_hw(["get_battery"])
    if res.get("success"):
        return res
    try:
        proc = subprocess.run("upower -i $(upower -e | grep BAT | head -n1)", shell=True, capture_output=True, text=True)
        return {"success": True, "output": proc.stdout.strip()}
    except Exception as ex:
        return {"success": False, "error": str(ex)}

async def heal_sound_server() -> Dict[str, Any]:
    """Restarts PipeWire, WirePlumber, and restores unmuted state to repair audio loops."""
    res = await _exec_hw(["heal_sound_server"])
    if res.get("success"):
        return res
    subprocess.run("systemctl --user restart pipewire pipewire-pulse wireplumber 2>/dev/null && sleep 1 && wpctl set-mute @DEFAULT_AUDIO_SINK@ 0 2>/dev/null", shell=True)
    return {"success": True, "message": "Sound server restarted and unmuted."}
