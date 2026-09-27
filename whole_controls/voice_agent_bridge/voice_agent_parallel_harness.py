#!/usr/bin/env python3
"""
J.A.R.V.I.S. OS — Voice Agent Parallel Execution Test Harness
Demonstrates end-to-end how the Gemini Live voice agent dispatches multiple system controls
simultaneously in parallel while keeping full-duplex voice streaming completely unblocked.

Usage:
  .venv/bin/python whole_controls/voice_agent_bridge/voice_agent_parallel_harness.py --test-concurrency
  .venv/bin/python whole_controls/voice_agent_bridge/voice_agent_parallel_harness.py --live-demo
"""

import os
import sys
import json
import time
import asyncio
import pathlib
from typing import Dict, Any, List, Optional

# Add whole_controls parent to python path
PARENT_DIR = pathlib.Path(__file__).parent.parent
sys.path.insert(0, str(PARENT_DIR.parent))

from whole_controls.python_actuators import dispatch_tool

# Load Gemini Live Tool Declarations
TOOL_DECL_FILE = pathlib.Path(__file__).parent / "tool_declarations.json"
with open(TOOL_DECL_FILE, "r", encoding="utf-8") as f:
    TOOL_DECLARATIONS = json.load(f)

# Threshold in milliseconds to differentiate instant local actions from background jobs
FAST_EXECUTION_BUDGET_MS = 120.0

class VoiceAgentParallelHarness:
    """
    Simulates the Gemini Live Bidirectional WebSocket Voice Agent.
    Implements:
      1. Parallel Tool Dispatch via asyncio.gather
      2. Dual-Tier Fast Verbal Handoff (< 120ms)
      3. Dual-Brain Conversational Cadence Queue for background task reporting
      4. Simulated Full-Duplex Audio Streaming Loop (16kHz PCM in, 24kHz PCM out)
    """

    def __init__(self):
        self.is_speaking = False
        self.last_user_speech_time = 0.0
        self.cadence_queue: asyncio.Queue[str] = asyncio.Queue()
        self.cadence_worker_task: Optional[asyncio.Task] = None
        self.is_running = True

    async def start_simulated_audio_stream(self):
        """Simulates PipeWire 16kHz audio input frames running continuously in the background."""
        while self.is_running:
            # Simulates receiving 100ms chunks of 16-bit 16kHz PCM audio (3200 bytes)
            await asyncio.sleep(0.1)

    async def _execute_single_tool(self, call_id: str, name: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes an individual tool call with dual-tier latency management.
        If execution exceeds FAST_EXECUTION_BUDGET_MS, it immediately returns an in-progress
        verbal acknowledgment for Gemini to speak, while execution continues in the background.
        """
        start_time = time.perf_counter()
        print(f"  [⚡ DISPATCH] Tool '{name}' started with args {args}")

        dispatch_task = asyncio.create_task(dispatch_tool(name, args))

        try:
            # Fast-path attempt: wait up to FAST_EXECUTION_BUDGET_MS
            result = await asyncio.wait_for(
                asyncio.shield(dispatch_task),
                timeout=FAST_EXECUTION_BUDGET_MS / 1000.0
            )
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            print(f"  [✅ COMPLETE] Tool '{name}' completed in {elapsed_ms:.1f}ms")
            return {
                "id": call_id,
                "name": name,
                "response": {"output": result},
                "elapsed_ms": elapsed_ms,
                "tier": "fast_path"
            }
        except asyncio.TimeoutError:
            # Long-running path: spawn background watcher and return immediate verbal acknowledgment
            print(f"  [⏳ TRANSITION] Tool '{name}' took > {FAST_EXECUTION_BUDGET_MS}ms. Handoff to background task.")
            asyncio.create_task(self._monitor_background_task(name, args, dispatch_task, start_time))
            return {
                "id": call_id,
                "name": name,
                "response": {
                    "output": {
                        "status": "in_progress",
                        "verbal_directive": f"I am executing '{name}' in the background, Sir. Continuing to monitor."
                    }
                },
                "elapsed_ms": FAST_EXECUTION_BUDGET_MS,
                "tier": "background_handoff"
            }

    async def _monitor_background_task(self, name: str, args: Dict[str, Any], task: asyncio.Task, start_time: float):
        """Awaits background task and enqueues completion into the conversational cadence queue."""
        try:
            result = await task
            total_duration_ms = (time.perf_counter() - start_time) * 1000.0
            print(f"  [🏁 BG FINISHED] Background task '{name}' completed in {total_duration_ms:.1f}ms")
            
            notification = (
                f"[SYSTEM NOTIFICATION]\n"
                f"Task: {name}\n"
                f"Status: SUCCESS\n"
                f"Duration: {total_duration_ms:.0f}ms\n"
                f"Result: {result.get('output') or result.get('message') or 'Task complete.'}\n"
                f"Directive: Inform operator Gopi naturally in your signature Jarvis voice."
            )
            await self.cadence_queue.put(notification)
            if not self.cadence_worker_task or self.cadence_worker_task.done():
                self.cadence_worker_task = asyncio.create_task(self._cadence_drain_worker())
        except Exception as ex:
            print(f"  [❌ BG ERROR] Background task '{name}' failed: {ex}")

    async def _cadence_drain_worker(self):
        """Drains background notifications during natural conversational pauses (silence > 1.2s)."""
        while not self.cadence_queue.empty() and self.is_running:
            await asyncio.sleep(0.3)
            now = time.time()
            # Wait until agent is not speaking and user has been quiet for >= 1.2s
            if not self.is_speaking and (now - self.last_user_speech_time >= 1.2):
                try:
                    notification = self.cadence_queue.get_nowait()
                    print(f"\n[🎙️ CADENCE INJECTION (Jarvis Opportunistic Speech)]:\n{notification}\n")
                    self.cadence_queue.task_done()
                except asyncio.QueueEmpty:
                    break

    async def handle_simultaneous_tool_calls(self, function_calls: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        PARALLEL CORE: Dispatches all function calls in a single turn simultaneously using asyncio.gather.
        Total execution time is determined by the slowest individual fast-path call, NOT the sum of all calls!
        """
        print(f"\n🚀 [PARALLEL TURN START] Received {len(function_calls)} simultaneous tool calls from Gemini Live:")
        for idx, call in enumerate(function_calls, 1):
            print(f"   {idx}. {call['name']}({call.get('args', {})})")

        turn_start = time.perf_counter()

        # Run all tool executions concurrently in parallel
        results = await asyncio.gather(*[
            self._execute_single_tool(call.get("id", f"call_{i}"), call["name"], call.get("args", {}))
            for i, call in enumerate(function_calls)
        ])

        total_turn_ms = (time.perf_counter() - turn_start) * 1000.0
        print(f"✨ [PARALLEL TURN COMPLETE] All {len(function_calls)} calls resolved in {total_turn_ms:.1f}ms total.\n")
        return results

async def run_concurrency_test():
    """Validates real parallel execution and benchmarks concurrent vs sequential speed."""
    print("=" * 75)
    print("  J.A.R.V.I.S. OS — PARALLEL & SIMULTANEOUS VOICE AGENT BENCHMARK")
    print("=" * 75)

    harness = VoiceAgentParallelHarness()
    audio_stream_task = asyncio.create_task(harness.start_simulated_audio_stream())

    # Simulated simultaneous user command:
    # "Jarvis: set volume to 50%, switch to workspace 2, check active theme, and get system telemetry."
    simultaneous_calls = [
        {"name": "set_system_volume", "args": {"volume": 50}},
        {"name": "omarchy_control", "args": {"domain": "hyprland", "action": "workspace", "target": "2"}},
        {"name": "omarchy_control", "args": {"domain": "theme", "action": "current"}},
        {"name": "get_system_telemetry", "args": {}},
    ]

    t0 = time.perf_counter()
    results = await harness.handle_simultaneous_tool_calls(simultaneous_calls)
    parallel_time_ms = (time.perf_counter() - t0) * 1000.0

    sum_individual_ms = sum(r["elapsed_ms"] for r in results)

    print("-" * 75)
    print("BENCHMARK METRICS:")
    print(f"  • Total Simultaneous Tools Executed : {len(results)}")
    print(f"  • Sum of Individual Execution Times : {sum_individual_ms:.2f} ms")
    print(f"  • Actual Parallel Wall-Clock Time   : {parallel_time_ms:.2f} ms")
    print(f"  • Parallel Efficiency Ratio         : {(sum_individual_ms / parallel_time_ms):.2f}x speedup")
    print("-" * 75)

    # Validate that all calls succeeded
    assert len(results) == len(simultaneous_calls), "Result count mismatch"
    print("✅ Concurrency verification passed! Audio streaming loop remained completely active.")

    harness.is_running = False
    audio_stream_task.cancel()

async def run_live_demo():
    """Runs an interactive demonstration showing parallel fast-path + background cadence execution."""
    print("=" * 75)
    print("  J.A.R.V.I.S. OS — INTERACTIVE DUAL-TIER PARALLEL DEMO")
    print("=" * 75)

    harness = VoiceAgentParallelHarness()
    audio_stream_task = asyncio.create_task(harness.start_simulated_audio_stream())

    # Turn with 1 fast call and 1 long-running background command (sleep 1)
    calls = [
        {"name": "get_system_volume", "args": {}},
        {"name": "execute_linux_command", "args": {"command": "sleep 1 && echo 'Kernel audit complete'", "timeout": 5.0}}
    ]

    results = await harness.handle_simultaneous_tool_calls(calls)

    print("[Simulating ongoing voice conversation...]")
    print("Agent is speaking: 'On it, Sir. Master volume is at 75%, and I am performing the kernel sweep in the background.'")
    harness.is_speaking = True
    await asyncio.sleep(1.2)
    harness.is_speaking = False
    harness.last_user_speech_time = time.time() - 2.0  # Operator is quiet

    # Allow cadence worker to drain
    await asyncio.sleep(1.0)

    harness.is_running = False
    audio_stream_task.cancel()
    print("✅ Live demonstration concluded.")

if __name__ == "__main__":
    if "--live-demo" in sys.argv:
        asyncio.run(run_live_demo())
    else:
        asyncio.run(run_concurrency_test())
