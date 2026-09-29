"""
Hermes Connection Package for J.A.R.V.I.S. OS.
Provides complete protocol and communication infrastructure between Jarvis and Hermes sub-agent.
"""

from .config import HermesConfig, DEFAULT_CONFIG, resolve_hermes_bin, resolve_vault_path
from .cli_bridge import exec_hermes, clean_hermes_output
from .gateway_client import check_hermes_health, HermesGatewayClient
from .memory_bridge import HermesMemoryBridge
from .actuator_tools import (
    HERMES_TOOL_DECLARATIONS,
    handle_hermes_tool_call,
    format_hermes_display_card,
)
from .connection import HermesConnection

__all__ = [
    "HermesConnection",
    "HermesConfig",
    "DEFAULT_CONFIG",
    "resolve_hermes_bin",
    "resolve_vault_path",
    "exec_hermes",
    "clean_hermes_output",
    "check_hermes_health",
    "HermesGatewayClient",
    "HermesMemoryBridge",
    "HERMES_TOOL_DECLARATIONS",
    "handle_hermes_tool_call",
    "format_hermes_display_card",
]
