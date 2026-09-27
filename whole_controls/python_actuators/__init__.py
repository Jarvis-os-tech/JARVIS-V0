"""
J.A.R.V.I.S. OS — Whole Controls Python Actuator Package
"""

from .unified_dispatcher import dispatch_tool, execute_cpp_worker
from .app_launcher import launch_application, list_installed_applications
from .app_closer import close_window, close_browser_tab, close_all_browser_tabs, manage_process
from .omarchy_skills import (
    execute_omarchy_command, switch_workspace, cycle_window, toggle_fullscreen,
    toggle_float, next_wallpaper, set_theme, get_current_theme, toggle_nightlight,
    toggle_status_bar, toggle_touchpad, toggle_stay_awake, restart_desktop_service,
    capture_screen, send_osd_banner
)
from .settings_and_hardware import (
    get_system_volume, set_system_volume, get_screen_brightness,
    set_display_brightness, set_power_profile, get_battery_status, heal_sound_server
)
from .desktop_automation import mouse_click, mouse_move, mouse_scroll, type_text, send_hotkey, take_screenshot
from .media_controller import control_media_playback, get_media_metadata
from .system_services import manage_systemd_service
from .power_session import execute_power_action
from .clipboard_manager import read_clipboard, write_clipboard
from .vision_controller import toggle_vision_mode, get_vision_state
from .shell_and_tasks import execute_linux_command, start_background_task, get_background_tasks

__all__ = [
    "dispatch_tool",
    "execute_cpp_worker",
    "launch_application",
    "list_installed_applications",
    "close_window",
    "close_browser_tab",
    "close_all_browser_tabs",
    "manage_process",
    "execute_omarchy_command",
    "switch_workspace",
    "cycle_window",
    "toggle_fullscreen",
    "toggle_float",
    "next_wallpaper",
    "set_theme",
    "get_current_theme",
    "toggle_nightlight",
    "toggle_status_bar",
    "toggle_touchpad",
    "toggle_stay_awake",
    "restart_desktop_service",
    "capture_screen",
    "send_osd_banner",
    "get_system_volume",
    "set_system_volume",
    "get_screen_brightness",
    "set_display_brightness",
    "set_power_profile",
    "get_battery_status",
    "heal_sound_server",
    "mouse_click",
    "mouse_move",
    "mouse_scroll",
    "type_text",
    "send_hotkey",
    "take_screenshot",
    "control_media_playback",
    "get_media_metadata",
    "manage_systemd_service",
    "execute_power_action",
    "read_clipboard",
    "write_clipboard",
    "toggle_vision_mode",
    "get_vision_state",
    "execute_linux_command",
    "start_background_task",
    "get_background_tasks"
]
