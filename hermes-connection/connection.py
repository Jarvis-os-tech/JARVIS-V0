"""
Unified Hermes Connection Client for J.A.R.V.I.S. OS.
Encapsulates CLI execution, TCP socket / HTTP gateway communication,
long-term memory synchronization, and Gemini Live tool declarations.
"""

from typing import Dict, Any, Optional

try:
    from .config import DEFAULT_CONFIG, HermesConfig
    from .cli_bridge import exec_hermes, clean_hermes_output
    from .gateway_client import check_hermes_health, HermesGatewayClient
    from .memory_bridge import HermesMemoryBridge
    from .actuator_tools import HERMES_TOOL_DECLARATIONS, handle_hermes_tool_call, format_hermes_display_card
except (ImportError, ValueError):
    from config import DEFAULT_CONFIG, HermesConfig
    from cli_bridge import exec_hermes, clean_hermes_output
    from gateway_client import check_hermes_health, HermesGatewayClient
    from memory_bridge import HermesMemoryBridge
    from actuator_tools import HERMES_TOOL_DECLARATIONS, handle_hermes_tool_call, format_hermes_display_card


class HermesConnection:
    """
    Primary interface for J.A.R.V.I.S. to communicate with Hermes sub-agent.
    """

    def __init__(self, config: Optional[HermesConfig] = None, memory_engine: Optional[Any] = None):
        self.config = config or DEFAULT_CONFIG
        self.gateway_client = HermesGatewayClient(config=self.config)
        self.memory_bridge = HermesMemoryBridge(memory_engine=memory_engine, config=self.config)

    async def get_health(self) -> Dict[str, Any]:
        """Check Hermes binary, gateway reachability, and memory vault readiness."""
        return await check_hermes_health(self.config)

    async def get_full_status(self) -> Dict[str, Any]:
        """Retrieve complete status combining service health and memory stats."""
        health = await self.get_health()
        mem_status = self.memory_bridge.get_hermes_status()
        return {
            **health,
            "memory": mem_status,
        }

    async def delegate(
        self,
        prompt: str,
        timeout: Optional[float] = None,
        max_turns: Optional[int] = None,
        yolo: Optional[bool] = None,
        session_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Delegate a multi-turn reasoning or research task to Hermes.
        Attempts HTTP gateway if reachable, otherwise uses headless CLI.
        """
        # If gateway socket is reachable, try HTTP gateway first
        if await self.gateway_client.is_reachable():
            gw_res = await self.gateway_client.chat(prompt, session_id=session_name, timeout=timeout or 60.0)
            if gw_res.get("success"):
                return gw_res

        # Fall back to headless CLI bridge
        return await exec_hermes(
            prompt=prompt,
            timeout=timeout,
            max_turns=max_turns,
            yolo=yolo,
            session_name=session_name,
            config=self.config,
        )

    async def handle_tool(
        self,
        args: Dict[str, Any],
        event_emitter: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """Dispatch a tool call from Gemini Live with full event lifecycle emissions."""
        return await handle_hermes_tool_call(args, event_emitter=event_emitter, config=self.config)

    def sync_memories(self) -> Dict[str, Any]:
        """Sync §-delimited long-term memories from ~/.hermes/memories into memory vault."""
        return self.memory_bridge.sync()

    def get_tool_declarations(self):
        """Return the Gemini Live tool declarations list."""
        return HERMES_TOOL_DECLARATIONS
