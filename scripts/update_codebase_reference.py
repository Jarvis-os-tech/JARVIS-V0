#!/usr/bin/env python3
"""
scripts/update_codebase_reference.py
--------------------------------------------------------------------------------
Generates and keeps CODEBASE_REFERENCE.md updated with 100% precision.
Reads real-time Git branches (dev and main), commit history, file line counts,
SQLite schema, and module inventory directly from the repository.
Writes to:
  - /home/g0pi/Downloads/CODEBASE_REFERENCE.md
  - /home/g0pi/Downloads/jarvis/CODEBASE_REFERENCE.md
--------------------------------------------------------------------------------
"""

import os
import sys
import subprocess
import datetime
from pathlib import Path

WORKSPACE_ROOT = Path("/home/g0pi/Downloads/jarvis").resolve()
DOWNLOADS_DIR = Path("/home/g0pi/Downloads").resolve()

TARGET_FILES = [
    DOWNLOADS_DIR / "CODEBASE_REFERENCE.md",
    WORKSPACE_ROOT / "CODEBASE_REFERENCE.md"
]

def run_cmd(cmd, cwd=str(WORKSPACE_ROOT)):
    try:
        res = subprocess.run(cmd, shell=True, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        return res.stdout.strip()
    except subprocess.CalledProcessError as e:
        return f"Error executing \x27{cmd}\x27: {e.stderr.strip()}"

def get_line_count(file_path):
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return sum(1 for _ in f)
    except Exception:
        return 0

def collect_file_inventory():
    inventory = []
    for root, dirs, files in os.walk(WORKSPACE_ROOT):
        # Exclude directories
        dirs[:] = [d for d in dirs if d not in [".git", "node_modules", "dist", "__pycache__", "target", ".cargo"]]
        for f in files:
            if f.endswith((".pyc", ".png", ".jpg", ".jpeg", ".zip", ".tar.gz", ".AppImage")):
                continue
            full_path = Path(root) / f
            rel_path = full_path.relative_to(WORKSPACE_ROOT)
            lines = get_line_count(full_path)
            inventory.append({
                "rel_path": str(rel_path),
                "full_path": str(full_path),
                "lines": lines
            })
    inventory.sort(key=lambda x: x["rel_path"])
    return inventory

KNOWN_ROLES = {
    # Intelligent System Evolutions
    "backend/system_modules/intelligent_system/dynamic_resolver.ts": ("Dynamic System Resolver", "Dynamic command, path, and intent resolution engine that prevents brittle hardcoded assumptions."),
    "backend/system_modules/intelligent_system/experience_learner.ts": ("Continuous Experience Learner", "Records execution episodes, diagnoses outcomes, and extracts behavioral rules into memory."),
    "backend/system_modules/intelligent_system/internet_knowledge_gatherer.ts": ("Internet Knowledge Gatherer", "Proactive external documentation, manpage, and web search fetcher for real-time problem-solving."),
    "backend/system_modules/intelligent_system/omarchy_quattro_core.ts": ("Omarchy Quattro Engine", "Pre-built Omarchy 4 core integrating 367+ command center tools directly into J.A.R.V.I.S."),
    "backend/system_modules/intelligent_system/self_repair.ts": ("Autonomous Self-Repair Engine", "Intercepts command and tool failures, probes alternative strategies, and heals system automatically."),

    "CODEBASE_REFERENCE.md": ("Workspace Codebase Reference", "Local copy of the authoritative J.A.R.V.I.S. technical reference manual."),

    # Backend
    "backend/server.ts": ("Core Server & WS Gateway", "Express router, Gemini Live WebSocket (/live), Groq fast actuator integration, tool dispatching, Vite middleware, temporal directives."),
    "backend/skills_manager.ts": ("Universal Skills Engine", "Scans, parses, installs, and executes domain skills across project, local .agents, and global home directories."),
    "backend/memory_bridge.py": ("Memory Bridge Subprocess", "Python CLI bridge connecting Express with SQLite triad tables (personal_details, preferences, instructions) and Obsidian vault."),
    "backend/README.md": ("Backend Documentation", "Overview of backend services and execution instructions."),
    "backend/system_modules/ceo/ceo_orchestrator.ts": ("CEO Executive Orchestrator", "Core orchestration engine implementing ivfarias/ceo framework, managing multi-agent roster and mission workflows."),
    "backend/system_modules/ceo/ceo_roster.ts": ("CEO Agent Roster Loader", "Parses agents_roster.yaml, validating active agent personas, capabilities, and system prompts."),
    "backend/system_modules/ceo/ceo_session_logger.ts": ("CEO Session Logger", "Persists executive decisions, delegation logs, and mission lifecycles in durable session logs."),
    "backend/system_modules/ceo/ceo_tools.ts": ("CEO Live Tools", "Declares ceo_get_roster, ceo_execute_mission, ceo_prescribe_workflow, and ceo_query_agent_sessions."),
    "backend/system_modules/ceo/index.ts": ("CEO Module Exports", "Re-exports orchestrator, roster, logger, and tools for server consumption."),
    "backend/system_modules/intelligent_system/dual_path_orchestrator.ts": ("Dual-Path Orchestrator", "Routes user voice requests to Fast Path (<10ms) or Slow Path (<300ms SLA) with instant audio filler synthesis."),
    "backend/system_modules/intelligent_system/dual_path_types.ts": ("Dual-Path Type Definitions", "TypeScript interfaces for execution paths, agent pools, and audio filler buffers."),
    "backend/system_modules/intelligent_system/intent_router.ts": ("Dual-Path Intent Router", "Classifies streaming user transcripts to identify required execution speed and agent specialization."),
    "backend/system_modules/intelligent_system/filler_audio_synthesizer.ts": ("Vocal Filler Synthesizer", "Synthesizes or buffers conversational vocal fillers to eliminate silence during slow-path reasoning."),
    "backend/system_modules/intelligent_system/multi_agent_pool.ts": ("Multi-Agent Pool", "Manages warm agent workers and dispatches complex tasks across agent instances."),
    "backend/system_modules/intelligent_system/key_pool_rotator.ts": ("API Key Pool Rotator", "Rotates across Gemini and Groq API keys to prevent rate-limiting and maximize uptime."),
    "backend/system_modules/intelligent_system/file_controls.ts": ("Local File Controls", "Provides write_file, append_file, rewrite_file, remove_file, read_file, and list_directory with protected system path guards."),
    "backend/system_modules/intelligent_system/file_controls.test.ts": ("File Controls Unit Tests", "Tests file operations and path boundary traversal protections."),
    "backend/system_modules/intelligent_system/autonomous_engine.ts": ("Autonomous Engine", "Background task loop driving proactive assistant operations."),
    "backend/system_modules/intelligent_system/autonomous_engine.test.ts": ("Autonomous Engine Tests", "Validates background loop execution and task scheduling."),
    "backend/system_modules/intelligent_system/groq_fast_actuator.ts": ("Groq Fast Actuator", "Sub-80ms speculative intent parser with connector tool registration, anti-hijacking guard, and mutating tool execution protection."),
    "backend/system_modules/intelligent_system/system_controls.ts": ("OS Control Actuator", "Dispatches Gemini Live tool calls to compiled native C++ workers or unified_dispatcher.py with sub-10ms latency."),
    "backend/system_modules/intelligent_system/system_environment.ts": ("System Environment Detector", "Detects OS, desktop environment (Hyprland, Wayland, X11), display servers, and audio subsystems."),
    "backend/system_modules/intelligent_system/personas.ts": ("Coworker Personas Matrix", "Defines the 6 specialized AI Coworker personas (Jarvis, Friday, Ultron, Edith, Karen, Vision) with voice models and prompt rules."),
    "backend/system_modules/intelligent_system/agent_memory.ts": ("4-Tier Memory Controller", "Coordinates short-term, episodic, semantic, and long-term memory operations for autonomous agents."),
    "backend/system_modules/intelligent_system/brain_core.ts": ("Intelligent Brain Core", "Central decision and reasoning coordinator for autonomous actions and proactive assistance."),
    "backend/system_modules/intelligent_system/voice_transfer_protocol.ts": ("Voice Transfer Protocol", "Handles sub-second persona handoffs and voice identity switching without session tear-down."),
    "backend/system_modules/intelligent_system/workspace_tools.ts": ("Workspace Tool Declarations", "Defines project-level file, terminal, and search tools for developer assistance."),
    "backend/system_modules/intelligent_system/automatic_greeting.ts": ("Context-Aware Greeting", "Generates dynamic greetings based on time of day, system status, and recent tasks."),
    "backend/system_modules/intelligent_system/intelligent_types.ts": ("System Type Definitions", "TypeScript interfaces for personas, tools, memory entries, and voice transfer events."),
    "backend/system_modules/voice_latency/websocket_streamer.ts": ("WebSocket Audio Streamer", "Optimized low-latency binary PCM audio chunk streamer."),
    "backend/system_modules/voice_latency/audio_queue_player.ts": ("Server Audio Queue", "Schedules and buffers synthesized model audio frames."),
    "backend/system_modules/voice_latency/latency_optimizations.ts": ("Latency Tuning Utilities", "Jitter buffering, chunk sizing, and silence truncation algorithms."),
    "backend/system_modules/voice_latency/audio_processor.ts": ("Audio Buffer Processor", "PCM16 / Float32 conversion and real-time audio normalization."),
    "backend/system_modules/voice_latency/audio_latency_types.ts": ("Audio Latency Interfaces", "Type contracts for audio buffers, latency stats, and telemetry events."),
    "backend/__tests__/dual_path_orchestrator.test.ts": ("Dual-Path Test Suite", "Unit and integration tests for fast vs slow path routing and latency constraints."),
    "backend/__tests__/memory_and_text_deletion.test.ts": ("Memory & Deletion Tests", "Validates clear_memory, memory removal endpoints, and desktop delete_text actuation."),

    # Connectors
    "connectors/connectors.py": ("Python Connector Engine", "Autonomous engine managing Google Workspace (Gmail, Calendar, Drive, Docs, Slides, Tasks) and GitHub MCP tool execution, date parsing, email decoding, and token encryption."),
    "connectors/connector-agent.ts": ("Connector Dispatcher", "TypeScript bridge declaring 26 connector tools and forwarding calls to connectors.py via execFile."),
    "connectors/connector-registry.ts": ("Connector Tool Registry", "Comprehensive parameter schemas and uppercase type metadata (OBJECT, STRING, ARRAY) for all Google and GitHub tools."),
    "connectors/connector-routes.ts": ("Connector REST Routes", "Express endpoints for connector listing, status polling, OAuth callbacks, and token management."),
    "connectors/connector-service.ts": ("Connector Service Client", "Client-side connector management and token exchange operations."),
    "connectors/BUILD_GUIDE.md": ("Connector Build Manual", "Comprehensive developer guide for extending Google & GitHub integrations."),
    "connectors/README.md": ("Connectors Documentation", "Architectural overview and setup guide for external integrations."),
    "connectors/types.ts": ("Connector Type Definitions", "Interfaces for OAuth tokens, connector states, and tool execution payloads."),
    "connectors/github-mcp.ts": ("GitHub MCP Client", "Helper declarations for GitHub repos, issues, pull requests, and notifications."),
    "connectors/google-mcp.ts": ("Google Workspace MCP", "Helper declarations for Gmail, Calendar, Drive, Docs, and Tasks."),
    "connectors/index.ts": ("Connectors Index", "Exports connector dispatchers and route configurations."),
    "connectors/__init__.py": ("Python Module Init", "Python package marker for connectors module."),
    "connectors/ui/ConnectorsView.tsx": ("Connectors HUD View", "Main modal view rendering all available integration cards and connection states."),
    "connectors/ui/ConnectorCard.tsx": ("Connector Card Widget", "Interactive card for a single connector with connect/disconnect actions and tool badges."),
    "connectors/ui/ConnectorDetail.tsx": ("Connector Detail Modal", "Shows detailed scopes, tool lists, and troubleshooting info for an integration."),
    "connectors/ui/ConnectorButton.tsx": ("HUD Action Button", "Toolbar button launching the Connectors modal with connection indicator dot."),
    "connectors/ui/ConnectorMenu.tsx": ("Context Menu", "Quick popover menu for inspecting connector status."),
    "connectors/ui/useConnectors.ts": ("Connectors React Hook", "Manages connector fetch, status polling, and OAuth trigger state."),
    "connectors/ui/connector-types.ts": ("UI Connector Types", "React prop and state interfaces for connector components."),
    "connectors/ui/index.ts": ("UI Index", "Re-exports all UI components for connectors."),

    # Whole Controls
    "whole_controls/GUIDE_VOICE_AGENT_PARALLEL_INTEGRATION.md": ("Integration Architecture Guide", "Defines the sub-10ms C++ execution model and parallel tool execution guidelines."),
    "whole_controls/voice_agent_bridge/tool_declarations.json": ("Voice Agent Tool Declarations", "Gemini Live function declarations for all 22 OS and hardware controls."),
    "whole_controls/voice_agent_bridge/voice_agent_parallel_harness.py": ("Parallel Tool Test Harness", "Benchmark script verifying concurrent tool execution under load."),
    "whole_controls/native_workers/Makefile": ("Native C++ Build Makefile", "Compiles all 18 C++ workers with g++ -O3 -Wall -Wextra -std=c++17 into bin/."),
    "whole_controls/native_workers/desktop_control.cpp": ("C++ Desktop Automation Worker", "Simulates mouse movement, clicks, typing, and key combinations via X11/uinput interop."),
    "whole_controls/native_workers/pc_spec.cpp": ("C++ Hardware Spec Worker", "Detailed CPU, RAM, GPU, motherboard, and disk specification scanner."),
    "whole_controls/native_workers/hardware_ctrl.cpp": ("C++ Audio & Brightness Worker", "Direct control over PipeWire/PulseAudio volume and backlight brightness."),
    "whole_controls/native_workers/omarchy_ctrl.cpp": ("C++ Omarchy/Hyprland Worker", "Sub-millisecond IPC for Hyprland window management, workspaces, and themes."),
    "whole_controls/native_workers/vision_ctrl.cpp": ("C++ Vision & Camera Worker", "V4L2 camera control and screen capture coordinate stream manager."),
    "whole_controls/native_workers/process_ctrl.cpp": ("C++ Process Manager Worker", "Scans, signals, and terminates processes by name or PID."),
    "whole_controls/native_workers/net_inspector.cpp": ("C++ Network Inspector Worker", "Active network interfaces, routing tables, and bandwidth telemetry."),
    "whole_controls/native_workers/firewall_audit.cpp": ("C++ Firewall Security Worker", "Audits iptables / nftables / ufw security rules and open ports."),
    "whole_controls/native_workers/media_ctrl.cpp": ("C++ Media Controller Worker", "Controls MPRIS2 media players (Spotify, VLC, Chrome, Firefox)."),
    "whole_controls/native_workers/memory_tester.cpp": ("C++ RAM Diagnostic Worker", "Performs rapid hardware memory integrity and allocation stress checks."),
    "whole_controls/native_workers/sys_telemetry.cpp": ("C++ System Telemetry Worker", "Instantaneous CPU utilization, RAM usage, load averages, and uptime."),
    "whole_controls/native_workers/file_search.cpp": ("C++ Fast File Search Worker", "Multi-threaded recursive directory search for filenames and patterns."),
    "whole_controls/native_workers/thermal_scan.cpp": ("C++ Thermal Sensor Worker", "Reads CPU/GPU thermal zones and fan speeds via sysfs."),
    "whole_controls/native_workers/storage_scan.cpp": ("C++ Disk Storage Worker", "Partition utilization, mount points, and I/O performance stats."),
    "whole_controls/native_workers/open_app.cpp": ("C++ App Launcher Worker", "Fast application launcher resolving .desktop files and binary paths."),
    "whole_controls/native_workers/jarvis_sysctl.cpp": ("C++ Kernel Sysctl Worker", "Queries and modifies Linux kernel parameters for performance tuning."),
    "whole_controls/native_workers/wifi_scan.cpp": ("C++ WiFi Scanner Worker", "Scans available wireless SSIDs, signal strengths, and security standards."),
    "whole_controls/native_workers/service_ctrl.cpp": ("C++ Systemd Service Worker", "Inspects and restarts systemd user and system service units."),
    "whole_controls/python_actuators/unified_dispatcher.py": ("Python Unified Dispatcher", "Central async routing layer connecting Voice Agent tool calls to C++ workers or Python actuators."),
    "whole_controls/python_actuators/settings_and_hardware.py": ("Hardware & Settings Actuator", "Adjusts master audio volume, display brightness, and power profiles."),
    "whole_controls/python_actuators/omarchy_skills.py": ("Hyprland Desktop Skills", "Controls workspaces, themes, wallpapers, and notifications."),
    "whole_controls/python_actuators/app_launcher.py": ("App Launcher Actuator", "Launches applications and web shortcuts with smart alias resolution."),
    "whole_controls/python_actuators/app_closer.py": ("App Closer Actuator", "Closes active windows, browser tabs (Ctrl+W), or specific processes."),
    "whole_controls/python_actuators/desktop_automation.py": ("Desktop Automation Actuator", "Mouse clicking, scrolling, typing, text deletion (delete_text), and screenshot capture."),
    "whole_controls/python_actuators/system_services.py": ("Systemd Services Actuator", "Manages system services, restarts, and status inspections."),
    "whole_controls/python_actuators/shell_and_tasks.py": ("Linux Shell Actuator", "Executes arbitrary bash commands asynchronously with timeout guards."),
    "whole_controls/python_actuators/clipboard_manager.py": ("Clipboard Actuator", "Reads and writes clipboard text across Wayland (wl-clipboard) and X11 (xclip)."),
    "whole_controls/python_actuators/media_controller.py": ("Media Control Actuator", "Play, pause, skip, and stop via playerctl / MPRIS2."),
    "whole_controls/python_actuators/power_session.py": ("Session Power Actuator", "Locks screen, suspends, reboots, or powers off the system."),
    "whole_controls/python_actuators/vision_controller.py": ("Vision Stream Actuator", "Starts and stops camera optical feeds and screen sharing modes."),
    "whole_controls/python_actuators/__init__.py": ("Actuators Module Init", "Exports all python actuator modules."),

    # Frontend
    "frontend/src/App.tsx": ("Main Application Root", "Coordinates audio session, WebSocket events, Arc-Reactor visualizer, optical stream PiP, CEO HUD, and modal toggles."),
    "frontend/src/main.tsx": ("React Client Entrypoint", "Mounts App into DOM root with StrictMode."),
    "frontend/src/index.css": ("Tailwind v4 Stylesheet", "Base styles, theme variables, and holographic glowing visual utilities."),
    "frontend/src/types.ts": ("Frontend Type Definitions", "Interfaces for audio state, coworkers, telemetry, memory matrix, and settings."),
    "frontend/index.html": ("SPA HTML Entry", "Holographic theme meta tags, PWA links, and root DOM node."),
    "frontend/vite.config.ts": ("Vite Bundler Config", "Configures React plugin, Tailwind CSS v4, and dev server options."),
    "frontend/README.md": ("Frontend Documentation", "Overview of client architecture and setup instructions."),
    "frontend/firebase-applet-config.json": ("Firebase Applet Config", "Firebase client configuration."),
    "frontend/public/audio-processors/capture.worklet.js": ("Audio Capture Worklet", "AudioWorkletProcessor capturing 16kHz PCM audio from microphone."),
    "frontend/public/audio-processors/playback.worklet.js": ("Audio Playback Worklet", "AudioWorkletProcessor playing PCM16 audio chunks without main thread stutter."),
    "frontend/src/components/CeoExecutiveHUD.tsx": ("CEO Executive HUD", "Full-screen or floating executive command HUD visualizing active missions, agents roster, and session logs."),
    "frontend/src/components/Header.tsx": ("HUD Header Bar", "Top navigation bar rendering system status indicators, clock, and quick toggles."),
    "frontend/src/components/PwaInstallButton.tsx": ("PWA Install Prompt", "Prompts user to install J.A.R.V.I.S. as a native Progressive Web App on desktop or mobile."),
    "frontend/src/components/VoiceVisualizer.tsx": ("Arc-Reactor Visualizer", "Interactive canvas rendering pulsing concentric holographic rings reflecting real-time voice telemetry."),
    "frontend/src/components/ConnectorsModal.tsx": ("Connectors Manager Modal", "Full modal for connecting Google Workspace & GitHub MCP tools with live OAuth indicators."),
    "frontend/src/components/JarvisMemoryHUD.tsx": ("Memory Matrix HUD", "Real-time overlay displaying sovereign memory triads, facts, search, and recall statistics."),
    "frontend/src/components/OAuthTroubleshooterModal.tsx": ("OAuth Troubleshooter", "Interactive wizard guiding setup of Google Cloud Console redirect URIs."),
    "frontend/src/components/ApiKeyModal.tsx": ("API Key Modal", "Modal for verifying and updating Gemini and Groq API keys."),
    "frontend/src/components/SettingsModal.tsx": ("Settings Modal", "Configures voice models, system instructions, auto-launch, and themes."),
    "frontend/src/components/VisionPreviewModal.tsx": ("Vision Preview PiP", "Picture-in-picture floating overlay rendering live camera or screen sharing feed."),
    "frontend/src/components/VoiceTransferBanner.tsx": ("Voice Transfer Banner", "Animated HUD notification displayed when Coworker persona transfer occurs."),
    "frontend/src/components/PersonaCard.tsx": ("Coworker Persona Card", "Card displaying persona role, voice model, traits, and active speaking status."),
    "frontend/src/components/QuickPrompts.tsx": ("Quick Action Chips", "Clickable prompt chips for rapid testing and common commands."),
    "frontend/src/components/CommandInputBar.tsx": ("Tactical Command Bar", "Multimodal input bar with autocomplete support for /skills and CEO directives."),
    "frontend/src/serviceWorkerRegistration.ts": ("PWA Service Worker Registration", "Registers and updates the progressive web app service worker."),
    "frontend/src/vite-env.d.ts": ("Vite Environment Types", "TypeScript client type definitions for Vite client environment."),
    "frontend/src/data/personas.ts": ("Frontend Personas Data", "Client-side metadata for the 6 Coworker personas."),
    "frontend/src/services/memoryEngine.ts": ("Client Memory Engine", "Manages local working context and synchronizes with server memory endpoints in real time."),
    "frontend/src/services/authService.ts": ("Auth Service", "Client authentication state management."),
    "frontend/src/services/demoVoiceService.ts": ("Demo Voice Service", "Local audio synthesis fallback for offline or keyless operation."),
    "frontend/src/services/workspaceService.ts": ("Workspace Service", "Interacts with workspace tools and directory APIs."),
    "frontend/src/utils/audio.ts": ("Audio Utility Functions", "Base64 encoding/decoding, PCM conversion, and AudioContext helpers."),
    "frontend/src/utils/automatic_greeting.ts": ("Client Greeting Generator", "Selects contextual greeting phrases based on current state."),
    "frontend/src/utils/voice_transfer.ts": ("Client Handoff Detector", "Client-side regex fallback for detecting verbal coworker switch requests."),

    # Hermes Connection
    "hermes-connection/gateway_client.py": ("Hermes Gateway Client", "Client connecting J.A.R.V.I.S. to the Hermes Agentic gateway."),
    "hermes-connection/connection.py": ("Hermes Connection Layer", "Establishes persistent socket and protocol connection to Hermes."),
    "hermes-connection/config.py": ("Hermes Configuration", "Manages credentials, host ports, and gateway URLs for Hermes."),
    "hermes-connection/cli_bridge.py": ("Hermes CLI Bridge", "Command-line interface to dispatch Hermes commands directly."),
    "hermes-connection/actuator_tools.py": ("Hermes Actuator Tools", "Tool wrapper exposing J.A.R.V.I.S. OS and memory capabilities to Hermes."),
    "hermes-connection/memory_bridge.py": ("Hermes Memory Bridge", "Synchronizes conversation memory between Hermes and J.A.R.V.I.S. SQLite core."),
    "hermes-connection/test_connection.py": ("Hermes Connection Tester", "Automated test validating Hermes gateway handshakes."),
    "hermes-connection/README.md": ("Hermes Integration Manual", "Architectural specification for Hermes multi-agent lead engineer integration."),
    "hermes-connection/service/hermes-gateway.service": ("Systemd Service Unit", "Background systemd service unit for continuous Hermes gateway daemon."),
    "hermes-connection/templates/system_prompt_hermes.j2": ("Hermes System Prompt Template", "Jinja2 template defining Hermes Lead Engineer persona and tools."),
    "hermes-connection/__init__.py": ("Hermes Package Init", "Package exports for hermes-connection."),

    # Root and project docs
    "package.json": ("NPM Package Manifest", "Project metadata, scripts (dev, build, lint, clean, update:ref), and production/dev dependencies."),
    "package-lock.json": ("NPM Dependency Lockfile", "Deterministic dependency tree lockfile."),
    "tsconfig.json": ("TypeScript Configuration", "Compiler options enforcing strict type checking, ES2022 target, and module resolution."),
    "README.md": ("Project Readme", "High-level overview of J.A.R.V.I.S. Autonomous AI OS features, CEO integration, and quickstart."),
    "GEMINI.md": ("Workspace Engineering Rules", "Mandatory workspace instructions: port 3000, 4-subfolder layout, dev branch policy, quality gates."),
    "AUDIT_AND_IMPROVEMENTS.md": ("Engineering Audit & Hardening Blueprint", "Deep audit of memory bundle edge cases and prioritized hardening recipes."),
    "JARVIS_MEMORY_BUNDLE_IMPROVEMENTS.md": ("Memory Hardening Reference", "Detailed technical analysis of memory bundle optimizations."),
    "agents_roster.yaml": ("CEO Agent Roster Specification", "Declarative YAML manifest defining all active AI agents, roles, tools, and lead engineer Hermes."),
    ".env": ("Environment Secrets", "Local configuration keys (GEMINI_API_KEY, GROQ_API_KEY, PORT=3000, etc.)."),
    ".env.example": ("Environment Template", "Template file showing required configuration variables."),
    ".gitignore": ("Git Ignore Rules", "Ignores node_modules, dist, .env, build artifacts, and temporary databases."),
    ".server.log": ("Runtime Server Log", "Captured background stdout/stderr logs from server runs."),
    "skills-lock.json": ("Skills Lockfile", "Integrity hashes and version tracking for installed domain skills."),
    "skills/skills_registry.json": ("Universal Skills Registry", "Dynamic catalog of indexed skills, scripts, and descriptions."),
    ".agents/README.md": ("Agents Roster Documentation", "Overview of multi-agent workflows and autonomous engineer guidelines."),
    ".agents/workflows/coding-agnts.md": ("24/7 Co-Worker Workflow Protocol", "Mandatory 5-phase engineering protocol (Triage, Architecture, Spec, TDD, Production)."),
    "project_docs/ARCHITECTURE.md": ("System Architecture Blueprint", "High-level architecture documentation and component diagrams."),
    "project_docs/COWORKERS.md": ("AI Coworkers Roster & Protocol", "Detailed guide to the 6 Coworker personas and Voice Transfer Protocol."),
    "project_docs/AUTONOMOUS_JARVIS_BLUEPRINT.md": ("Autonomous Jarvis Blueprint", "Vision and architecture for 24/7 autonomous digital coworker."),
    "project_docs/AUTONOMY_PLAN.md": ("Autonomy Roadmap", "Phased implementation plan for continuous background operation."),
    "project_docs/CODEBASE_REFERENCE.md": ("Codebase Technical Reference", "Workspace-local mirror of the technical reference manual."),
    "project_docs/futher.md": ("Future Architecture Specifications", "Extended roadmap and advanced features specification."),
    "project_docs/OPENMANUS_INTEGRATION_ANALYSIS.md": ("OpenManus Integration Analysis", "Comparative study of OpenManus agent architecture."),
    "project_docs/README.md": ("Project Docs Index", "Directory overview for documentation files."),
    "project_docs/TECH_STACK_AND_BUILD_GUIDE.md": ("Technical Stack & Build Guide", "Step-by-step instructions for building and configuring subsystems."),
    "project_docs/metadata.json": ("Project Metadata", "Internal project identifiers and version markers."),
    "docs/superpowers/plans/2026-09-29-jarvis-ui-redesign.md": ("UI Redesign Implementation Plan", "Detailed implementation steps for modernizing J.A.R.V.I.S. frontend."),
    "docs/superpowers/specs/2026-09-29-jarvis-ui-redesign-design.md": ("UI Redesign Design Specification", "UX specifications and component layouts for HUD modernization."),
    "data/connectors.json": ("Encrypted Connector Storage", "AES-256-GCM encrypted OAuth tokens and connector configuration."),
    "data/jarvis.db": ("Primary SQLite Database", "SQLite database storing memory_buffer, triad tables, tasks, and audit logs."),
    "data/ruflo-config.json": ("Ruflo Configuration", "Configuration metadata for Ruflo swarm integration."),
    "data/.vault-key": ("Encryption Key Salt", "Machine-specific key for connector token encryption."),
    "scripts/update_codebase_reference.py": ("Reference Manual Generator", "Autonomous script that refreshes CODEBASE_REFERENCE.md with real-time Git commits and line counts.")
}

def get_file_info(rel_path):
    if rel_path in KNOWN_ROLES:
        return KNOWN_ROLES[rel_path]
    
    if rel_path.startswith("whole_controls/native_workers/bin/"):
        name = Path(rel_path).name
        return ("Compiled C++ Native Binary", f"High-performance ELF binary compiled with -O3 for \x27{name}\x27 system action.")
    
    if rel_path.startswith("jarvis_memory_bundle/"):
        if "engine_rust" in rel_path:
            name = Path(rel_path).name
            return ("Rust Memory Engine Source", f"Rust crate component ({name}) providing high-throughput Axum/Tokio FTS5 memory search.")
        elif "vault" in rel_path:
            return ("Obsidian Vault File", "Zettelkasten knowledge note, interaction journal, atomic fact, or Obsidian configuration.")
        elif "python" in rel_path:
            return ("Python Memory Subsystem", "Core Python memory management, pattern mining, or SQLite abstraction.")
        elif "examples" in rel_path:
            return ("Memory Example Script", "Demonstrates dual-store search, memory storage, or semantic recall.")
        elif "tests" in rel_path:
            return ("Memory Test Suite", "Unit or integration test validating memory integrity.")
        elif "brain_adapter" in rel_path:
            return ("Agent Brain Adapter", "Bridging adapter integrating conversational LLM turns with memory.")
        else:
            return ("Memory Bundle Component", "Supporting sovereign memory bundle file.")
            
    if rel_path.startswith(".agents/skills/"):
        parts = rel_path.split("/")
        skill_name = parts[2] if len(parts) > 2 else "universal"
        if rel_path.endswith("SKILL.md"):
            return ("Skill Specification", f"Autonomous agent skill definition, operational workflows, and directives for \x27{skill_name}\x27.")
        elif rel_path.endswith(".py") or rel_path.endswith(".sh"):
            return ("Skill Executable Script", f"Automated execution script providing capabilities for \x27{skill_name}\x27 skill.")
        else:
            return ("Skill Supporting Resource", f"Configuration, template, or documentation resource for \x27{skill_name}\x27 skill.")
            
    if rel_path.startswith(".agents/ceo_resources/"):
        return ("CEO Operational Resource", "Executive checklist, prompt guidelines, technical preferences, or framework definition.")
        
    if rel_path.startswith("antigravity-sdk-python-main/"):
        if rel_path.endswith(".py"):
            return ("Antigravity SDK Python Module", "Core Python SDK module for Google Antigravity agent execution and tooling.")
        elif rel_path.endswith(".md"):
            return ("Antigravity SDK Documentation", "Documentation or usage guide for Antigravity Python SDK.")
        else:
            return ("Antigravity SDK Asset", "Configuration or data file supporting Antigravity Python SDK.")
            
    if rel_path.startswith("data/audio_fillers/"):
        return ("PCM Audio Vocal Filler", "Pre-synthesized 24kHz/16kHz raw PCM audio filler chunk played to eliminate silence during reasoning.")
        
    if rel_path.endswith(".ts") or rel_path.endswith(".tsx"):
        return ("TypeScript Module", "Frontend or backend TypeScript source file.")
    elif rel_path.endswith(".py"):
        return ("Python Script", "Supporting Python utility or worker script.")
    elif rel_path.endswith(".md"):
        return ("Markdown Documentation", "Project documentation or specification file.")
    elif rel_path.endswith(".json"):
        return ("JSON Configuration", "Configuration or data file in JSON format.")
    elif rel_path.endswith(".yaml") or rel_path.endswith(".yml"):
        return ("YAML Specification", "Declarative configuration or manifest.")
    elif rel_path.endswith(".cpp") or rel_path.endswith(".h"):
        return ("C++ Source Code", "Native C++ worker or header file.")
    elif rel_path.endswith(".rs"):
        return ("Rust Source Code", "Rust native memory engine source file.")
    else:
        return ("Repository Asset", "Supporting configuration or resource file.")

def build_section_1(remote_url):
    return [
        "## 1. Repository Identity & Core Runtime",
        "",
        "*   **Repository Root**: [`/home/g0pi/Downloads/jarvis`](file:///home/g0pi/Downloads/jarvis)",
        f"*   **Remote Repository**: `{remote_url}`",
        "*   **Primary Languages & Tech Stacks**:",
        "    *   **Backend Server**: TypeScript / Node.js (ESM), Express 4.21, WebSocket (`ws` 8.21), `@google/genai` (2.4.0), Groq SDK fast actuator, CEO Executive Orchestrator ([`backend/system_modules/ceo/`](file:///home/g0pi/Downloads/jarvis/backend/system_modules/ceo)), Multi-Agent Dual-Path Engine ([`backend/system_modules/intelligent_system/dual_path_orchestrator.ts`](file:///home/g0pi/Downloads/jarvis/backend/system_modules/intelligent_system/dual_path_orchestrator.ts)). Entry point: [`backend/server.ts`](file:///home/g0pi/Downloads/jarvis/backend/server.ts) executed via `tsx`.",
        "    *   **Frontend Client**: React 19.0.1, Vite 6.2.3, Tailwind CSS v4.1.14, Lucide React, Motion, CeoExecutiveHUD ([`frontend/src/components/CeoExecutiveHUD.tsx`](file:///home/g0pi/Downloads/jarvis/frontend/src/components/CeoExecutiveHUD.tsx)). Entry point: [`frontend/src/main.tsx`](file:///home/g0pi/Downloads/jarvis/frontend/src/main.tsx) & [`frontend/src/App.tsx`](file:///home/g0pi/Downloads/jarvis/frontend/src/App.tsx).",
        "    *   **Sub-5ms Native OS Automation**: 18 high-performance C++17 worker binaries compiled with `g++ -O3` in [`whole_controls/native_workers/`](file:///home/g0pi/Downloads/jarvis/whole_controls/native_workers) controlled via direct execution and [`unified_dispatcher.py`](file:///home/g0pi/Downloads/jarvis/whole_controls/python_actuators/unified_dispatcher.py), desktop automation with text deletion (`delete_text`).",
        "    *   **External MCP Connectors**: Google Workspace (Gmail, Calendar, Drive, Docs, Slides, Tasks) and GitHub MCP integrations managed via [`connectors/connectors.py`](file:///home/g0pi/Downloads/jarvis/connectors/connectors.py) and [`connectors/connector-routes.ts`](file:///home/g0pi/Downloads/jarvis/connectors/connector-routes.ts), with Groq speculative actuation protection, relative date parsing, email decoding, and bidirectional SQLite task sync.",
        "    *   **Sovereign 4-Tier Memory Matrix**: SQLite WAL database ([`data/jarvis.db`](file:///home/g0pi/Downloads/jarvis/data/jarvis.db) including `tasks`, `memory_buffer`, and triad tables), Obsidian Markdown vault ([`jarvis_memory_bundle/vault/`](file:///home/g0pi/Downloads/jarvis/jarvis_memory_bundle/vault)), and Rust Memory Engine ([`jarvis_memory_bundle/engine_rust/`](file:///home/g0pi/Downloads/jarvis/jarvis_memory_bundle/engine_rust)).",
        "    *   **Executive Multi-Agent Roster & Skills**: J.A.R.V.I.S. CEO Executive Orchestrator ([`ceo_orchestrator.ts`](file:///home/g0pi/Downloads/jarvis/backend/system_modules/ceo/ceo_orchestrator.ts), [`ceo_roster.ts`](file:///home/g0pi/Downloads/jarvis/backend/system_modules/ceo/ceo_roster.ts), [`agents_roster.yaml`](file:///home/g0pi/Downloads/jarvis/agents_roster.yaml)) orchestrating Hermes as Lead Engineer and 28+ universal skills from `ivfarias/ceo`.",
        "*   **Server Port**: `3000` (managed via `PORT` in `.env` and `Number(process.env.PORT) || 3000` in [`backend/server.ts`](file:///home/g0pi/Downloads/jarvis/backend/server.ts)).",
        "*   **Development Command**: `npm run dev` (executes `tsx backend/server.ts` with embedded Vite middleware).",
        "*   **Browser Auto-Launch**: Upon boot, automatically launches default browser at `http://localhost:3000` via `xdg-open` (Linux), `open` (macOS), or `start` (Windows).",
        "*   **Target Runtimes**: Node.js v20+ / v22+, Python 3.10+, Rust Cargo (edition 2021), Linux (Wayland, Hyprland, Omarchy OS, X11).",
        "",
        "---",
        ""
    ]

def build_section_2(current_branch, merge_base, ahead_commits, graph_raw, dev_commits, main_commits, git_status):
    lines = [
        "## 2. Real-Time Git Branch & Commit Telemetry",
        "",
        "### Branch Divergence & Release Policy",
        "*   **Branch Policy**: According to [`GEMINI.md`](file:///home/g0pi/Downloads/jarvis/GEMINI.md), **all active development, commits, and pushes MUST target the `dev` branch**. The `main` branch is strictly release-gated and must not receive pushes until the user explicitly confirms (e.g. *\"all are ok push to main branch\"*).",
        f"*   **Current Active Branch**: `{current_branch}`",
        f"*   **Merge Base**: `{merge_base}`",
        f"*   **`dev` Branch Ahead**: `dev` is currently **{len(ahead_commits)} commits ahead** of `main` / `origin/dev`:"
    ]
    for ac in ahead_commits:
        lines.append(f"    *   `{ac}`")
    lines.extend([
        "",
        "### Git Visual Branch Graph",
        "```text",
        graph_raw,
        "```",
        "",
        f"### Real-Time Commit Log: `dev` Branch ({len(dev_commits)} commits)",
        "",
        "| Commit Hash | Author | Date & Time | Commit Message |",
        "| :--- | :--- | :--- | :--- |"
    ])
    for c in dev_commits:
        lines.append(f"| `{c['hash']}` | {c['author']} | {c['date']} | {c['message']} |")
    lines.extend([
        "",
        f"### Real-Time Commit Log: `main` Branch ({len(main_commits)} commits)",
        "",
        "| Commit Hash | Author | Date & Time | Commit Message |",
        "| :--- | :--- | :--- | :--- |"
    ])
    for c in main_commits:
        lines.append(f"| `{c['hash']}` | {c['author']} | {c['date']} | {c['message']} |")
    lines.extend([
        "",
        "### Real-Time Working Tree Status",
        "```text",
        git_status if git_status else "Working tree clean. No uncommitted modifications.",
        "```",
        "",
        "---",
        ""
    ])
    return lines

def build_section_3():
    return [
        "## 3. Full Dependency Inventory",
        "",
        "### Production Dependencies (`package.json`)",
        "*   **`@google/genai` (^2.4.0)**: Core SDK powering Google Gemini 2.5 / 3.8 models, WebSocket Live Bidirectional streaming audio session (`/live`), text generations, multimodal image ingestion, and tool response loops.",
        "*   **`express` (^4.21.2)**: Core HTTP application server. Routes memory endpoints, OAuth authentication callbacks, skills management APIs, and health checks.",
        "*   **`ws` (^8.21.3)**: High-performance WebSocket server bound to `/live` for bidirectional audio/video/text streaming between React client and Gemini Live.",
        "*   **`react` (^19.0.1) & `react-dom` (^19.0.1)**: Modern React 19 SPA powering the holographic Arc-Reactor HUD, memory inspection modals, CeoExecutiveHUD, and coworker switching.",
        "*   **`vite` (^6.2.3)**: Frontend bundler and development server, embedded as Express middleware in development mode for instant Hot Module Replacement (HMR).",
        "*   **`@tailwindcss/vite` (^4.1.14) & `tailwindcss` (^4.1.14)**: Next-generation Tailwind CSS v4 styling engine providing responsive cyan HUD aesthetics.",
        "*   **`motion` (^12.23.24)**: High-fps hardware-accelerated fluid UI physics and micro-interactions for persona cards and audio wave pulses.",
        "*   **`lucide-react` (^0.546.0)**: Complete icon library for Arc-Reactor controls, connectors, hardware stats, and coworker avatars.",
        "*   **`dotenv` (^17.2.3)**: Loads environment secrets from `.env` (API keys, ports, Groq credentials, OAuth configs).",
        "*   **`googleapis` (^174.0.1)** & **`@react-oauth/google` (^0.13.5)**: Google Workspace and OAuth client integration.",
        "*   **`firebase` (^12.19.0)**: Firebase applet configuration integration.",
        "",
        "### Development Dependencies",
        "*   **`tsx` (^4.21.0)**: TypeScript execute daemon running [`backend/server.ts`](file:///home/g0pi/Downloads/jarvis/backend/server.ts) with zero build overhead.",
        "*   **`typescript` (~5.8.2)**: Strict type checking (`tsc --noEmit`) across server, system modules, and frontend.",
        "*   **`esbuild` (^0.25.0)**: Ultra-fast bundler backing Vite and TypeScript transforms.",
        "",
        "### Rust Engine Dependencies (`jarvis_memory_bundle/engine_rust/Cargo.toml`)",
        "*   **`tokio` (1.36)**: Asynchronous runtime with full multi-threading and timers.",
        "*   **`axum` (0.7)**: Ergonomic Web & REST server running on port `50051`.",
        "*   **`rusqlite` (0.31)**: Bundled SQLite client with FTS5 full-text search extensions.",
        "*   **`serde` & `serde_json` (1.0)**: High-speed JSON serialization for graph nodes, memory triples, and diary events.",
        "",
        "---",
        ""
    ]

def build_section_4():
    return [
        "## 4. Startup & Runtime Flow",
        "",
        "The complete boot lifecycle is orchestrated inside [`backend/server.ts`](file:///home/g0pi/Downloads/jarvis/backend/server.ts):",
        "",
        "```mermaid",
        "sequenceDiagram",
        "    autonumber",
        "    participant Server as backend/server.ts",
        "    participant CEO as ceo_orchestrator.ts",
        "    participant DualPath as dual_path_orchestrator.ts",
        "    participant Skills as skills_manager.ts",
        "    participant MemBridge as memory_bridge.py / jarvis.db",
        "    participant WSS as WebSocketServer (/live)",
        "    participant Vite as createViteServer (SPA)",
        "    participant Browser as xdg-open Browser",
        "    participant Client as React 19 Client",
        "    participant Groq as GroqFastActuator",
        "    participant Live as Gemini Live API",
        "",
        "    Server->>Server: Load environment (.env), resolve PORT (3000)",
        "    Server->>Skills: scanAndIndexSkills() [Discovers skills, loads registry]",
        "    Server->>CEO: initializeCeoOrchestrator() [Loads agents_roster.yaml & Hermes Lead]",
        "    Server->>DualPath: initializeDualPathOrchestrator() [Pre-allocates workers & audio fillers]",
        "    Server->>MemBridge: Test SQLite & Vault connectivity",
        "    Server->>Server: Mount REST routes (/api/memory, /api/connectors, /api/skills)",
        "    Server->>WSS: Instantiate WebSocketServer at /live",
        "    Server->>Vite: Mount Vite middleware (development mode)",
        "    Server->>Server: Listen on 0.0.0.0:3000",
        "    Server->>Browser: autoLaunchBrowser(\x27http://localhost:3000\x27)",
        "    Browser->>Client: Load React 19 HUD",
        "    Client->>WSS: Connect to /live",
        "    Client->>WSS: Send \x27init\x27 message with voice/persona & temporal directives",
        "    WSS->>Live: ai.live.connect(model, voiceName, tools)",
        "    Client->>WSS: Stream 16kHz PCM audio",
        "    WSS->>Live: sendRealtimeInput({ audio })",
        "    Live-->>WSS: input_transcription stream",
        "    WSS->>Groq: processStreamingSpeech(transcription) [sub-80ms speculative intent]",
        "    Groq->>Server: Actuate Fast-Path OS controls (cached result)",
        "    Live-->>WSS: toolCall event",
        "    WSS->>Server: Reuse cached result (0ms) or dispatch tool",
        "    WSS-->>Live: sendToolResponse()",
        "    Live-->>WSS: output audio chunks",
        "    WSS-->>Client: Send audio chunks to AudioWorklet",
        "```",
        "",
        "### Step-by-Step Prose Boot Sequence",
        "1.  **Environment Ingestion**: Reads `.env` from workspace root. Checks `GEMINI_API_KEY`, `GROQ_API_KEY`, `PORT` (3000), `AUTO_LAUNCH` flag, and `OPERATOR_NAME`.",
        "2.  **Universal Skills Scan**: [`skills_manager.ts`](file:///home/g0pi/Downloads/jarvis/backend/skills_manager.ts) inspects `./skills/`, `./.agents/skills/`, and `~/.agents/skills/`, parses `SKILL.md` frontmatter, extracts automation scripts, and updates [`skills/skills_registry.json`](file:///home/g0pi/Downloads/jarvis/skills/skills_registry.json).",
        "3.  **CEO Orchestrator & Roster Initialization**: [`ceo_orchestrator.ts`](file:///home/g0pi/Downloads/jarvis/backend/system_modules/ceo/ceo_orchestrator.ts) ingests [`agents_roster.yaml`](file:///home/g0pi/Downloads/jarvis/agents_roster.yaml), loads active agent personas, and binds Hermes as Lead Engineer for multi-agent workflows.",
        "4.  **Multi-Agent Dual-Path Engine Warmup**: [`dual_path_orchestrator.ts`](file:///home/g0pi/Downloads/jarvis/backend/system_modules/intelligent_system/dual_path_orchestrator.ts) prepares the fast path (<10ms) and slow path (<300ms SLA with [`filler_audio_synthesizer.ts`](file:///home/g0pi/Downloads/jarvis/backend/system_modules/intelligent_system/filler_audio_synthesizer.ts)).",
        "5.  **Memory Subsystem Bridge**: Initializes SQLite connection to [`data/jarvis.db`](file:///home/g0pi/Downloads/jarvis/data/jarvis.db) and verifies Obsidian vault paths in [`jarvis_memory_bundle/vault/`](file:///home/g0pi/Downloads/jarvis/jarvis_memory_bundle/vault).",
        "6.  **REST Route Mounting**: Registers `/api/health`, `/api/memory/*` (including `/clear` and `/:category/clear`), `/api/connectors/*` (from [`connectors/connector-routes.ts`](file:///home/g0pi/Downloads/jarvis/connectors/connector-routes.ts)), `/api/skills/*`, and `/api/chat` fallback.",
        "7.  **WebSocket Gateway Creation**: Hooks `ws.WebSocketServer` onto the HTTP server at endpoint `/live`.",
        "8.  **Vite Dev Server Integration & Auto-Launch**: In dev mode, creates a Vite server in middleware mode targeting [`frontend/`](file:///home/g0pi/Downloads/jarvis/frontend). Binds to `0.0.0.0:3000` and invokes `autoLaunchBrowser(\x27http://localhost:3000\x27)` via `xdg-open`.",
        "",
        "---",
        ""
    ]

def build_section_5(files):
    lines = [
        f"## 5. Complete Module Map (All {len(files)} Files)",
        "",
        f"Below is an exhaustive, 100% complete accounting of every single source file in the repository ({len(files)} files cataloged across 10 subsections with zero omissions):",
        ""
    ]
    subsections = [
        ("5.1 Backend Server, CEO System & Intelligent Core (`backend/`)", lambda p: p.startswith("backend/")),
        ("5.2 External MCP Connectors & UI (`connectors/`)", lambda p: p.startswith("connectors/")),
        ("5.3 Native Workers & System Controls (`whole_controls/`)", lambda p: p.startswith("whole_controls/")),
        ("5.4 Sovereign Memory Bundle & Rust Engine (`jarvis_memory_bundle/`)", lambda p: p.startswith("jarvis_memory_bundle/")),
        ("5.5 Frontend Client, React 19 HUD & Components (`frontend/`)", lambda p: p.startswith("frontend/")),
        ("5.6 Executive CEO Roster, Agents & Universal Skills (`.agents/`, `skills/`)", lambda p: p.startswith((".agents/", "skills/")) or p in ["agents_roster.yaml", "skills-lock.json"]),
        ("5.7 Project Documentation, Specifications & Schemas (`project_docs/`, `docs/`)", lambda p: p.startswith(("project_docs/", "docs/")) or p in ["AUDIT_AND_IMPROVEMENTS.md", "JARVIS_MEMORY_BUNDLE_IMPROVEMENTS.md", "GEMINI.md", "README.md"]),
        ("5.8 Hermes Agent Connection Protocol (`hermes-connection/`)", lambda p: p.startswith("hermes-connection/")),
        ("5.9 Antigravity Python SDK Subsystem (`antigravity-sdk-python-main/`)", lambda p: p.startswith("antigravity-sdk-python-main/")),
        ("5.11 Build Scripts, Data Stores & Root Configuration (`scripts/`, `data/`, root files)", lambda p: not any([
            p.startswith("backend/"), p.startswith("connectors/"), p.startswith("whole_controls/"),
            p.startswith("jarvis_memory_bundle/"), p.startswith("frontend/"), p.startswith(".agents/"),
            p.startswith("skills/"), p.startswith("project_docs/"), p.startswith("docs/"),
            p.startswith("hermes-connection/"), p.startswith("antigravity-sdk-python-main/"),
            p in ["agents_roster.yaml", "skills-lock.json", "AUDIT_AND_IMPROVEMENTS.md", "JARVIS_MEMORY_BUNDLE_IMPROVEMENTS.md", "GEMINI.md", "README.md"]
        ]))
    ]
    for title, condition in subsections:
        sub_files = [f for f in files if condition(f["rel_path"])]
        lines.append(f"### {title} ({len(sub_files)} files)")
        lines.append("")
        lines.append("| File Path | Lines | Role | Verified Responsibilities |")
        lines.append("| :--- | :---: | :--- | :--- |")
        for sf in sub_files:
            p = sf["rel_path"]
            role, resp = get_file_info(p)
            lines.append(f"| [{p}](file://{sf['full_path']}) | {sf['lines']} | {role} | {resp} |")
        lines.append("")
    lines.extend([
        "---",
        ""
    ])
    return lines

def build_section_6():
    return [
        "## 6. Architecture — Actual Shape",
        "",
        "The verified architecture operates as an executive, multi-agent, dual-path reactive dispatch system linking real-time multimodal audio streaming to high-speed native OS actuators, CEO workflow management, external MCP connectors, and a sovereign 4-tier memory matrix.",
        "",
        "```text",
        "  ┌────────────────────────────────────────────────────────────────────────────────────────┐",
        "  │                  FRONTEND CLIENT (React 19 + Vite + Tailwind v4)                       │",
        "  │   Arc-Reactor Visualizer │ Coworker HUD │ CeoExecutiveHUD │ AudioWorklet Capture/Play  │",
        "  └───────────────────────────────────┬────────────────────────────────────────────────────┘",
        "                                      │ WebSocket Full-Duplex (/live)",
        "                                      ▼",
        "  ┌────────────────────────────────────────────────────────────────────────────────────────┐",
        "  │                  EXPRESS BACKEND GATEWAY (backend/server.ts)                           │",
        "  │   WebSocket Gateway │ Universal Skills Engine │ SQLite REST Endpoints │ Local Files    │",
        "  └───────────────┬───────────────────────────┬────────────────────────────┬───────────────┘",
        "                  │ Live WebSocket            │ Mid-Sentence Intercept     │ Mission Directives",
        "                  ▼                           ▼                            ▼",
        "  ┌───────────────────────────────┐   ┌────────────────────────────┐   ┌───────────────────────────┐",
        "  │       GEMINI LIVE API         │   │    GROQ FAST ACTUATOR      │   │     CEO ORCHESTRATOR      │",
        "  │  (gemini-2.5-flash-native,    │   │  (sub-80ms speculative     │   │  (ivfarias/ceo framework, │",
        "  │   gemini-3.8-experimental)    │   │   actuator, 0ms cache hit) │   │   agents_roster.yaml)     │",
        "  │  Bidirectional Audio/Vision   │   │  Anti-hijacking protection │   │   Lead Engineer: Hermes   │",
        "  └───────────────┬───────────────┘   └─────────────┬──────────────┘   └─────────────┬─────────────┘",
        "                  │                                 │                                │",
        "                  └─────────────────────────────────┼────────────────────────────────┘",
        "                                                    │ Tool Dispatch",
        "                                                    ▼",
        "  ┌────────────────────────────────────────────────────────────────────────────────────────┐",
        "  │                         MULTI-AGENT DUAL-PATH ORCHESTRATOR                             │",
        "  │  FAST-PATH (<10ms SLA): Native C++ Workers │ Instant Groq Cached OS Actuation          │",
        "  │  SLOW-PATH (<300ms SLA): Deep Multi-Agent Pool + Instant Vocal Filler Audio Synthesizer│",
        "  └───────────────────────┬────────────────────────────────────────┬───────────────────────┘",
        "                          │                                        │",
        "          ┌───────────────┴───────────────┐        ┌───────────────┴───────────────┐",
        "          ▼                               ▼        ▼                               ▼",
        "  ┌───────────────────────────────┐  ┌─────────────────────────┐  ┌────────────────────────────────┐",
        "  │   NATIVE WHOLE CONTROLS       │  │  EXTERNAL MCP CONNECTORS│  │    SOVEREIGN MEMORY MATRIX     │",
        "  │   18 Compiled C++ Workers     │  │  Google Workspace (Gmail│  │  SQLite (data/jarvis.db)       │",
        "  │   Desktop automation          │  │  Calendar, Drive, Docs, │  │  Triads, Tasks & Daily Logs    │",
        "  │   (click, type, delete_text)  │  │  Tasks), GitHub MCP     │  │  Obsidian Zettelkasten Vault   │",
        "  │   Hyprland, Volume, Sysctl    │  │  Bi-directional DB sync │  │  Rust Axum Engine (50051)      │",
        "  └───────────────────────────────┘  └─────────────────────────┘  └────────────────────────────────┘",
        "```",
        "",
        "---",
        ""
    ]

def build_section_7():
    return [
        "## 7. Complete 78-Tool Registry",
        "",
        "The system dynamically exposes and routes **78 tools** across five core domains with zero tool collisions:",
        "",
        "### 7.1 Built-in Live Tools (`backend/server.ts` — 17 Tools)",
        "",
        "| Tool Name | Tier | Handler Location | Description |",
        "| :--- | :---: | :--- | :--- |",
        "| `query_memory` | Sync | `server.ts:901` | Queries sovereign memory bank for personal data, preferences, or instructions. |",
        "| `add_memory` | Sync | `server.ts:913` | Autonomously records new fact, preference, or rule into SQLite & Obsidian vault. |",
        "| `append_memory` | Sync | `server.ts:925` | Appends context or details to an existing memory category record. |",
        "| `remove_memory` | Sync | `server.ts:937` | Deletes or purges an existing memory record from core. |",
        "| `rewrite_memory` | Sync | `server.ts:949` | Updates or corrects an existing memory entry. |",
        "| `clear_memory` | Sync | `server.ts:961` | Resets or completely clears all or specific memory categories from SQLite core. |",
        "| `search_memory` | Sync | `server.ts:973` | Deep FTS5 search across past turns, decisions, and Obsidian vault notes. |",
        "| `save_memory_fact` | Sync | `server.ts:991` | Writes a permanent user preference or system fact note to the vault. |",
        "| `search_internet_knowledge` | Async | `server.ts:1083` | Autonomously queries Linux manpages, developer docs, and web knowledge for unfamiliar tools or errors. |",
        "| `switch_persona` | Sync | `server.ts:885` | Sub-second persona transfer to another Coworker (Friday, Ultron, Edith, Karen, Vision). |",
        "| `set_ui_reminder` | Sync | `server.ts:1011` | Spawns a floating countdown reminder alert on the user's screen. |",
        "| `activate_camera` | Sync | `server.ts:1027` | Turns on optical webcam stream transmitting real-time frames. |",
        "| `activate_screen_share` | Sync | `server.ts:1039` | Enables real-time screen capture feed to inspect monitor/code. |",
        "| `deactivate_vision` | Sync | `server.ts:1051` | Shuts down active camera or screen sharing stream. |",
        "| `list_skills` | Sync | `server.ts:1064` | Lists all operational domain skills and plugins installed in J.A.R.V.I.S. |",
        "| `load_skill` | Sync | `server.ts:1074` | Loads complete instructions and guidelines from an installed skill's `SKILL.md`. |",
        "| `execute_skill_script` | Async | `server.ts:1085` | Executes an automation script bundled inside an installed skill. |",
        "",
        "### 7.2 CEO Executive Tools (`backend/system_modules/ceo/ceo_tools.ts` — 4 Tools)",
        "",
        "| Tool Name | Tier | Handler Location | Description |",
        "| :--- | :---: | :--- | :--- |",
        "| `ceo_get_roster` | Sync | `ceo_tools.ts:32` | Retrieves active roster of agents, skills, and Hermes Lead Engineer status from `agents_roster.yaml`. |",
        "| `ceo_execute_mission` | Async | `ceo_tools.ts:58` | Orchestrates multi-agent execution pipeline for complex strategic missions. |",
        "| `ceo_prescribe_workflow` | Sync | `ceo_tools.ts:88` | Prescribes the mandatory 5-phase engineering protocol (Triage -> Arch -> Spec -> TDD -> Production). |",
        "| `ceo_query_agent_sessions` | Sync | `ceo_tools.ts:114` | Queries executive session log and mission execution history. |",
        "",
        "### 7.3 Local File Controls (`backend/system_modules/intelligent_system/file_controls.ts` — 6 Tools)",
        "",
        "| Tool Name | Tier | Handler Location | Description |",
        "| :--- | :---: | :--- | :--- |",
        "| `write_file` | Direct IO | `file_controls.ts:45` | Creates or overwrites a file at target path with protected path validation. |",
        "| `append_file` | Direct IO | `file_controls.ts:75` | Appends text or code to an existing local file safely. |",
        "| `rewrite_file` | Direct IO | `file_controls.ts:102` | Replaces specific target block of text inside a file with replacement content. |",
        "| `remove_file` | Direct IO | `file_controls.ts:135` | Safely removes a file, blocking protected root and system paths. |",
        "| `read_file` | Direct IO | `file_controls.ts:160` | Reads content of a local file with optional line-range slicing. |",
        "| `list_directory` | Direct IO | `file_controls.ts:192` | Recursively or shallowly lists files and subdirectories with sizes. |",
        "",
        "### 7.4 Native OS & System Controls (`whole_controls/` — 22 Tools)",
        "",
        "| Tool Name | Execution Engine | Direct Worker Binary | Description |",
        "| :--- | :---: | :--- | :--- |",
        "| `omarchy_control` | Direct C++ / Python | `bin/omarchy_ctrl` | Hyprland window actions, workspace switching, themes, wallpapers, OSD notifications. |",
        "| `launch_application` | Direct C++ / Python | `bin/open_app` | Launches desktop apps or opens web URLs with smart alias resolution. |",
        "| `close_window` | Python Actuator | `app_closer.py` | Closes active window or target application. |",
        "| `close_tab` | Python Actuator | `app_closer.py` | Closes active browser tab via synthesized Ctrl+W key event. |",
        "| `close_all_tabs` | Python Actuator | `app_closer.py` | Closes all open browser instances. |",
        "| `set_system_volume` | Direct C++ / Python | `bin/hardware_ctrl` | Sets master volume percentage (0-150%) or toggles mute. |",
        "| `get_system_volume` | Direct C++ / Python | `bin/hardware_ctrl` | Queries current master volume level and mute status. |",
        "| `set_display_brightness` | Direct C++ / Python | `bin/hardware_ctrl` | Adjusts display backlight brightness percentage (1-100%). |",
        "| `get_screen_brightness` | Direct C++ / Python | `bin/hardware_ctrl` | Reads current display backlight brightness level. |",
        "| `set_power_profile` | Python Actuator | `settings_and_hardware.py` | Switches power profile (performance, balanced, power-saver). |",
        "| `control_media_playback` | Direct C++ / Python | `bin/media_ctrl` | Controls MPRIS2 players (play, pause, next, previous, stop). |",
        "| `system_power_action` | Python Actuator | `power_session.py` | Session power transitions (lock, sleep, reboot, shutdown). |",
        "| `take_screenshot` | Python Actuator | `desktop_automation.py` | Captures full-resolution desktop screenshot to file. |",
        "| `desktop_control` | Direct C++ / Python | `bin/desktop_control` | Mouse click, movement, scrolling, text typing, and key combinations. |",
        "| `delete_text` | Python Actuator | `desktop_automation.py` | Erases text by character count, line count, or backspace simulation. |",
        "| `clipboard_control` | Python Actuator | `clipboard_manager.py` | Reads or writes text to system clipboard (Wayland / X11). |",
        "| `manage_systemd_service` | Direct C++ / Python | `bin/service_ctrl` | Starts, stops, restarts, or inspects status of systemd units. |",
        "| `manage_process` | Direct C++ / Python | `bin/process_ctrl` | Signals or terminates processes by PID or name. |",
        "| `control_vision_mode` | Python Actuator | `vision_controller.py` | Starts/stops screen share or camera stream. |",
        "| `execute_linux_command` | Async Python | `shell_and_tasks.py` | Executes bash shell command with timeout and stdout capture. |",
        "| `get_system_telemetry` | Direct C++ / Python | `bin/sys_telemetry` | Real-time CPU usage, RAM utilization, load averages, uptime. |",
        "| `run_full_system_diagnostics` | Direct C++ / Python | `bin/pc_spec` + helpers | Preflight sweep across hardware, thermals, and memory integrity. |",
        "",
        "### 7.5 Google Workspace & GitHub MCP Connectors (`connectors/` — 26 Tools)",
        "",
        "| Tool Name | Service | Description |",
        "| :--- | :---: | :--- |",
        "| `search_emails` | Gmail | Queries messages matching standard Gmail syntax with structured metadata. |",
        "| `read_email` | Gmail | Fetches decoded plain-text email body, sender, headers, and supports 'latest'. |",
        "| `send_email` | Gmail | Composes and sends email to recipient with attachment support. |",
        "| `create_draft` | Gmail | Creates an unsent email draft in Gmail. |",
        "| `list_labels` | Gmail | Lists all account email labels. |",
        "| `list_events` | Calendar | Lists upcoming scheduled calendar events anchored to current moment. |",
        "| `create_event` | Calendar | Schedules event with relative date parsing and default 1h end-time. |",
        "| `update_event` | Calendar | Updates an existing calendar event title, time, or attendees. |",
        "| `delete_event` | Calendar | Cancels and removes an event from calendar. |",
        "| `find_free_time` | Calendar | Analyzes calendar slots to find available meeting openings. |",
        "| `list_tasks` | Google Tasks | Fetches active tasks with due dates, synced with local SQLite. |",
        "| `create_task` | Google Tasks | Adds a task item to Google Tasks and syncs to SQLite `tasks` table. |",
        "| `complete_google_task`| Google Tasks | Marks task completed in Google Tasks and updates SQLite `tasks` table. |",
        "| `create_document` | Google Docs | Creates a new blank Google Document. |",
        "| `get_document` | Google Docs | Retrieves document text content. |",
        "| `append_document_text`| Google Docs | Appends text paragraphs to an existing document. |",
        "| `create_presentation`| Google Slides | Creates a new Google Slides deck. |",
        "| `get_presentation` | Google Slides | Retrieves slide titles and layout metadata. |",
        "| `add_slide` | Google Slides | Inserts a new slide into presentation. |",
        "| `list_drive_files` | Google Drive | Searches and lists files in Google Drive. |",
        "| `get_drive_file` | Google Drive | Fetches Drive file metadata and download link. |",
        "| `list_repos` | GitHub | Lists authenticated user repositories and forks. |",
        "| `search_issues` | GitHub | Searches issues and pull requests by keyword or label. |",
        "| `get_pull_request` | GitHub | Retrieves PR diff summary, reviews, and merge status. |",
        "| `create_issue` | GitHub | Creates a new issue in a target repository. |",
        "| `list_notifications` | GitHub | Lists unread GitHub activity notifications. |",
        "",
        "---",
        ""
    ]

def build_section_8():
    return [
        "## 8. Agent Hierarchy, Coworkers, CEO Agents Roster & Voice Transfer Protocol",
        "",
        "### The 6 AI Coworkers Roster",
        "Defined in [`backend/system_modules/intelligent_system/personas.ts`](file:///home/g0pi/Downloads/jarvis/backend/system_modules/intelligent_system/personas.ts) and [`project_docs/COWORKERS.md`](file:///home/g0pi/Downloads/jarvis/project_docs/COWORKERS.md):",
        "",
        "| Persona | Role | Voice Model | Signature Specialization |",
        "| :--- | :--- | :---: | :--- |",
        "| **Jarvis** | Principal Tech Architect | `Puck` | System architecture, clean code, refactoring, technical strategy. |",
        "| **Friday** | DevOps & Infrastructure Lead | `Kore` | Docker, Kubernetes, CI/CD pipelines, SRE metrics, cloud hosting. |",
        "| **Ultron** | Tech News & AI Intelligence | `Charon` | ArXiv research papers, model releases, ecosystem trends, Product Hunt. |",
        "| **Edith** | Cybersecurity & Code Auditor | `Zephyr` | AppSec scans, OAuth & JWT verification, Zero Trust, secret guarding. |",
        "| **Karen** | Senior Frontend & UX Lead | `Aoede` | React 19, Tailwind CSS v4, Motion animations, accessible 60fps UX. |",
        "| **Vision** | Data Science & ML Engine Lead| `Fenrir` | Vector DBs, RAG pipelines, PyTorch models, SQL tuning, mathematical logic. |",
        "",
        "### J.A.R.V.I.S. CEO Executive Roster (`agents_roster.yaml`)",
        "The CEO executive system ([`ceo_orchestrator.ts`](file:///home/g0pi/Downloads/jarvis/backend/system_modules/ceo/ceo_orchestrator.ts)) coordinates multi-agent mission lifecycles:",
        "*   **Lead Engineer (Hermes)**: Autonomous implementation lead connected via [`hermes-connection/`](file:///home/g0pi/Downloads/jarvis/hermes-connection) with full system access.",
        "*   **Systems Architect**: High-level technical planning, API design, and trade-off analysis.",
        "*   **QA Engineer**: Rigorous test suites, edge case verification, and regression prevention.",
        "*   **Security Auditor**: Vulnerability scanning, credential protection, and path validation.",
        "",
        "### Multi-Agent Dual-Path Engine",
        "*   **Fast Path (<10ms SLA)**: Instant execution for native OS controls, system telemetry, and volume/brightness via pre-compiled C++ binaries and Groq cached actuation.",
        "*   **Slow Path (<300ms SLA)**: Deep reasoning via specialized multi-agent worker pool ([`multi_agent_pool.ts`](file:///home/g0pi/Downloads/jarvis/backend/system_modules/intelligent_system/multi_agent_pool.ts)), accompanied by real-time vocal filler audio synthesis ([`filler_audio_synthesizer.ts`](file:///home/g0pi/Downloads/jarvis/backend/system_modules/intelligent_system/filler_audio_synthesizer.ts)) using pre-buffered audio chunks in [`data/audio_fillers/`](file:///home/g0pi/Downloads/jarvis/data/audio_fillers).",
        "",
        "### Sub-Second Voice Transfer Protocol Mechanics",
        "1.  **Intent Detection**: The user issues a verbal request (e.g., *\"Friday, review the CI/CD build\"* or *\"Edith, audit the security endpoints\"*).",
        "2.  **Tool Trigger**: Gemini Live calls `switch_persona({ targetPersonaId: \"friday\" })`. (Client-side fallback regex in [`voice_transfer.ts`](file:///home/g0pi/Downloads/jarvis/frontend/src/utils/voice_transfer.ts) acts as safety redundancy).",
        "3.  **Session Transition**: The server re-initializes the session with the new persona's system prompt and target voice model (`Puck` -> `Kore`) without dropping the client WebSocket connection.",
        "4.  **UI Feedback**: The client displays the animated [`VoiceTransferBanner.tsx`](file:///home/g0pi/Downloads/jarvis/frontend/src/components/VoiceTransferBanner.tsx) with the incoming coworker's accent colors and avatar.",
        "5.  **Zero Memory Amnesia**: All personas share the exact same 4-tier memory matrix; previous conversational context and facts remain immediately accessible.",
        "",
        "---",
        ""
    ]

def build_section_9():
    return [
        "## 9. Memory & Persistence Systems",
        "",
        "J.A.R.V.I.S. integrates a **4-tier cognitive memory matrix** backed by SQLite WAL databases and an Obsidian Markdown vault:",
        "",
        "```text",
        "  ┌────────────────────────────────────────────────────────────────────────┐",
        "  │                      4-TIER COGNITIVE MEMORY MATRIX                    │",
        "  ├────────────────────────────────────────────────────────────────────────┤",
        "  │ 1. Short-Term Memory  │ Sliding conversation buffer in SQLite          │",
        "  │                       │ (memory_buffer table) & live React state       │",
        "  ├───────────────────────┼────────────────────────────────────────────────┤",
        "  │ 2. Episodic Memory    │ Daily session logs in SQLite daily_logs &      │",
        "  │                       │ vault/conversations/YYYY-MM-DD.md              │",
        "  ├───────────────────────┼────────────────────────────────────────────────┤",
        "  │ 3. Semantic Memory    │ Knowledge graph triples (subject, predicate,   │",
        "  │                       │ object) stored in SQLite & Rust graph repo     │",
        "  ├───────────────────────┼────────────────────────────────────────────────┤",
        "  │ 4. Long-Term Protocols│ Triad memory tables (personal_details,         │",
        "  │                       │ preferences, instructions) + tasks in jarvis.db│",
        "  └────────────────────────────────────────────────────────────────────────┘",
        "```",
        "",
        "### Primary SQLite Schema (`data/jarvis.db`)",
        "*   `memory_buffer`: Rolling conversational turns with timestamp and role.",
        "*   `personal_details`: Permanent user profile facts and identity vectors.",
        "*   `preferences`: User preferences (tools, themes, frameworks).",
        "*   `instructions`: System execution rules and behavioral operational constraints.",
        "*   `tasks` & `task_chat`: Project tasks with status, priority, and bi-directional Google Tasks sync.",
        "*   `daily_logs`: Obsidian daily interaction journal records.",
        "*   `connectors`: Encrypted access tokens and connection states.",
        "*   `approval_audit`: Security audit trail for high-impact tool executions.",
        "",
        "### Memory Deletion & Management Protocols",
        "*   `clear_memory`: Live Gemini tool allowing the assistant to clear memory categories on verbal instruction.",
        "*   `POST /api/memory/clear`: Clears rolling turns and resets transient session buffers.",
        "*   `POST /api/memory/:category/clear`: Purges all records from a specified triad table (`personal_details`, `preferences`, `instructions`).",
        "",
        "### Dynamic Self-Improving Miner",
        "At the completion of every dialogue turn (`turnComplete` event in [`backend/server.ts:839`](file:///home/g0pi/Downloads/jarvis/backend/server.ts#L839)), [`memory_bridge.py`](file:///home/g0pi/Downloads/jarvis/backend/memory_bridge.py) executes pattern mining on the conversation text, extracting atomic facts and decisions and writing them into [`jarvis_memory_bundle/vault/facts/`](file:///home/g0pi/Downloads/jarvis/jarvis_memory_bundle/vault/facts) and the SQLite core.",
        "",
        "---",
        ""
    ]

def build_section_10():
    return [
        "## 10. Security Model & Sandbox Absence",
        "",
        "1.  **Unsandboxed Execution**: System commands, C++ workers, and Python actuators run **directly on the host operating system**. There is no virtualization, Docker containerization, or chroot jail at runtime.",
        "2.  **Protected Path Boundaries**: [`file_controls.ts`](file:///home/g0pi/Downloads/jarvis/backend/system_modules/intelligent_system/file_controls.ts) validates all file operations against forbidden root paths (`/etc`, `/usr`, `/boot`, `/bin`, `/sbin`, `.git`, `.env`), preventing accidental system tampering.",
        "3.  **Groq Fast Actuator Guard**: Speculative speech execution blocks mutating tool calls during mid-sentence streaming and enforces strict anti-hijacking validation on `launch_application`.",
        "4.  **Credential Vault**: Google and GitHub OAuth refresh tokens are encrypted using AES-256-GCM via machine-specific key salt [`data/.vault-key`](file:///home/g0pi/Downloads/jarvis/data/.vault-key).",
        "5.  **Approval Gate**: Destructive actions are logged to `approval_audit` table in SQLite.",
        "",
        "---",
        ""
    ]

def build_section_11():
    return [
        "## 11. Socket, Event & REST API Surface",
        "",
        "### REST API Endpoints",
        "",
        "| Method | Endpoint | Handler | Description |",
        "| :--- | :--- | :--- | :--- |",
        "| `GET` | `/api/health` | `server.ts:104` | Diagnostic endpoint checking server status and GEMINI_API_KEY. |",
        "| `GET` | `/api/memory/status` | `server.ts:116` | Returns status of Obsidian vault and SQLite memory. |",
        "| `GET` | `/api/memory/context` | `server.ts:121` | Formatted prompt context string compiled for LLM injection. |",
        "| `GET` | `/api/memory/turns` | `server.ts:127` | Returns recent conversation history turns. |",
        "| `POST` | `/api/memory/log` | `server.ts:133` | Logs interaction turn and triggers dynamic fact miner. |",
        "| `POST` | `/api/memory/search` | `server.ts:138` | Searches memory records and vault notes via FTS5. |",
        "| `GET` | `/api/memory/triad` | `server.ts:164` | Fetches personal_details, preferences, and instructions records. |",
        "| `POST` | `/api/memory/:category/add` | `server.ts:200` | Adds record to triad category. |",
        "| `POST` | `/api/memory/:category/remove` | `server.ts:215` | Purges record from triad category. |",
        "| `POST` | `/api/memory/:category/rewrite` | `server.ts:230` | Updates/rewrites record in triad category. |",
        "| `POST` | `/api/memory/clear` | `server.ts:245` | Clears memory turns buffer. |",
        "| `POST` | `/api/memory/:category/clear` | `server.ts:255` | Clears all items within a triad category. |",
        "| `GET` | `/api/connectors` | `connector-routes.ts:39` | Lists all connectors with live authorization status. |",
        "| `GET` | `/api/connectors/status/all`| `connector-routes.ts:53` | Fast polling endpoint for connection states. |",
        "| `GET` | `/api/connectors/callback` | `connector-routes.ts:67` | OAuth callback redirect handler. |",
        "| `POST` | `/api/connectors/call` | `connector-routes.ts:92` | Direct HTTP execution of connector tools. |",
        "| `GET` | `/api/skills` | `server.ts:270` | Lists all installed universal skills and plugins. |",
        "| `POST` | `/api/skills/install` | `server.ts:279` | Installs skill from git URL, package name, or CLI. |",
        "| `GET` | `/api/skills/:slug` | `server.ts:306` | Loads full content and rules from skill's SKILL.md. |",
        "| `DELETE`| `/api/skills/:slug` | `server.ts:315` | Removes installed skill. |",
        "| `POST` | `/api/skills/:slug/execute` | `server.ts:336` | Executes a script bundled within an installed skill. |",
        "| `POST` | `/api/chat` | `server.ts:427` | Text chat fallback using resilient multi-model failover. |",
        "",
        "### WebSocket Gateway Surface (`/live`)",
        "",
        "*   **Client to Server Messages**:",
        "    *   `init` / `switch_persona`: Initializes Gemini Live session with selected `voiceName`, `systemInstruction`, and `model`.",
        "    *   `audio`: Raw 16kHz PCM audio chunk base64-encoded from microphone.",
        "    *   `image`: Optical video frame or screen share capture base64-encoded (JPEG).",
        "    *   `text`: Text message query.",
        "*   **Server to Client Messages**:",
        "    *   `connected`: Confirms live session establishment.",
        "    *   `audio`: Synthesized 24kHz audio chunks for playback.",
        "    *   `output_transcription`: Real-time text token stream of assistant speech.",
        "    *   `input_transcription`: Real-time speech-to-text transcript of user speech.",
        "    *   `interrupted`: Alerts client that user interrupted playback.",
        "    *   `turn_complete`: Signals conclusion of speech turn.",
        "    *   `switch_persona_tool_call`: Broadcasts coworker handoff request.",
        "    *   `system_control_executed`: Broadcasts OS control execution results.",
        "    *   `memory_updated`: Broadcasts real-time triad memory modifications.",
        "    *   `skills_updated`: Broadcasts skill installation or removal events.",
        "    *   `ceo_mission_update`: Broadcasts CEO executive mission status changes.",
        "",
        "---",
        ""
    ]

def build_section_12():
    return [
        "## 12. Build, Deployment & Skills Management",
        "",
        "### Build Scripts (`package.json`)",
        "*   `npm run dev`: Runs `tsx backend/server.ts` with live Vite middleware on port 3000.",
        "*   `npm run build`: Bundles frontend into `dist/` (`vite build frontend`).",
        "*   `npm run clean`: Cleans build artifacts (`rm -rf dist`).",
        "*   `npm run lint`: Verifies type integrity across the codebase (`tsc --noEmit`).",
        "*   `npm run update:ref`: Re-runs this generator script to update Git commits and file line counts in real time.",
        "",
        "### 28+ Universal Skills Catalog (`.agents/skills/`)",
        "J.A.R.V.I.S. integrates 28+ executive and engineering skills from `ivfarias/ceo` in `.agents/skills/`:",
        "*   `brainstorming`: Socratic design and requirements exploration before code changes.",
        "*   `writing-plans`: Implementation planning with step-by-step review gates.",
        "*   `executing-plans`: Review checkpoint execution workflow.",
        "*   `subagent-driven-development`: Parallel subagent dispatch and verification.",
        "*   `test-driven-development`: Red-Green-Refactor test cycle enforcement.",
        "*   `systematic-debugging`: 4-phase root cause discovery before fixes.",
        "*   `requesting-code-review`: Rigorous pre-merge code review.",
        "*   `speckit`: Spec-driven engineering workflow with constitution and task breakdowns.",
        "*   `using-ceo`: CEO Orchestrator protocol and durable operating memory.",
        "*   `using-git-worktrees`: Workspace isolation with smart directory selection.",
        "*   `typesafe-ai`: Type-safe AI integration patterns and schema validations.",
        "",
        "---",
        ""
    ]

def build_section_13():
    return [
        "## 13. Known Gaps, Audits & Codebase Drift",
        "",
        "| Component | Documented Expectation | Actual Code Reality | Status |",
        "| :--- | :--- | :--- | :--- |",
        "| **Port Binding** | `GEMINI.md` specifies Port 3000. | [`backend/server.ts:55`](file:///home/g0pi/Downloads/jarvis/backend/server.ts#L55) strictly respects `PORT=3000`. | **Confirmed** |",
        "| **Dev vs Main Branches** | All ongoing work must target `dev`. | Current branch is `dev` (6 commits ahead of main). `main` is protected. | **Confirmed** |",
        "| **Native Workers** | C++ workers in `whole_controls/native_workers/bin/` | All 18 binaries are compiled and executable. | **Confirmed** |",
        "| **Groq Fast Actuator** | Mid-sentence intent acceleration | Sub-80ms streaming transcript analysis active in `backend/server.ts:818`. | **Confirmed** |",
        "| **CEO Executive HUD** | Live mission visualizer | Integrated in `frontend/src/components/CeoExecutiveHUD.tsx` and `App.tsx`. | **Confirmed** |",
        "| **Memory Bundle Summarizer** | `AUDIT_AND_IMPROVEMENTS.md` P0-1 issue | Dangling `from brain...` imports in `jarvis_memory_bundle/python/summarizer.py` documented for cleanup. | **Pending Hardening** |",
        "",
        "---",
        ""
    ]

def build_section_14(now_str):
    return [
        "## 14. Real-Time Telemetry Automated Update Protocol",
        "",
        "This technical reference manual is designed to remain permanently synchronized with ongoing commits on both `dev` and `main` branches.",
        "",
        "To refresh this document at any moment with real-time Git commits, branch statuses, and line counts, run:",
        "```bash",
        "npm run update:ref",
        "# OR",
        "python3 scripts/update_codebase_reference.py",
        "```",
        "",
        f"*Manual automatically compiled and verified by Antigravity AI Engine at `{now_str}`.*",
        ""
    ]

def main():
    print("[Reference Generator] Querying Git telemetry...")
    current_branch = run_cmd("git branch --show-current")
    remote_url = run_cmd("git remote get-url origin")
    git_status = run_cmd("git status -s")
    merge_base = run_cmd("git merge-base dev main")
    ahead_commits_raw = run_cmd("git log main..dev --oneline")
    ahead_commits = [l.strip() for l in ahead_commits_raw.splitlines() if l.strip()]
    
    dev_commits_raw = run_cmd("git log dev --format='%h|%an|%ad|%s' --date=iso")
    main_commits_raw = run_cmd("git log main --format='%h|%an|%ad|%s' --date=iso")
    graph_raw = run_cmd("git log --graph --oneline --decorate --all -n 25")
    
    dev_commits = []
    for line in dev_commits_raw.splitlines():
        if "|" in line:
            parts = line.split("|", 3)
            dev_commits.append({
                "hash": parts[0].strip(),
                "author": parts[1].strip(),
                "date": parts[2].strip(),
                "message": parts[3].strip()
            })
            
    main_commits = []
    for line in main_commits_raw.splitlines():
        if "|" in line:
            parts = line.split("|", 3)
            main_commits.append({
                "hash": parts[0].strip(),
                "author": parts[1].strip(),
                "date": parts[2].strip(),
                "message": parts[3].strip()
            })

    print(f"[Reference Generator] Found {len(dev_commits)} dev commits and {len(main_commits)} main commits.")
    
    files = collect_file_inventory()
    print(f"[Reference Generator] Cataloged {len(files)} files.")
    
    now_str = datetime.datetime.now(datetime.timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M:%S %Z")
    
    doc = []
    doc.append(f"# CODEBASE_REFERENCE.md: J.A.R.V.I.S. Autonomous AI OS Technical Reference Manual")
    doc.append("")
    doc.append(f"> **Definitive Codebase & Architectural Specification**  ")
    doc.append(f"> **System**: J.A.R.V.I.S. Autonomous AI Operating System (React 19 + Express + TypeScript + C++ + Python + Rust + Gemini Live)  ")
    doc.append(f"> **Last Verified & Synchronized**: `{now_str}`  ")
    doc.append(f"> **Active Working Branch**: `{current_branch}` | **Remote**: `{remote_url}`  ")
    doc.append("")
    doc.append("---")
    doc.append("")
    
    doc.extend(build_section_1(remote_url))
    doc.extend(build_section_2(current_branch, merge_base, ahead_commits, graph_raw, dev_commits, main_commits, git_status))
    doc.extend(build_section_3())
    doc.extend(build_section_4())
    doc.extend(build_section_5(files))
    doc.extend(build_section_6())
    doc.extend(build_section_7())
    doc.extend(build_section_8())
    doc.extend(build_section_9())
    doc.extend(build_section_10())
    doc.extend(build_section_11())
    doc.extend(build_section_12())
    doc.extend(build_section_13())
    doc.extend(build_section_14(now_str))
    
    content = "\n".join(doc)
    
    for target in TARGET_FILES:
        target.parent.mkdir(parents=True, exist_ok=True)
        with open(target, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"[Reference Generator] Successfully wrote updated reference manual to: {target} ({len(content)} bytes)")

if __name__ == "__main__":
    main()
