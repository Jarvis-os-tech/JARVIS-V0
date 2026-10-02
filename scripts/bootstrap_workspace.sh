#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# J.A.R.V.I.S. Agent Space — Tmux Workspace Grid Bootstrap
# ═══════════════════════════════════════════════════════════════════════════════
#
# Optional development tool that creates a visual multi-pane tmux layout:
#   Window 1 (jarvis-core):  Express backend server
#   Window 2 (agent-space):  3 panes for Claude / Hermes / Codex
#
# Usage: ./scripts/bootstrap_workspace.sh
# ═══════════════════════════════════════════════════════════════════════════════

SESSION_NAME="jarvis-system"
WORKSPACE_DIR="/home/g0pi/Downloads/jarvis"

# Prevent nested tmux sessions
if [ -n "$TMUX" ]; then
    echo "[-] Error: Already inside a tmux session. Detach first (Ctrl-b d)."
    exit 1
fi

# Check tmux is installed
if ! command -v tmux &>/dev/null; then
    echo "[-] tmux is not installed. Install with: sudo apt install tmux"
    exit 1
fi

# Kill any stale session cleanly
tmux kill-session -t "$SESSION_NAME" 2>/dev/null

echo "[+] ═══════════════════════════════════════════════════"
echo "[+]  J.A.R.V.I.S. Agent Space Grid — Initializing..."
echo "[+] ═══════════════════════════════════════════════════"

# ─── Window 1: Core Server ────────────────────────────────────────────────
echo "[+] Creating Core Server window..."
tmux new-session -d -s "$SESSION_NAME" -n "jarvis-core" -c "$WORKSPACE_DIR"
tmux send-keys -t "$SESSION_NAME:jarvis-core" "npm run dev" C-m

# ─── Window 2: Agent Space ────────────────────────────────────────────────
echo "[+] Creating Agent Space window grid..."
tmux new-window -t "$SESSION_NAME" -n "agent-space" -c "$WORKSPACE_DIR"

# Split into 3 panes: left | top-right | bottom-right
tmux split-window -h -t "$SESSION_NAME:agent-space.0" -c "$WORKSPACE_DIR"
tmux split-window -v -t "$SESSION_NAME:agent-space.1" -c "$WORKSPACE_DIR"

# Label each pane (displayed in status)
echo "[+] Mounting agent worker nodes..."

# Pane 0: Claude Code (left)
tmux send-keys -t "$SESSION_NAME:agent-space.0" \
    "echo '═══ CLAUDE CODE ═══ (Pane 0)'; echo 'Ready for J.A.R.V.I.S. commands'" C-m

# Pane 1: Hermes (top-right)  
tmux send-keys -t "$SESSION_NAME:agent-space.1" \
    "echo '═══ HERMES AGENT ═══ (Pane 1)'; echo 'Ready for J.A.R.V.I.S. commands'" C-m

# Pane 2: Codex (bottom-right)
tmux send-keys -t "$SESSION_NAME:agent-space.2" \
    "echo '═══ CODEX CLI ═══ (Pane 2)'; echo 'Ready for J.A.R.V.I.S. commands'" C-m

# Set even layout
tmux select-layout -t "$SESSION_NAME:agent-space" main-vertical

# ─── Window 3: Monitor (optional) ────────────────────────────────────────
tmux new-window -t "$SESSION_NAME" -n "monitor" -c "$WORKSPACE_DIR"
tmux send-keys -t "$SESSION_NAME:monitor" \
    "echo '═══ SYSTEM MONITOR ═══'; echo 'Watching: http://localhost:3000'; echo ''; echo 'Useful commands:'; echo '  curl localhost:3000/api/agents          # List agents'; echo '  curl localhost:3000/.well-known/agent.json  # A2A card'" C-m

# Focus on core window
tmux select-window -t "$SESSION_NAME:jarvis-core"

echo "[+] ═══════════════════════════════════════════════════"
echo "[+]  System synchronized. Attaching to cockpit..."
echo "[+] ═══════════════════════════════════════════════════"
sleep 1
tmux attach-session -t "$SESSION_NAME"
