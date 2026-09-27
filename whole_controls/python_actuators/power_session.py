"""
J.A.R.V.I.S. OS — System Power & Session Control Module
Handles system power state transitions (lock, suspend, reboot, shutdown).
"""

import subprocess
import asyncio
from typing import Dict, Any

POWER_COMMANDS = {
    "lock": "loginctl lock-session || hyprlock || swaylock",
    "sleep": "systemctl suspend",
    "suspend": "systemctl suspend",
    "reboot": "systemctl reboot",
    "restart": "systemctl reboot",
    "shutdown": "systemctl poweroff",
    "poweroff": "systemctl poweroff"
}

async def execute_power_action(action: str = "lock") -> Dict[str, Any]:
    """
    Executes a system power or session action.
    Supported: lock, sleep, reboot, shutdown.
    """
    clean_act = action.lower().strip()
    cmd = POWER_COMMANDS.get(clean_act)
    if not cmd:
        return {"success": False, "error": f"Unknown power action '{action}'. Valid: lock, sleep, reboot, shutdown."}

    proc = await asyncio.create_subprocess_shell(
        cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await proc.communicate()
    return {
        "success": proc.returncode == 0,
        "action": clean_act,
        "stdout": stdout.decode().strip(),
        "stderr": stderr.decode().strip()
    }
