"""
J.A.R.V.I.S. OS — Clipboard Automation Module
Provides cross-desktop clipboard read/write capabilities supporting Wayland and X11.
"""

import subprocess
from typing import Dict, Any

_INTERNAL_BUFFER = ""

async def read_clipboard() -> Dict[str, Any]:
    """Reads current UTF-8 text from system clipboard."""
    global _INTERNAL_BUFFER
    # 1. Try Wayland wl-paste
    try:
        proc = subprocess.run(["wl-paste", "-n"], capture_output=True, text=True, timeout=1.0)
        if proc.returncode == 0 and proc.stdout:
            _INTERNAL_BUFFER = proc.stdout
            return {"success": True, "text": proc.stdout, "backend": "wl-paste"}
    except Exception:
        pass

    # 2. Try X11 xclip
    try:
        proc = subprocess.run(["xclip", "-selection", "clipboard", "-o"], capture_output=True, text=True, timeout=1.0)
        if proc.returncode == 0 and proc.stdout:
            _INTERNAL_BUFFER = proc.stdout
            return {"success": True, "text": proc.stdout, "backend": "xclip"}
    except Exception:
        pass

    # 3. Try X11 xsel
    try:
        proc = subprocess.run(["xsel", "--clipboard", "--output"], capture_output=True, text=True, timeout=1.0)
        if proc.returncode == 0 and proc.stdout:
            _INTERNAL_BUFFER = proc.stdout
            return {"success": True, "text": proc.stdout, "backend": "xsel"}
    except Exception:
        pass

    return {"success": True, "text": _INTERNAL_BUFFER, "backend": "internal_cache"}

async def write_clipboard(text: str) -> Dict[str, Any]:
    """Writes text string to the system clipboard."""
    global _INTERNAL_BUFFER
    _INTERNAL_BUFFER = text
    encoded = text.encode("utf-8")
    copied = False
    backend = "internal_cache"

    # 1. Try Wayland wl-copy
    try:
        proc = subprocess.run(["wl-copy"], input=encoded, capture_output=True, timeout=1.0)
        if proc.returncode == 0:
            copied = True
            backend = "wl-copy"
    except Exception:
        pass

    # 2. Try X11 xclip
    if not copied:
        try:
            proc = subprocess.run(["xclip", "-selection", "clipboard"], input=encoded, capture_output=True, timeout=1.0)
            if proc.returncode == 0:
                copied = True
                backend = "xclip"
        except Exception:
            pass

    return {
        "success": True,
        "characters_written": len(text),
        "backend": backend,
        "system_clipboard_updated": copied
    }
