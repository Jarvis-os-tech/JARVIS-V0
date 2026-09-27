"""
J.A.R.V.I.S. OS — Vision & Screen/Camera Controller Module
Manages multimodal vision feeds: screen sharing, webcam capture, and UI stream state.
"""

from typing import Dict, Any

_VISION_STATE = {"mode": "off", "active": False}

async def toggle_vision_mode(mode: str = "off", action: str = "start") -> Dict[str, Any]:
    """
    Toggles multimodal vision state.
    Modes: screen, camera, off.
    Actions: start, stop.
    """
    global _VISION_STATE
    clean_mode = str(mode).lower().strip()
    clean_action = str(action).lower().strip()

    if clean_action == "stop" or clean_mode in ["off", "stop"]:
        _VISION_STATE = {"mode": "off", "active": False}
        return {
            "success": True,
            "vision_state": _VISION_STATE,
            "message": "All vision feeds deactivated."
        }

    _VISION_STATE = {"mode": clean_mode, "active": True}
    return {
        "success": True,
        "vision_state": _VISION_STATE,
        "message": f"Vision mode '{clean_mode}' activated."
    }

async def get_vision_state() -> Dict[str, Any]:
    """Returns current active vision feed mode."""
    return {"success": True, "vision_state": _VISION_STATE}
