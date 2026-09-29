"""
Hermes CLI Bridge for J.A.R.V.I.S. OS.
Enables headless, non-blocking asynchronous task delegation to the Hermes agent CLI.
Handles query file management, process execution, timeout guarantees, and output sanitization.
"""

import os
import re
import time
import asyncio
import subprocess
from typing import Dict, Any, Optional, Tuple

try:
    from .config import DEFAULT_CONFIG, HermesConfig
except (ImportError, ValueError):
    from config import DEFAULT_CONFIG, HermesConfig

ANSI_ESCAPE = re.compile(r'\x1b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
OMH_TOOLSET_WARN = re.compile(r"Warning:\s*Unknown toolsets:\s*omh", re.IGNORECASE)


def clean_hermes_output(raw: str) -> Tuple[str, Optional[str]]:
    """
    Sanitize raw output from Hermes CLI execution.
    Strips ANSI color/escape codes, toolset warnings, internal cache notices,
    and extracts session ID if present.
    """
    # Strip ANSI escape sequences
    clean_raw = ANSI_ESCAPE.sub('', raw)
    lines = clean_raw.splitlines()
    session_id = None
    kept = []

    for line in lines:
        if OMH_TOOLSET_WARN.search(line):
            continue
        if "found but has no messages. Starting fresh" in line:
            continue
        if "Loaded cached tools" in line:
            continue
        sid_match = re.match(r"^\s*session_id:\s*(\S+)", line, re.IGNORECASE)
        if sid_match:
            session_id = sid_match.group(1)
            continue
        # Extract direct response after hermes box divider if present
        if "┊" in line:
            parts = line.split("┊", 1)
            if len(parts) > 1 and parts[1].strip():
                kept.append(parts[1].strip())
                continue
        kept.append(line)

    result_text = "\n".join(kept).strip()
    return result_text, session_id


async def exec_hermes(
    prompt: str,
    timeout: Optional[float] = None,
    max_turns: Optional[int] = None,
    yolo: Optional[bool] = None,
    session_name: Optional[str] = None,
    config: Optional[HermesConfig] = None,
) -> Dict[str, Any]:
    """
    Execute a single delegated task against Hermes asynchronously and headlessly.
    Passes prompt via temporary query file to prevent shell escape issues and memory leaks.

    Returns:
        Dict with keys:
            success (bool): Whether task succeeded.
            text (str): Cleaned response text.
            sessionId (str): Session identifier.
            raw (str): Raw stdout from Hermes CLI.
            error (Optional[str]): Error description if unsuccessful.
    """
    cfg = config or DEFAULT_CONFIG

    if not prompt or not prompt.strip():
        return {
            "success": False,
            "text": "",
            "sessionId": None,
            "raw": "",
            "error": "Prompt is required",
        }

    timeout_sec = timeout if timeout is not None else cfg.timeout_sec
    turns = max_turns if max_turns is not None else cfg.max_turns
    is_yolo = yolo if yolo is not None else cfg.yolo
    sess = session_name or f"jarvis-delegated-{int(time.time() * 1000)}"

    tmp_file = os.path.join(
        os.getcwd(),
        f".hermes_query_{int(time.time() * 1000)}_{os.urandom(3).hex()}.tmp"
    )

    try:
        with open(tmp_file, "w", encoding="utf-8") as f:
            f.write(prompt.strip())

        args = [
            "-p", "default",
            "chat",
            "--continue", sess,
            "--create-if-missing",
            "--query-file", tmp_file,
            "--oneshot",
            "-Q",
            "--max-turns", str(turns),
        ]
        if is_yolo:
            args.append("--yolo")

        print(f"[HermesCLI] Spawning Hermes task (session {sess}): {prompt[:60]}...")
        proc = await asyncio.create_subprocess_exec(
            cfg.bin_path,
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=dict(os.environ),
        )

        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout_sec)
        except asyncio.TimeoutError:
            try:
                proc.kill()
            except Exception:
                pass
            return {
                "success": False,
                "text": "",
                "sessionId": sess,
                "raw": "",
                "error": f"Hermes timed out after {timeout_sec:.0f}s (task may have looped).",
            }

        out_str = stdout.decode("utf-8", errors="replace").strip()
        err_str = stderr.decode("utf-8", errors="replace").strip()

        if proc.returncode != 0 and not out_str:
            return {
                "success": False,
                "text": "",
                "sessionId": sess,
                "raw": err_str,
                "error": err_str or f"Hermes process exited with code {proc.returncode}",
            }

        clean_text, parsed_session_id = clean_hermes_output(out_str)
        return {
            "success": True,
            "text": clean_text or out_str,
            "sessionId": parsed_session_id or sess,
            "raw": out_str,
            "error": None,
        }

    except FileNotFoundError:
        return {
            "success": False,
            "text": "",
            "sessionId": sess,
            "raw": "",
            "error": f"Hermes binary not found at '{cfg.bin_path}'. Verify installation or HERMES_BIN.",
        }
    except Exception as e:
        return {
            "success": False,
            "text": "",
            "sessionId": sess,
            "raw": "",
            "error": f"Hermes execution failed: {str(e)}",
        }

    finally:
        if os.path.exists(tmp_file):
            try:
                os.unlink(tmp_file)
            except Exception:
                pass
