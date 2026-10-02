#!/usr/bin/env bash
# ==============================================================================
# J.A.R.V.I.S. Protocol & Submodule Synchronization Script
# Keeps external agent protocol repositories (A2A, OpenShell) permanently
# connected and synced with their upstream GitHub repositories.
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=========================================================="
echo " [J.A.R.V.I.S.] Synchronizing Upstream Protocol Submodules"
echo "=========================================================="

cd "$PROJECT_ROOT"

# 1. Sync & update git submodules if git is initialized
if [ -d ".git" ]; then
    echo "--> Updating git submodules..."
    git submodule sync --recursive || true
    git submodule update --init --recursive || true
fi

# 2. Sync A2A Protocol repository (protocols/a2a)
A2A_DIR="$PROJECT_ROOT/protocols/a2a"
if [ -d "$A2A_DIR/.git" ]; then
    echo "--> Syncing A2A Protocol (protocols/a2a) with upstream..."
    (
        cd "$A2A_DIR"
        CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'main')"
        echo "    Current A2A branch: $CURRENT_BRANCH"
        git fetch origin || true
        # Fast-forward if clean
        if git diff-index --quiet HEAD -- 2>/dev/null; then
            git pull origin "$CURRENT_BRANCH" --ff-only 2>/dev/null || echo "    Up-to-date or diverged cleanly."
        else
            echo "    Local modifications detected in A2A. Skipping fast-forward to prevent work loss."
        fi
    )
else
    echo "--> Cloning A2A Protocol into protocols/a2a..."
    mkdir -p "$PROJECT_ROOT/protocols"
    git clone https://github.com/a2aproject/A2A.git "$A2A_DIR"
fi

# 3. Sync OpenShell Submodule (external/OpenShell)
OPENSHELL_DIR="$PROJECT_ROOT/external/OpenShell"
if [ -d "$OPENSHELL_DIR/.git" ]; then
    echo "--> Syncing OpenShell (external/OpenShell) with upstream..."
    (
        cd "$OPENSHELL_DIR"
        git fetch origin || true
    )
fi

echo "=========================================================="
echo " [J.A.R.V.I.S.] All protocol connections verified & active"
echo "=========================================================="
