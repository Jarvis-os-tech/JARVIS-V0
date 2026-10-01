"""
J.A.R.V.I.S. OS — Application & URL Launcher Module
Provides deterministic, sub-millisecond execution for launching local GUI applications,
resolving .desktop files, and opening web applications/URLs.
"""

import os
import shutil
import subprocess
import shlex
from typing import Dict, Any, Optional, List

WEB_SHORTCUTS: Dict[str, str] = {
    "youtube": "https://www.youtube.com",
    "google": "https://www.google.com",
    "github": "https://github.com",
    "gmail": "https://mail.google.com",
    "reddit": "https://www.reddit.com",
    "twitter": "https://x.com",
    "x": "https://x.com",
    "chatgpt": "https://chatgpt.com",
    "spotify": "https://open.spotify.com",
    "netflix": "https://www.netflix.com",
    "notion": "https://www.notion.so",
    "maps": "https://maps.google.com",
    "google maps": "https://maps.google.com",
    "docs": "https://docs.google.com",
    "sheets": "https://sheets.google.com",
    "drive": "https://drive.google.com",
    "claude": "https://claude.ai",
    "gemini": "https://gemini.google.com",
    "amazon": "https://www.amazon.com",
    "wikipedia": "https://www.wikipedia.org",
}

APP_ALIAS_MAP: Dict[str, List[str]] = {
    "text editor": ["gnome-text-editor", "gedit", "code", "xed", "mousepad", "kate"],
    "notepad": ["gnome-text-editor", "gedit", "code", "xed", "mousepad", "kate"],
    "notepadqq": ["gnome-text-editor", "gedit", "code"],
    "gedit": ["gnome-text-editor", "code"],
    "editor": ["gnome-text-editor", "code"],
    "file explorer": ["nautilus", "nemo", "thunar", "dolphin"],
    "file manager": ["nautilus", "nemo", "thunar", "dolphin"],
    "files": ["nautilus", "nemo", "thunar"],
    "explorer": ["nautilus", "nemo", "thunar"],
    "browser": ["google-chrome", "google-chrome-stable", "firefox", "chromium", "brave"],
    "web browser": ["google-chrome", "google-chrome-stable", "firefox", "chromium"],
    "chrome": ["google-chrome", "google-chrome-stable", "chromium"],
    "terminal": ["ptyxis", "kitty", "alacritty", "gnome-terminal", "konsole", "xterm"],
    "console": ["ptyxis", "kitty", "alacritty", "gnome-terminal", "konsole", "xterm"],
    "calculator": ["gnome-calculator", "kcalc", "galculator"],
    "calc": ["gnome-calculator", "kcalc"],
    "system monitor": ["gnome-system-monitor", "htop", "btop"],
    "task manager": ["gnome-system-monitor", "htop", "btop"],
    "settings": ["gnome-control-center", "systemsettings"],
    "control panel": ["gnome-control-center", "systemsettings"],
    "vs code": ["code", "codium"],
    "vscode": ["code", "codium"],
    "camera": ["snapshot", "cheese"],
    "photos": ["loupe", "eog", "gthumb"],
    "image viewer": ["loupe", "eog", "gthumb"],
}

def get_gui_env() -> Dict[str, str]:
    """Returns environment variables necessary for spawning GUI apps from backend services."""
    env = os.environ.copy()
    env.setdefault("DISPLAY", ":0")
    env.setdefault("WAYLAND_DISPLAY", "wayland-0")
    if "XDG_RUNTIME_DIR" not in env:
        env["XDG_RUNTIME_DIR"] = f"/run/user/{os.getuid()}"
    return env

async def launch_application(app_name: str, args: Optional[str] = None) -> Dict[str, Any]:
    """
    Launches an application or URL with sub-millisecond dispatch.
    Handles URL shortcuts, alias fuzzy matching, .desktop files, and direct binaries.
    """
    app_name = (app_name or "").strip()
    if not app_name:
        return {"success": False, "error": "No application name provided."}

    gui_env = get_gui_env()
    app_lower = app_name.lower().strip()

    # 1. URL & Web Shortcut Check
    target_url = None
    if app_name.startswith(("http://", "https://", "file://")):
        target_url = app_name
    elif app_lower in WEB_SHORTCUTS:
        target_url = WEB_SHORTCUTS[app_lower]
    elif any(app_lower.endswith(ext) for ext in [".com", ".org", ".net", ".io", ".dev", ".ai", ".app", ".edu", ".gov", ".co"]):
        target_url = f"https://{app_lower}"

    if target_url:
        try:
            subprocess.Popen(
                ["xdg-open", target_url],
                env=gui_env,
                start_new_session=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                stdin=subprocess.DEVNULL
            )
            return {
                "success": True,
                "status": "launched",
                "app": "browser",
                "target": target_url,
                "message": f"Instantly opened {target_url}."
            }
        except Exception as ex:
            return {"success": False, "error": str(ex)}

    # 2. Binary Resolver via PATH and Aliases
    app_spaces = app_lower.replace("-", " ").replace("_", " ").strip()
    app_hyphens = app_lower.replace(" ", "-").replace("_", "-").strip()
    app_plain = app_lower.replace(" ", "").replace("-", "").replace("_", "").strip()

    candidates: List[str] = []
    for key in [app_lower, app_spaces, app_hyphens, app_plain]:
        for c in APP_ALIAS_MAP.get(key, []):
            if c not in candidates:
                candidates.append(c)
    for c in [app_name, app_lower, app_hyphens]:
        if c not in candidates:
            candidates.append(c)

    resolved_bin = None
    for cand in candidates:
        if shutil.which(cand):
            resolved_bin = cand
            break

    if resolved_bin:
        try:
            cmd_list = [resolved_bin]
            if args:
                cmd_list.extend(shlex.split(args))
            subprocess.Popen(
                cmd_list,
                env=gui_env,
                start_new_session=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                stdin=subprocess.DEVNULL
            )
            return {
                "success": True,
                "status": "launched",
                "app": resolved_bin,
                "message": f"Successfully launched {resolved_bin} on desktop."
            }
        except Exception as ex:
            return {"success": False, "error": f"Failed to launch {resolved_bin}: {str(ex)}"}

    # 3. Desktop Entry (gtk-launch) Fallback
    desktop_names = [app_name, app_lower, app_hyphens, f"org.gnome.{app_name.capitalize()}", f"org.gnome.{app_lower.capitalize()}"]
    for dname in desktop_names:
        try:
            res = subprocess.run(["gtk-launch", dname], env=gui_env, capture_output=True, timeout=1.0)
            if res.returncode == 0:
                return {
                    "success": True,
                    "status": "launched",
                    "app": dname,
                    "message": f"Successfully launched {dname} on desktop."
                }
        except Exception:
            pass

    return {
        "success": False,
        "error": f"Application '{app_name}' could not be found or launched.",
        "installed_alternatives": ["gnome-text-editor", "nautilus", "ptyxis", "google-chrome", "gnome-calculator", "code"]
    }

async def list_installed_applications(limit: int = 50) -> Dict[str, Any]:
    """Lists desktop application launchers (.desktop) installed on the system."""
    try:
        proc = subprocess.run(
            "ls /usr/share/applications/*.desktop /usr/local/share/applications/*.desktop ~/.local/share/applications/*.desktop 2>/dev/null | xargs -I {} basename {} .desktop | sort -u",
            shell=True, capture_output=True, text=True, timeout=3.0
        )
        apps = [line.strip() for line in proc.stdout.splitlines() if line.strip()][:limit]
        return {"success": True, "count": len(apps), "applications": apps}
    except Exception as ex:
        return {"success": False, "error": str(ex)}

async def open_folder(path_or_section: str = "home") -> Dict[str, Any]:
    """Opens a directory or section in GNOME Nautilus file manager with alias resolution."""
    raw = (path_or_section or "").strip().lower()
    home = os.path.expanduser("~")
    section_map = {
        "downloads": os.path.join(home, "Downloads"),
        "download": os.path.join(home, "Downloads"),
        "documents": os.path.join(home, "Documents"),
        "document": os.path.join(home, "Documents"),
        "pictures": os.path.join(home, "Pictures"),
        "photos": os.path.join(home, "Pictures"),
        "music": os.path.join(home, "Music"),
        "videos": os.path.join(home, "Videos"),
        "desktop": os.path.join(home, "Desktop"),
        "home": home,
        "root": "/"
    }
    target = section_map.get(raw)
    if not target:
        target = os.path.expanduser(path_or_section.strip())
    
    if not os.path.exists(target):
        target = home

    gui_env = get_gui_env()
    bin_cmd = "nautilus" if shutil.which("nautilus") else "xdg-open"
    try:
        subprocess.Popen(
            [bin_cmd, target],
            env=gui_env,
            start_new_session=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        return {
            "success": True,
            "status": "opened",
            "folder": target,
            "file_manager": bin_cmd,
            "message": f"Successfully opened {target} in {bin_cmd}."
        }
    except Exception as ex:
        return {"success": False, "error": f"Failed to open folder {target}: {str(ex)}"}

