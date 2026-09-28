"""
JARVIS Connectors Module
Direct Python interface for Google Workspace & GitHub MCP tools.
"""

from .connectors import (
    REGISTRY,
    call_tool,
    get_registry,
    get_statuses,
    get_status,
    get_oauth_url,
    handle_oauth_callback,
    disconnect,
    get_valid_token,
    google_mcp_call,
    github_mcp_call,
)

__all__ = [
    "REGISTRY",
    "call_tool",
    "get_registry",
    "get_statuses",
    "get_status",
    "get_oauth_url",
    "handle_oauth_callback",
    "disconnect",
    "get_valid_token",
    "google_mcp_call",
    "github_mcp_call",
]
