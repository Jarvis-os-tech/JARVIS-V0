"""
Configuration module for Hermes connection in J.A.R.V.I.S. OS.
Resolves binary paths, network ports, timeouts, memory directories, and systemd units.
"""

import os
import shutil
from dataclasses import dataclass
from typing import Optional


def resolve_hermes_bin() -> str:
    """Find the Hermes agent CLI executable across environment variables and standard install paths."""
    env_bin = os.getenv("HERMES_BIN")
    if env_bin and os.path.exists(env_bin):
        return env_bin

    which_bin = shutil.which("hermes")
    if which_bin:
        return which_bin

    candidates = [
        os.path.expanduser("~/.local/bin/hermes"),
        os.path.expanduser("~/.hermes/hermes-agent/bin/hermes"),
        os.path.expanduser("~/.hermes/bin/hermes"),
    ]
    for p in candidates:
        if os.path.exists(p):
            return p

    return "hermes"


def resolve_vault_path() -> str:
    """Resolve the active memory vault directory in JARVIS-OS."""
    cwd = os.getcwd()
    candidates = [
        os.path.join(cwd, "memory", "vault"),
        os.path.join(cwd, "jarvis-memory"),
        os.path.join(cwd, "friday-memory"),
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    return candidates[0]


@dataclass
class HermesConfig:
    """Central configuration for Hermes communication."""
    bin_path: str = resolve_hermes_bin()
    gateway_host: str = os.getenv("HERMES_GATEWAY_HOST", "127.0.0.1")
    gateway_port: int = int(os.getenv("HERMES_GATEWAY_PORT", "9119"))
    timeout_ms: int = int(os.getenv("HERMES_TIMEOUT_MS", "180000"))
    max_turns: int = int(os.getenv("HERMES_MAX_TURNS", "12"))
    yolo: bool = os.getenv("HERMES_YOLO", "true").lower() in ("true", "1", "yes")
    service_unit: str = os.getenv("HERMES_SERVICE_UNIT", "hermes-gateway.service")
    hermes_home: str = os.path.expanduser(os.getenv("HERMES_HOME", "~/.hermes"))
    memories_dir: str = os.path.expanduser(os.getenv("HERMES_MEMORIES_DIR", "~/.hermes/memories"))
    vault_path: str = resolve_vault_path()

    @property
    def gateway_url(self) -> str:
        return f"http://{self.gateway_host}:{self.gateway_port}"

    @property
    def timeout_sec(self) -> float:
        return self.timeout_ms / 1000.0


# Default global configuration instance
DEFAULT_CONFIG = HermesConfig()
