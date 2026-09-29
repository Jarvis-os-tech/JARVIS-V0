"""
Hermes Gateway & Network Probe Client for J.A.R.V.I.S. OS.
Provides systemd service inspection, TCP socket probing, and HTTP REST gateway interactions.
"""

import os
import socket
import shutil
import asyncio
import subprocess
from typing import Dict, Any, Optional

try:
    import httpx
except ImportError:
    httpx = None  # Fallback if httpx is not installed

try:
    from .config import DEFAULT_CONFIG, HermesConfig
except (ImportError, ValueError):
    from config import DEFAULT_CONFIG, HermesConfig


async def check_hermes_health(config: Optional[HermesConfig] = None) -> Dict[str, Any]:
    """
    Check availability and operational readiness of Hermes:
    1. Verifies local CLI binary presence.
    2. Probes systemd user service ('hermes-gateway.service').
    3. Probes TCP socket on port 9119.
    4. Validates personal memory vault directory.
    """
    cfg = config or DEFAULT_CONFIG
    bin_exists = bool(shutil.which(cfg.bin_path) or os.path.exists(cfg.bin_path))
    reachable = False
    service_active = False

    # 1. Probe systemd user service first
    try:
        proc = await asyncio.to_thread(
            subprocess.run,
            ["systemctl", "--user", "is-active", cfg.service_unit],
            capture_output=True,
            text=True,
            timeout=2.0
        )
        if proc.stdout.strip() == "active":
            service_active = True
            reachable = True
    except Exception:
        pass

    # 2. Fall back to socket probe on configured port (default 9119)
    if not reachable:
        try:
            def _probe_socket():
                with socket.create_connection((cfg.gateway_host, cfg.gateway_port), timeout=0.5):
                    return True
            reachable = await asyncio.to_thread(_probe_socket)
        except Exception:
            reachable = False

    vault_exists = os.path.exists(cfg.vault_path)

    return {
        "ok": bin_exists,
        "hermes": {
            "ok": bin_exists,
            "version": "Hermes Agent v0.21.0",
            "binary": cfg.bin_path,
            "gateway": {
                "url": f"{cfg.gateway_host}:{cfg.gateway_port}",
                "reachable": reachable,
                "service": cfg.service_unit,
                "serviceActive": service_active,
            },
        },
        "connected": bin_exists and reachable,
        "delegation": "ready" if bin_exists else "unavailable",
        "vault": cfg.vault_path,
        "vaultExists": vault_exists,
    }


class HermesGatewayClient:
    """
    HTTP REST client for communicating directly with a running Hermes Gateway daemon.
    """

    def __init__(self, config: Optional[HermesConfig] = None):
        self.config = config or DEFAULT_CONFIG
        self.base_url = self.config.gateway_url

    async def is_reachable(self) -> bool:
        """Quick check if gateway socket responds."""
        try:
            def _probe():
                with socket.create_connection((self.config.gateway_host, self.config.gateway_port), timeout=0.5):
                    return True
            return await asyncio.to_thread(_probe)
        except Exception:
            return False

    async def chat(self, prompt: str, session_id: Optional[str] = None, timeout: float = 60.0) -> Dict[str, Any]:
        """
        Send a chat prompt via HTTP REST to Hermes gateway daemon.
        """
        if httpx is None:
            return {"success": False, "error": "httpx package is required for HTTP gateway communication"}

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                payload = {
                    "message": prompt,
                    "prompt": prompt,
                    "session_id": session_id or "jarvis_gateway_session",
                }
                resp = await client.post(f"{self.base_url}/chat", json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    reply = data.get("reply") or data.get("text") or data.get("response") or ""
                    return {
                        "success": True,
                        "text": reply,
                        "sessionId": data.get("session_id") or session_id,
                        "raw": data,
                    }
                return {
                    "success": False,
                    "text": "",
                    "error": f"Gateway responded with status {resp.status_code}: {resp.text}",
                }
        except Exception as e:
            return {"success": False, "text": "", "error": f"Gateway connection failed: {str(e)}"}
