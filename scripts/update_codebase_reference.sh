#!/usr/bin/env bash
# scripts/update_codebase_reference.sh
# Refreshes CODEBASE_REFERENCE.md with real-time Git commits and module stats
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔄 [J.A.R.V.I.S.] Synchronizing CODEBASE_REFERENCE.md in real-time..."
python3 "$WORKSPACE_ROOT/scripts/update_codebase_reference.py"
echo "✅ [J.A.R.V.I.S.] CODEBASE_REFERENCE.md is up-to-date."
