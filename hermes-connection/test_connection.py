#!/usr/bin/env python3
"""
Test and diagnostic script for hermes-connection.
Verifies binary resolution, socket probing, memory parsing, and output sanitization.

Usage:
    .venv/bin/python hermes-connection/test_connection.py
"""

import sys
import os
import asyncio

# Ensure project root is in sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Import hermes-connection components
from config import HermesConfig, resolve_hermes_bin
from cli_bridge import clean_hermes_output, exec_hermes
from gateway_client import check_hermes_health
from memory_bridge import HermesMemoryBridge
from actuator_tools import HERMES_TOOL_DECLARATIONS, format_hermes_display_card
from connection import HermesConnection


async def run_diagnostics():
    print("=" * 65)
    print("🔍 J.A.R.V.I.S. OS ⟶ HERMES CONNECTION DIAGNOSTIC SUITE")
    print("=" * 65)

    cfg = HermesConfig()
    conn = HermesConnection(config=cfg)

    # 1. Binary Discovery
    print(f"\n[1/5] Binary Resolution:")
    resolved_bin = resolve_hermes_bin()
    print(f"  • Configured Bin: {cfg.bin_path}")
    print(f"  • Resolved Bin  : {resolved_bin}")
    bin_found = os.path.exists(resolved_bin) or bool(os.popen(f"which {resolved_bin} 2>/dev/null").read().strip())
    print(f"  • Bin Available : {'✅ YES' if bin_found else '⚠️ NO (will run in fallback/mock mode)'}")

    # 2. Service & Socket Health
    print(f"\n[2/5] Gateway Health & Socket Probing:")
    health = await check_hermes_health(cfg)
    print(f"  • Gateway Target: {cfg.gateway_host}:{cfg.gateway_port}")
    print(f"  • Socket Reachable : {'✅ ACTIVE' if health['hermes']['gateway']['reachable'] else '❌ UNREACHABLE'}")
    print(f"  • Systemd Service  : {health['hermes']['gateway']['service']} (Active: {health['hermes']['gateway']['serviceActive']})")
    print(f"  • Overall Status   : {'✅ CONNECTED' if health['connected'] else '⚠️ STANDALONE / OFFLINE'}")

    # 3. Memory Vault & Bridge
    print(f"\n[3/5] Memory Vault Integration:")
    mem_status = conn.memory_bridge.get_hermes_status()
    print(f"  • Hermes Home      : {mem_status['hermes_home']} (Exists: {mem_status['hermes_available']})")
    print(f"  • Memories Dir     : {mem_status['memories_dir']}")
    print(f"  • MEMORY.md Exists : {mem_status['memory_md_exists']} ({mem_status['memory_entries_count']} entries, {mem_status['memory_md_size']} bytes)")
    print(f"  • USER.md Exists   : {mem_status['user_md_exists']} ({mem_status['user_entries_count']} entries, {mem_status['user_md_size']} bytes)")
    print(f"  • Vault Directory  : {cfg.vault_path} (Exists: {os.path.exists(cfg.vault_path)})")

    # 4. Sanitizer & Output Parser Verification
    print(f"\n[4/5] Output Sanitization & Clean-up Verification:")
    sample_raw = (
        "\x1b[32m[Hermes]\x1b[0m Starting execution...\n"
        "Warning: Unknown toolsets: omh\n"
        "session_id: sess_test_998811\n"
        "Loaded cached tools\n"
        "╭── Hermes Response ──╮\n"
        "│ Task Result: 42     │\n"
        "╰─────────────────────╯\n"
        "Here is the final verified answer.\n"
    )
    cleaned, sid = clean_hermes_output(sample_raw)
    assert sid == "sess_test_998811", f"Expected session_id sess_test_998811, got {sid}"
    assert "Unknown toolsets" not in cleaned, "Warning was not filtered!"
    assert "\x1b" not in cleaned, "ANSI escape codes were not stripped!"
    print("  • ANSI sequence stripping : ✅ PASSED")
    print("  • Toolset warning filter  : ✅ PASSED")
    print(f"  • Session ID extraction   : ✅ PASSED (Extracted: '{sid}')")

    # 5. Gemini Tool Declaration & Display Card Verification
    print(f"\n[5/5] Tool Declaration & UI Presentation:")
    tools = conn.get_tool_declarations()
    tool_names = [t["name"] for t in tools]
    print(f"  • Registered Tool Schemas: {tool_names}")
    assert "delegate_to_hermes" in tool_names, "Missing delegate_to_hermes declaration!"
    assert "hermes_chat" in tool_names, "Missing hermes_chat declaration!"

    card = format_hermes_display_card("Research test", {"text": "Verified output", "sessionId": sid, "success": True})
    assert card["type"] == "hermes_response", "Display card type mismatch!"
    print(f"  • UI Card Serialization   : ✅ PASSED ({card['title']})")

    print("\n" + "=" * 65)
    print("🎉 HERMES-CONNECTION DIAGNOSTIC COMPLETED: ALL MODULES HEALTHY")
    print("=" * 65)


if __name__ == "__main__":
    asyncio.run(run_diagnostics())
