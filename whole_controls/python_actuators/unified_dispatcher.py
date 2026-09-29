"""
J.A.R.V.I.S. OS — Unified System Controls Dispatcher
Single async routing layer connecting Voice Agent tool calls to:
1. Native C++ workers (sub-5ms)
2. Python actuator modules
3. Non-blocking shell and background jobs
"""

import os
import json
import time
import asyncio
import pathlib
from typing import Dict, Any, Optional

if __package__ is None or __package__ == "":
    import sys
    _pkg_dir = pathlib.Path(__file__).resolve().parent
    if str(_pkg_dir) not in sys.path:
        sys.path.insert(0, str(_pkg_dir))
    import app_launcher
    import app_closer
    import omarchy_skills
    import settings_and_hardware
    import desktop_automation
    import media_controller
    import system_services
    import power_session
    import clipboard_manager
    import vision_controller
    import shell_and_tasks
else:
    from . import app_launcher
    from . import app_closer
    from . import omarchy_skills
    from . import settings_and_hardware
    from . import desktop_automation
    from . import media_controller
    from . import system_services
    from . import power_session
    from . import clipboard_manager
    from . import vision_controller
    from . import shell_and_tasks

import shutil

def _resolve_worker_binary(binary_name: str) -> Optional[pathlib.Path]:
    env_dir = os.environ.get("JARVIS_WORKERS_BIN")
    if env_dir:
        cand = pathlib.Path(env_dir) / binary_name
        if cand.exists():
            return cand
    local_cand = pathlib.Path(__file__).resolve().parent.parent / "native_workers" / "bin" / binary_name
    if local_cand.exists():
        return local_cand
    which = shutil.which(binary_name)
    if which:
        return pathlib.Path(which)
    return None

async def execute_cpp_worker(binary_name: str, args: Optional[list] = None, timeout: float = 5.0) -> Dict[str, Any]:
    """Invokes a native C++ worker binary and parses its JSON output."""
    bin_path = _resolve_worker_binary(binary_name)
    if not bin_path or not bin_path.exists():
        return {"success": False, "error": f"Binary {binary_name} not found"}

    cmd = [str(bin_path)]
    if args:
        cmd.extend(str(a) for a in args)

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        if proc.returncode == 0 and stdout:
            try:
                return json.loads(stdout.decode().strip())
            except json.JSONDecodeError:
                return {"success": True, "raw": stdout.decode().strip()}
        return {"success": False, "error": stderr.decode().strip() or f"Worker exited with code {proc.returncode}"}
    except asyncio.TimeoutError:
        return {"success": False, "error": f"Worker {binary_name} timed out after {timeout}s"}
    except Exception as ex:
        return {"success": False, "error": str(ex)}

async def dispatch_tool(tool_name: str, args: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Unified entrypoint for executing any system control tool.
    Designed for non-blocking execution inside the asyncio event loop.
    """
    tool = (tool_name or "").lower().strip()
    args = args or {}

    # 1. APPLICATION LAUNCHING & OPENING
    if tool in ["launch_application", "open_app", "open_application"]:
        app_name = args.get("app_name") or args.get("application") or args.get("target") or args.get("url") or ""
        app_args = args.get("args")
        return await app_launcher.launch_application(app_name, app_args)

    elif tool in ["list_installed_applications"]:
        return await app_launcher.list_installed_applications(int(args.get("limit", 50)))

    # 2. APPLICATION & WINDOW CLOSING
    elif tool in ["close_window", "close_app", "close_application"]:
        target = args.get("target") or args.get("app") or args.get("application")
        return await app_closer.close_window(target)

    elif tool in ["close_tab", "close_current_tab", "close_browser_tab"]:
        return await app_closer.close_browser_tab()

    elif tool in ["close_all_tabs", "close_browser"]:
        return await app_closer.close_all_browser_tabs()

    elif tool in ["manage_process", "kill_process"]:
        return await app_closer.manage_process(
            pid=args.get("pid"),
            process_name=args.get("processName") or args.get("process_name"),
            signal=args.get("signal", "SIGTERM")
        )

    # 3. OMARCHY & HYPRLAND SKILLS
    elif tool in ["omarchy_control", "omarchy_action", "omarchy"]:
        domain = args.get("domain", "hyprland")
        action = args.get("action", "active")
        target = args.get("target", "")
        return await omarchy_skills.execute_omarchy_command(domain, action, target)

    elif tool in ["switch_workspace"]:
        return await omarchy_skills.switch_workspace(args.get("workspace_id") or args.get("workspace", "1"))

    elif tool in ["next_wallpaper", "change_wallpaper"]:
        return await omarchy_skills.next_wallpaper()

    elif tool in ["set_theme"]:
        return await omarchy_skills.set_theme(args.get("theme", ""))

    elif tool in ["toggle_nightlight"]:
        return await omarchy_skills.toggle_nightlight()

    elif tool in ["toggle_bar", "toggle_status_bar"]:
        return await omarchy_skills.toggle_status_bar()

    elif tool in ["toggle_touchpad"]:
        return await omarchy_skills.toggle_touchpad()

    elif tool in ["toggle_stay_awake"]:
        return await omarchy_skills.toggle_stay_awake()

    # 4. SETTINGS & HARDWARE TOGGLING
    elif tool in ["get_system_volume"]:
        return await settings_and_hardware.get_system_volume()

    elif tool in ["set_system_volume", "volume_control"]:
        return await settings_and_hardware.set_system_volume(
            volume=args.get("volume") or args.get("percent") or args.get("level"),
            relative=args.get("relative"),
            mute=args.get("mute"),
            toggle_mute=args.get("toggleMute", False)
        )

    elif tool in ["get_screen_brightness", "get_display_brightness"]:
        return await settings_and_hardware.get_screen_brightness()

    elif tool in ["set_display_brightness", "set_screen_brightness"]:
        return await settings_and_hardware.set_display_brightness(
            int(args.get("brightness") or args.get("percent") or 80)
        )

    elif tool in ["set_power_profile"]:
        return await settings_and_hardware.set_power_profile(args.get("profile", "balanced"))

    elif tool in ["get_battery_status"]:
        return await settings_and_hardware.get_battery_status()

    elif tool in ["heal_sound_server", "restart_audio"]:
        return await settings_and_hardware.heal_sound_server()

    # 5. UNIFIED SYSTEM CONTROL ROUTER
    elif tool in ["control_system"]:
        act = str(args.get("action", "")).lower().strip()
        val = str(args.get("value", "")).strip()
        if act == "volume":
            import re
            digits = re.findall(r"\d+", val)
            num = int(digits[0]) if digits else 50
            return await settings_and_hardware.set_system_volume(volume=num)
        elif act == "brightness":
            import re
            digits = re.findall(r"\d+", val)
            num = int(digits[0]) if digits else 80
            return await settings_and_hardware.set_display_brightness(num)
        elif act == "power_profile":
            return await settings_and_hardware.set_power_profile(val)
        elif act in ["power", "power_action"]:
            return await power_session.execute_power_action(val)
        elif act in ["media", "playback"]:
            return await media_controller.control_media_playback(val)
        else:
            return {"success": False, "error": f"Unknown control_system action: {act}"}

    # 6. MEDIA PLAYBACK
    elif tool in ["control_media_playback", "media_playback"]:
        return await media_controller.control_media_playback(args.get("action", "toggle"))

    elif tool in ["get_media_metadata"]:
        return await media_controller.get_media_metadata()

    # 7. DESKTOP & INPUT AUTOMATION
    elif tool in ["desktop_control"]:
        action = args.get("action", "click")
        if action == "click":
            return await desktop_automation.mouse_click(
                int(args.get("x", -1)), int(args.get("y", -1)),
                args.get("button", "left"), int(args.get("count", 1))
            )
        elif action == "move":
            return await desktop_automation.mouse_move(int(args.get("x", 0)), int(args.get("y", 0)))
        elif action == "scroll":
            return await desktop_automation.mouse_scroll(int(args.get("dx", 0)), int(args.get("dy", -1)))
        elif action == "type_text":
            return await desktop_automation.type_text(str(args.get("text", "")))
        elif action == "hotkey":
            return await desktop_automation.send_hotkey(str(args.get("combo", "")))
        elif action in ["delete_text", "clear_text", "backspace"]:
            mode = args.get("mode") or ("all" if action == "clear_text" else "backspace")
            return await desktop_automation.delete_text(int(args.get("count", 1)), str(mode))
        elif action == "screenshot":
            return await desktop_automation.take_screenshot(args.get("path"))
        return {"success": False, "error": f"Unknown desktop action: {action}"}

    elif tool in ["delete_text", "clear_text", "erase_text", "backspace"]:
        mode = args.get("mode") or ("all" if tool == "clear_text" else "backspace")
        return await desktop_automation.delete_text(int(args.get("count", 1)), str(mode))

    elif tool in ["take_screenshot"]:
        return await desktop_automation.take_screenshot(args.get("outputPath") or args.get("path"))

    # 8. CLIPBOARD CONTROL
    elif tool in ["clipboard_control"]:
        act = args.get("action", "read")
        if act == "write":
            return await clipboard_manager.write_clipboard(str(args.get("text", "")))
        return await clipboard_manager.read_clipboard()

    # 9. SYSTEM SERVICES
    elif tool in ["manage_systemd_service", "manage_service"]:
        return await system_services.manage_systemd_service(
            action=args.get("action", "status"),
            unit=args.get("unit")
        )

    # 10. SYSTEM POWER & SESSION
    elif tool in ["system_power_action", "power_action"]:
        return await power_session.execute_power_action(args.get("action", "lock"))

    # 11. MULTIMODAL VISION CONTROLS
    elif tool in ["control_vision_mode", "toggle_vision"]:
        return await vision_controller.toggle_vision_mode(
            mode=args.get("mode", "off"),
            action=args.get("action", "start")
        )

    elif tool in ["get_vision_state", "vision_state"]:
        return await vision_controller.get_vision_state()

    # 12. SHELL & BACKGROUND TASKS
    elif tool in ["execute_linux_command", "bash", "shell"]:
        timeout = float(args.get("timeout", 10.0))
        return await shell_and_tasks.execute_linux_command(args.get("command", ""), timeout=timeout)

    elif tool in ["start_background_task", "run_background_task"]:
        return await shell_and_tasks.start_background_task(
            command=args.get("command", ""),
            task_name=args.get("task_name", "Background Task")
        )

    elif tool in ["get_background_tasks"]:
        return await shell_and_tasks.get_background_tasks()

    # 13. HARDWARE TELEMETRY & DIAGNOSTICS (Native C++)
    elif tool in ["get_system_telemetry", "sys_telemetry"]:
        return await execute_cpp_worker("sys_telemetry")

    elif tool in ["get_pc_spec"]:
        return await execute_cpp_worker("pc_spec")

    elif tool in ["get_thermal_sensors"]:
        return await execute_cpp_worker("thermal_scan")

    elif tool in ["get_storage_usage"]:
        return await execute_cpp_worker("storage_scan")

    elif tool in ["get_wifi_status", "wifi_scan"]:
        return await execute_cpp_worker("wifi_scan")

    elif tool in ["run_full_system_diagnostics", "preflight_check"]:
        t_res, p_res, m_res, h_res = await asyncio.gather(
            execute_cpp_worker("sys_telemetry"),
            execute_cpp_worker("pc_spec"),
            execute_cpp_worker("memory_tester"),
            execute_cpp_worker("hardware_ctrl", ["get_volume"])
        )
        return {
            "success": True,
            "overall_status": "nominal",
            "telemetry": t_res,
            "specs": p_res,
            "memory": m_res,
            "hardware": h_res
        }

    return {"success": False, "error": f"Tool '{tool_name}' not recognized in whole_controls dispatcher."}

if __name__ == "__main__":
    import sys
    # Supports: python3 unified_dispatcher.py <tool_name> [json_args_or_string]
    tool_arg = sys.argv[1] if len(sys.argv) > 1 else ""
    raw_args = sys.argv[2] if len(sys.argv) > 2 else "{}"
    try:
        if raw_args.strip().startswith("{") or raw_args.strip().startswith("["):
            parsed = json.loads(raw_args)
            if isinstance(parsed, list):
                parsed = {"items": parsed}
        else:
            parsed = {"target": raw_args.strip()} if raw_args.strip() else {}
    except Exception:
        parsed = {"target": raw_args.strip()}

    try:
        out = asyncio.run(dispatch_tool(tool_arg, parsed))
        print(json.dumps(out))
    except Exception as ex:
        print(json.dumps({"success": False, "error": str(ex)}))
