"""
J.A.R.V.I.S. OS — Systemd Service Management Module
Inspects and manages systemd system and user units (start, stop, restart, status).
"""

import subprocess
import shlex
import pathlib
import json
import asyncio
from typing import Dict, Any, Optional

try:
    from .binary_resolver import resolve_binary
except ImportError:
    from binary_resolver import resolve_binary

SVC_BIN = resolve_binary("service_ctrl")


KNOWN_USER_SERVICES = {
    "hermes": "hermes-gateway.service",
    "openclaw": "openclaw-gateway.service",
    "jarvis": "jarvis-gateway.service",
    "pipewire": "pipewire.service",
    "wireplumber": "wireplumber.service"
}

async def manage_systemd_service(action: str, unit: Optional[str] = None) -> Dict[str, Any]:
    """
    Manages systemd services.
    Actions: status, start, stop, restart, list.
    """
    clean_action = action.lower().strip()

    if clean_action == "list":
        proc = subprocess.run(
            "systemctl list-units --type=service --state=running --no-pager | head -40",
            shell=True, capture_output=True, text=True
        )
        return {"success": True, "output": proc.stdout.strip()}

    if not unit:
        return {"success": False, "error": "Unit name is required for service actions."}

    unit_clean = unit.lower().strip()
    resolved_unit = KNOWN_USER_SERVICES.get(unit_clean, unit)
    is_user_unit = resolved_unit in KNOWN_USER_SERVICES.values()

    # User systemd service path
    if is_user_unit:
        safe_unit = shlex.quote(resolved_unit)
        safe_act = shlex.quote(clean_action)
        proc = subprocess.run(f"systemctl --user {safe_act} {safe_unit} --no-pager 2>&1 | head -30", shell=True, capture_output=True, text=True)
        return {"success": proc.returncode == 0, "unit": resolved_unit, "output": proc.stdout.strip()}

    # Native C++ Service Controller
    if SVC_BIN.exists():
        try:
            p = await asyncio.create_subprocess_exec(
                str(SVC_BIN), f"--action={clean_action}", f"--unit={resolved_unit}",
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await p.communicate()
            if p.returncode == 0 and stdout:
                try:
                    return json.loads(stdout.decode().strip())
                except json.JSONDecodeError:
                    return {"success": True, "output": stdout.decode().strip()}
        except Exception:
            pass

    # Systemctl System CLI Fallback
    safe_unit = shlex.quote(resolved_unit)
    safe_act = shlex.quote(clean_action)
    proc = subprocess.run(f"systemctl {safe_act} {safe_unit} --no-pager 2>&1 | head -30", shell=True, capture_output=True, text=True)
    return {"success": proc.returncode == 0, "unit": resolved_unit, "output": proc.stdout.strip()}
