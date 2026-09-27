# 🎙️ J.A.R.V.I.S. OS — System Controls Vault & Voice Agent Parallel Integration Guide

> **Target Environment**: Arch Linux x86_64 | Omarchy 4.0.3 | Hyprland (Wayland) | PipeWire 1.6.8  
> **Primary Core Language**: Python 3.12+ (`whole_controls/python_actuators/`)  
> **Native Actuators**: C++17 (`whole_controls/native_workers/`)  
> **Voice Protocol**: Gemini Live Bidirectional WebSocket (`models/gemini-3.1-flash-live-preview`)  

---

## 🏛️ 1. Executive Overview & Directory Architecture

The `whole_controls/` directory (also accessible via the symlink `whole controls/`) is a unified, self-contained vault housing copies of **every native C++ worker, Python actuator, and Omarchy skill** required to control the entire operating system.

It bridges low-level kernel interfaces (`/proc`, `/sys`), Wayland/Hyprland Unix domain sockets, MPRIS media controllers, and systemd units directly to the **Gemini Live Full-Duplex Voice Agent**, allowing the agent to listen, speak, and act **simultaneously in parallel** without blocking live audio streams.

### Directory Structure

```
whole_controls/
├── native_workers/                     # 18 Native C++17 Sub-5ms Actuators
│   ├── Makefile                        # Standalone build automation (make -j4)
│   ├── bin/                            # Compiled high-performance binaries
│   ├── omarchy_ctrl.cpp                # Omarchy OS & Hyprland direct socket IPC skills
│   ├── desktop_control.cpp             # Full desktop automation (mouse, keyboard, windows, hotkeys)
│   ├── open_app.cpp                    # Sub-millisecond direct app & URL launcher
│   ├── hardware_ctrl.cpp               # Volume, brightness, battery, power profiles, sound healing
│   ├── media_ctrl.cpp                  # MPRIS playerctl media playback control
│   ├── process_ctrl.cpp                # Process listing, killing, and termination
│   ├── service_ctrl.cpp                # Systemd service management (system & user units)
│   ├── vision_ctrl.cpp                 # Camera & screen capture worker
│   ├── sys_telemetry.cpp               # CPU, memory, uptime, load scanner
│   ├── pc_spec.cpp                     # Full hardware specifications detector
│   ├── thermal_scan.cpp                # Thermal sensors monitor
│   ├── storage_scan.cpp                # Storage, partitions, disk usage scanner
│   ├── wifi_scan.cpp                   # WiFi SSID & signal scanner
│   ├── net_inspector.cpp               # Network interfaces & IP routing inspector
│   ├── firewall_audit.cpp              # Firewall status and rule audit
│   ├── memory_tester.cpp               # RAM & swap diagnostic tester
│   ├── jarvis_sysctl.cpp               # Kernel sysctl parameter reader & tuner
│   └── file_search.cpp                 # High-speed native file search worker
│
├── python_actuators/                   # Modular Python 3.12+ Async Control Engines
│   ├── __init__.py                     # Package export of all actuators
│   ├── app_launcher.py                 # App launcher, web shortcuts, .desktop resolver
│   ├── app_closer.py                   # Window closer, process killer, tab terminator
│   ├── omarchy_skills.py               # Omarchy OS skills (Hyprland, themes, toggles, OSD)
│   ├── settings_and_hardware.py        # Volume, brightness, power profiles, sound server
│   ├── desktop_automation.py           # Mouse, keyboard, hotkeys, screenshot automation
│   ├── media_controller.py             # MPRIS D-Bus & playerctl media controls
│   ├── system_services.py              # Systemd system & user service manager
│   ├── power_session.py                # Lock, suspend, reboot, poweroff handlers
│   ├── clipboard_manager.py            # Wayland (wl-copy/paste) & X11 (xclip/xsel)
│   ├── vision_controller.py            # Screen share, camera feed, vision state manager
│   ├── shell_and_tasks.py              # Async non-blocking shell & background task runner
│   └── unified_dispatcher.py           # Master async tool router combining all controls
│
├── voice_agent_bridge/                 # Voice Agent Integration & Tool Schemas
│   ├── tool_declarations.json          # Complete Gemini Live tool schemas (OpenAPI format)
│   └── voice_agent_parallel_harness.py # Standalone executable parallel test harness
│
└── GUIDE_VOICE_AGENT_PARALLEL_INTEGRATION.md  # This Master Document
```

---

## ⚡ 2. Complete Inventory of System Controls & Skills

### A. Omarchy Agentic OS Skills (`omarchy_ctrl.cpp` & `omarchy_skills.py`)

The Omarchy skills grant J.A.R.V.I.S. direct OS-level superpowers over Arch Linux running Hyprland:

| Skill Domain | Command / Action | Description | Speed |
| :--- | :--- | :--- | :--- |
| **`hyprland`** | `workspace <1-10>` | Switches the active Hyprland workspace via direct Unix socket IPC. | < 5ms |
| **`hyprland`** | `close_window` | Closes active focused window via Hyprland socket dispatch. | < 5ms |
| **`hyprland`** | `fullscreen` | Toggles active window fullscreen. | < 5ms |
| **`hyprland`** | `float` | Toggles active window floating vs tiled. | < 5ms |
| **`hyprland`** | `cyclenext` / `cycleprev` | Cycles window focus across the active layout. | < 5ms |
| **`hyprland`** | `active` | Queries JSON geometry, PID, and class of the focused window. | < 10ms |
| **`theme`** | `next_bg` | Cycles wallpaper to next theme image dynamically. | < 25ms |
| **`theme`** | `set <theme>` | Applies an Omarchy visual theme (Nord, Tokyo Night, Ethereal, etc.). | < 30ms |
| **`theme`** | `current` | Queries the currently active desktop theme. | < 15ms |
| **`toggle`** | `nightlight` | Toggles display blue-light filter. | < 20ms |
| **`toggle`** | `bar` | Toggles top status bar (Waybar) visibility. | < 20ms |
| **`toggle`** | `touchpad` | Toggles laptop touchpad input enabled/disabled. | < 20ms |
| **`toggle`** | `stay_awake` | Inhibits idle lock / screen sleep. | < 20ms |
| **`restart`** | `<service>` | Restarts desktop subsystem (e.g. `audio`, `wifi`, `bluetooth`, `shell`). | < 100ms |
| **`capture`** | `smart` / `fullscreen` | Takes smart selected or fullscreen desktop captures. | < 60ms |
| **`osd`** | `<message> [icon]` | Displays a native On-Screen Display banner over the monitors. | < 30ms |
| **`raw`** | `<args...>` | Runs raw arbitrary Omarchy shell operations. | Variable |

### B. Application Launcher & Closer (`app_launcher.py` & `app_closer.py`)

- **Sub-Millisecond Launching**: Pre-forks with `setsid()` and `/dev/null` redirection to ensure child apps never inherit or block backend pipes.
- **Smart Web Shortcuts**: Recognizing "youtube", "github", "gmail", "reddit", "twitter/x", "chatgpt", "claude", "spotify", "notion" opens the target web application instantly in the browser without search delays.
- **Desktop Resolver**: Matches common names ("editor", "terminal", "calc", "files", "browser") against installed desktop entries (`.desktop`) and PATH binaries.
- **Smart Window Closer**: Distinguishes between browser tabs and desktop applications. Saying *"close youtube"* or *"close tab"* automatically sends `Ctrl+W` via Wayland/X11 keyboard synthesis without killing the browser process. Saying *"close all browser tabs"* terminates browser window instances.

### C. Settings & Hardware Toggling (`settings_and_hardware.py`)

- **Volume Control**: Supports absolute volume (`0-150%`), relative changes (`+5%`, `-10%`), and mute toggles via WirePlumber `wpctl` and native ALSA/PipeWire ioctl calls.
- **Brightness Control**: Reads and adjusts display backlight via `/sys/class/backlight` and `brightnessctl`.
- **Power Management**: Switches power profiles (`performance`, `balanced`, `power-saver`) via `powerprofilesctl`.
- **Audio Self-Healing**: Automatically diagnoses PipeWire/WirePlumber loop stalls and restores unmuted playback within 1 second.

### D. Desktop Automation & Computer Use (`desktop_control.cpp`)

- **Mouse Input**: Click, move, double click, scroll wheel.
- **Keyboard Synthesis**: High-speed text typing and modifier key combinations (`Ctrl+C`, `Ctrl+V`, `Alt+F4`, `Ctrl+Alt+T`, `Super`).
- **Screen Capture**: Takes screenshots via `desktop_control`, `grim`, or `scrot`.

---

## ⚡ 3. The Parallel & Simultaneous Execution Blueprint

### The Golden Invariant: Never Block the Voice Loop

Gemini Live operates a **bidirectional, full-duplex WebSocket session** (`wss://generativelanguage.googleapis.com/...`). 
In this protocol:
1. The client continuously uploads **16kHz 16-bit mono raw PCM audio** (every 100ms).
2. The server continuously streams back **24kHz 16-bit mono raw PCM audio** chunks alongside transcriptions and tool calls.
3. If an agent executes a tool call using synchronous blocking code (`time.sleep()`, blocking `subprocess.run()`, or waiting for long jobs):
   - The Python asyncio event loop freezes.
   - Outbound audio frames are delayed, starving the microphone queue.
   - Inbound audio frames stutter, causing PipeWire buffer underruns.
   - The Gemini WebSocket drops due to ping timeout.

### How Parallel Execution Actually Works

```
                        User Voice Prompt
                                │
                                ▼
         ┌──────────────────────────────────────────────┐
         │       Gemini Live WebSocket Session          │
         │   (16kHz Mic Stream ── 24kHz Speaker Stream) │
         └──────────────────────┬───────────────────────┘
                                │
                 Simultaneous Tool Call Turn
            {"functionCalls": [Call1, Call2, Call3]}
                                │
                                ▼
         ┌──────────────────────────────────────────────┐
         │             asyncio.gather(...)              │
         ├──────────────────────┬───────────────────────┤
         │                      │                       │
         ▼                      ▼                       ▼
  [Tool 1: Volume]      [Tool 2: Workspace]    [Tool 3: Diagnostics]
     (Native C++)          (Hyprland IPC)         (Multi-Check Async)
     Runs in 8ms            Runs in 4ms             Runs in 45ms
         │                      │                       │
         └──────────────────────┼───────────────────────┘
                                │
                                ▼
                   All Tools Resolved in ~45ms
              (Wall-clock time = MAX, not SUM!)
                                │
                                ▼
         ┌──────────────────────────────────────────────┐
         │        Return toolResponse to Gemini         │
         │  Gemini speaks natural confirmation in voice │
         │   while continuous audio streaming continues │
         └──────────────────────────────────────────────┘
```

### The Dual-Tier Fast-Handoff Pattern

Every system control in J.A.R.V.I.S. is categorized into one of two operational tiers:

```
                  Tool Call Dispatched
                           │
                           ▼
             Is execution time <= 120ms?
                    /              \
                 YES                NO
                 /                    \
                ▼                      ▼
        [TIER 1: FAST PATH]     [TIER 2: BACKGROUND HANDOFF]
     C++ workers execute in     Return immediate verbal instruction:
     2ms - 45ms. Ground truth   "Executing in the background, Sir."
     returned immediately to    Tool continues in asyncio.create_task().
     Gemini to speak right away.
                                       │
                                       ▼
                             Task Finishes Later
                                       │
                                       ▼
                             [Cadence Queue]
                             Waits for user & agent silence (> 1.2s)
                             Injects spoken update opportunistically!
```

#### Tier 1: Fast-Path Actuators (< 120ms)
- `omarchy_control` (4–25ms)
- `set_system_volume` (8–50ms)
- `set_display_brightness` (10–30ms)
- `control_media_playback` (5–20ms)
- `launch_application` (< 2ms dispatch)
- `close_window` (15–40ms)
- `get_system_telemetry` (15–45ms)

Because these execute in less than 120ms, `asyncio.wait_for(task, timeout=0.120)` resolves before speech synthesis begins. Gemini receives the real output and immediately speaks the result:
> *"Sir, master volume adjusted to 50% and switched to workspace 2."*

#### Tier 2: Background Task Handoff (> 120ms)
- Long shell scripts (`execute_linux_command`)
- System diagnostics sweeps (`run_full_system_diagnostics`)
- Package updates / service rebuilds
- Deep AI subagent delegation (`delegate_to_ultron`, `delegate_to_hermes`)

If a command exceeds 120ms, it is immediately transitioned to a background task using `asyncio.create_task()`. The tool call instantly returns a verbal directive to Gemini:
```json
{
  "status": "in_progress",
  "verbal_directive": "Inform operator Gopi you are on it in 1 concise sentence, and keep listening."
}
```
Gemini speaks: *"Working on that in the background, Sir."*  
The microphone stays hot, the user can continue talking, and when the background task finishes, the **Dual-Brain Conversational Cadence Queue** injects the completion notification into the next natural conversational pause (silence > 1.2s), preventing awkward interruptions!

---

## 🛠️ 4. How to Connect Any Control to the Voice Agent

Connecting any system control function to the Voice Agent requires exactly three simple steps:

### Step 1: Add Tool Declaration Schema (`tool_declarations.json`)

Define the OpenAPI parameter schema that Gemini Live reads during the connection handshake:

```json
{
  "name": "omarchy_control",
  "description": "Sub-millisecond native Omarchy OS & Hyprland desktop controller.",
  "parameters": {
    "type": "OBJECT",
    "properties": {
      "domain": {
        "type": "STRING",
        "enum": ["hyprland", "theme", "toggle", "restart", "capture", "launch", "system", "osd", "raw"]
      },
      "action": { "type": "STRING" },
      "target": { "type": "STRING" }
    },
    "required": ["domain", "action"]
  }
}
```

### Step 2: Route in the Async Dispatcher (`unified_dispatcher.py`)

Add the handler branch inside `dispatch_tool()`:

```python
elif tool in ["omarchy_control", "omarchy_action", "omarchy"]:
    domain = args.get("domain", "hyprland")
    action = args.get("action", "active")
    target = args.get("target", "")
    return await omarchy_skills.execute_omarchy_command(domain, action, target)
```

### Step 3: Concurrently Execute in the Voice Client (`gemini_live.py`)

In the WebSocket message receiver, dispatch multiple tool calls in parallel with `asyncio.gather`:

```python
# Extract all function calls from the Gemini Live turn
function_calls = tool_call.get("functionCalls", [])

# Execute all calls simultaneously in parallel
responses = await asyncio.gather(*[
    self._execute_single_tool(call["id"], call["name"], call.get("args", {}))
    for call in function_calls
])

# Send tool response frame back to Gemini
await self.ws.send(json.dumps({
    "toolResponse": {
        "functionResponses": list(responses)
    }
}))
```

---

## 💡 5. Real-World Parallel Execution Scenarios

### Scenario 1: Multi-Action Single Voice Command
**User**: *"Jarvis, turn volume down to 30%, switch to workspace 2, and turn on the nightlight."*

1. **Gemini Live** parses the audio and returns 3 tool calls in a single turn:
   ```json
   {
     "toolCall": {
       "functionCalls": [
         {"id": "call_1", "name": "set_system_volume", "args": {"volume": 30}},
         {"id": "call_2", "name": "omarchy_control", "args": {"domain": "hyprland", "action": "workspace", "target": "2"}},
         {"id": "call_3", "name": "omarchy_control", "args": {"domain": "toggle", "action": "nightlight"}}
       ]
     }
   }
   ```
2. **`asyncio.gather`** fires all 3 coroutines simultaneously:
   - Call 1 sets volume via WirePlumber (takes 18ms).
   - Call 2 sends socket command to Hyprland (takes 4ms).
   - Call 3 toggles blue-light filter (takes 15ms).
3. **Total Turn Latency**: **18ms** (determined by Call 1, not 18 + 4 + 15 = 37ms).
4. **Voice Feedback**: Gemini receives responses in 18ms and speaks:
   > *"Volume set to 30%, workspace 2 focused, and nightlight enabled, Sir."*

---

### Scenario 2: Instant Action + Long Background Task
**User**: *"Jarvis, mute the audio and run a full hardware preflight check."*

1. **Gemini Live** returns 2 function calls:
   - `set_system_volume` with `{"mute": true}`
   - `run_full_system_diagnostics` with `{}`
2. **Execution**:
   - `set_system_volume` executes in 9ms.
   - `run_full_system_diagnostics` exceeds 120ms; it immediately transfers to an asynchronous background task (`asyncio.create_task`).
3. **Immediate Verbal Confirmation** (within 121ms):
   > *"Audio muted, Sir. Initiating full preflight diagnostic sweep in the background."*
4. **Parallel Streaming**: Audio stream is 100% active. Operator asks: *"What is the weather today?"* Jarvis responds immediately.
5. **Cadence Notification**: When diagnostics finish 2.5 seconds later, the Cadence Queue waits for a 1.2s pause in speech, then injects:
   > *"Sir, preflight diagnostics complete. All 17 hardware and memory checks are nominal."*

---

## 🧪 6. Verification & Benchmarking Instructions

### Step 1: Recompile Native C++ Workers
```bash
make -C whole_controls/native_workers -j4
```
*Expected: 18 binaries built in `whole_controls/native_workers/bin/` with exit code 0.*

### Step 2: Validate Python Syntax
```bash
.venv/bin/python -m py_compile whole_controls/python_actuators/*.py
```
*Expected: Clean exit code 0.*

### Step 3: Run Concurrency & Benchmark Test
```bash
.venv/bin/python whole_controls/voice_agent_bridge/voice_agent_parallel_harness.py --test-concurrency
```
*Expected Output:*
```
🚀 [PARALLEL TURN START] Received 4 simultaneous tool calls from Gemini Live:
   1. set_system_volume({'volume': 50})
   2. omarchy_control({'domain': 'hyprland', 'action': 'workspace', 'target': '2'})
   3. omarchy_control({'domain': 'theme', 'action': 'current'})
   4. get_system_telemetry({})
✨ [PARALLEL TURN COMPLETE] All 4 calls resolved in ~85ms total.
Parallel Efficiency Ratio: ~1.9x speedup over sequential execution.
✅ Concurrency verification passed! Audio streaming loop remained completely active.
```

### Step 4: Run Interactive Dual-Tier Live Demo
```bash
.venv/bin/python whole_controls/voice_agent_bridge/voice_agent_parallel_harness.py --live-demo
```
*Demonstrates fast local execution, seamless background handoff, and cadence speech injection.*

---

## 🎯 7. Conclusion & Summary of Invariants

1. **Python Core + C++ Native Hierarchy**: Python 3.12+ coordinates reasoning, WebSocket frames, and routing; single-file C++17 binaries execute local hardware/window queries in sub-5ms.
2. **Zero Audio Lag**: Never execute blocking calls on the asyncio event loop.
3. **Simultaneous Concurrency**: Always use `asyncio.gather` for multi-tool turns.
4. **Conversational Courtesy**: Use the Cadence Queue to ensure Jarvis never interrupts the operator with background task completion announcements.
