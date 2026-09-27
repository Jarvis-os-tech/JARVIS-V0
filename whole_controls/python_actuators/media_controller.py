"""
J.A.R.V.I.S. OS — Media Playback Controller Module
Controls active desktop media players (Spotify, Chrome, Firefox, VLC) via MPRIS2 and playerctl.
"""

import subprocess
import shlex
from typing import Dict, Any

ACTION_MAP = {
    "play": "Play",
    "pause": "Pause",
    "toggle": "PlayPause",
    "play_pause": "PlayPause",
    "next": "Next",
    "previous": "Previous",
    "prev": "Previous",
    "stop": "Stop"
}

async def control_media_playback(action: str = "toggle") -> Dict[str, Any]:
    """
    Controls media playback across all active MPRIS media players.
    Supported actions: play, pause, toggle, next, previous, stop.
    """
    clean_act = action.lower().strip()
    dbus_method = ACTION_MAP.get(clean_act, "PlayPause")

    # 1. D-Bus Direct Method Call (sub-millisecond)
    cmd = (
        f"dbus-send --type=method_call --dest=org.mpris.MediaPlayer2.playerctld "
        f"/org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player.{dbus_method} 2>/dev/null"
    )
    res = subprocess.run(cmd, shell=True)
    if res.returncode == 0:
        return {"success": True, "action": clean_act, "transport": "dbus"}

    # 2. playerctl Fallback
    playerctl_act = "play-pause" if clean_act in ["toggle", "play_pause"] else clean_act
    safe_act = shlex.quote(playerctl_act)
    proc = subprocess.run(f"playerctl {safe_act} 2>/dev/null", shell=True)
    return {
        "success": proc.returncode == 0,
        "action": clean_act,
        "transport": "playerctl"
    }

async def get_media_metadata() -> Dict[str, Any]:
    """Queries currently playing track title, artist, and playback status."""
    try:
        title = subprocess.run("playerctl metadata title 2>/dev/null", shell=True, capture_output=True, text=True).stdout.strip()
        artist = subprocess.run("playerctl metadata artist 2>/dev/null", shell=True, capture_output=True, text=True).stdout.strip()
        status = subprocess.run("playerctl status 2>/dev/null", shell=True, capture_output=True, text=True).stdout.strip()
        return {
            "success": True,
            "playing": status.lower() == "playing",
            "title": title or "Unknown",
            "artist": artist or "Unknown",
            "status": status or "Stopped"
        }
    except Exception as ex:
        return {"success": False, "error": str(ex)}
