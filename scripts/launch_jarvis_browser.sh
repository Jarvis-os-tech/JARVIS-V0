#!/usr/bin/env bash
# ==============================================================================
# J.A.R.V.I.S. — Reliable Multi-Environment Browser Launcher
# Launches http://localhost:3000 once the server is accepting connections.
# Guards against duplicate tabs and ensures compatibility with Omarchy / Wayland.
# ==============================================================================
set -euo pipefail

PORT="${PORT:-3000}"
URL="http://localhost:${PORT}"
LOCK_FILE="/tmp/jarvis_browser_last_launch"
NOW=$(date +%s)

# Prevent launching multiple tabs if triggered in close succession (< 12 seconds)
if [[ -f "${LOCK_FILE}" ]]; then
  LAST_LAUNCH=$(cat "${LOCK_FILE}" 2>/dev/null || echo 0)
  DIFF=$(( NOW - LAST_LAUNCH ))
  if (( DIFF < 12 )); then
    exit 0
  fi
fi

# Detect display environment (Wayland / X11)
if [[ -z "${WAYLAND_DISPLAY:-}" && -z "${DISPLAY:-}" ]]; then
  RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
  if [[ -S "${RUNTIME_DIR}/wayland-0" ]]; then
    export WAYLAND_DISPLAY="wayland-0"
  elif [[ -S "${RUNTIME_DIR}/wayland-1" ]]; then
    export WAYLAND_DISPLAY="wayland-1"
  elif [[ -d "/tmp/.X11-unix" ]]; then
    export DISPLAY=":0"
  fi
fi

# Wait for J.A.R.V.I.S. server to be reachable (up to 45 seconds)
MAX_WAIT=45
WAIT_COUNT=0
until curl -s -f -o /dev/null "${URL}" 2>/dev/null; do
  sleep 1
  WAIT_COUNT=$(( WAIT_COUNT + 1 ))
  if (( WAIT_COUNT >= MAX_WAIT )); then
    echo "[AutoLaunch] J.A.R.V.I.S. did not respond on ${URL} within ${MAX_WAIT}s. Aborting."
    exit 1
  fi
done

# Mark last launch timestamp
echo "${NOW}" > "${LOCK_FILE}"

# Launch default browser using best available launcher
if command -v /usr/share/omarchy/bin/omarchy-launch-browser &>/dev/null; then
  /usr/share/omarchy/bin/omarchy-launch-browser "${URL}"
elif command -v omarchy-launch-browser &>/dev/null; then
  omarchy-launch-browser "${URL}"
elif [[ -n "${BROWSER:-}" ]] && command -v "${BROWSER}" &>/dev/null; then
  "${BROWSER}" "${URL}"
elif command -v xdg-open &>/dev/null; then
  xdg-open "${URL}"
elif command -v gio &>/dev/null; then
  gio open "${URL}"
else
  echo "[AutoLaunch] Warning: No supported browser launcher found for ${URL}"
  exit 1
fi
