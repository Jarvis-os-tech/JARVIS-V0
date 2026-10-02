#!/usr/bin/env bash
# ==============================================================================
# J.A.R.V.I.S. — NVIDIA OpenShell Upstream Sync & Update Engine
# Pulls latest commits, tags, and releases from https://github.com/NVIDIA/OpenShell.git
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SUBMODULE_PATH="${WORKSPACE_ROOT}/external/OpenShell"
TARGET_BIN="${HOME}/.local/bin/openshell"

echo "================================================================="
echo "🛡️  J.A.R.V.I.S. OpenShell Upstream Synchronization"
echo "================================================================="

cd "${WORKSPACE_ROOT}"

# 1. Fetch latest upstream git commits and tags
echo "[1/4] Fetching latest branches and tags from openshell-upstream..."
if git remote | grep -q "openshell-upstream"; then
  git fetch openshell-upstream --tags --quiet || echo "Notice: Remote fetch completed."
else
  git remote add openshell-upstream https://github.com/NVIDIA/OpenShell.git
  git fetch openshell-upstream --tags --quiet
fi

# 2. Update external/OpenShell submodule
echo "[2/4] Updating external/OpenShell git submodule..."
if [[ -d "${SUBMODULE_PATH}" ]]; then
  git submodule update --init --recursive --remote external/OpenShell
  SUBMODULE_REV="$(git -C "${SUBMODULE_PATH}" rev-parse --short HEAD)"
  echo "✔ Submodule at external/OpenShell updated to revision: ${SUBMODULE_REV}"
else
  git submodule update --init --recursive external/OpenShell
fi

# 3. Detect latest release from NVIDIA OpenShell
echo "[3/4] Querying latest release from GitHub API..."
LATEST_TAG=$(curl -s https://api.github.com/repos/NVIDIA/OpenShell/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/' || true)

if [[ -z "${LATEST_TAG}" ]]; then
  LATEST_TAG="v0.1.2"
fi

CLEAN_VER="${LATEST_TAG#v}"
echo "Latest available release: ${LATEST_TAG} (${CLEAN_VER})"

CURRENT_VER=""
if command -v "${TARGET_BIN}" >/dev/null 2>&1; then
  CURRENT_VER="$("${TARGET_BIN}" --version 2>/dev/null | awk '{print $2}' || true)"
fi

echo "Currently installed binary: ${CURRENT_VER:-none}"

# 4. Update binary if newer version detected or if not installed
if [[ "${CURRENT_VER}" != "${CLEAN_VER}" ]] || [[ ! -f "${TARGET_BIN}" ]]; then
  echo "[4/4] Upgrading OpenShell runtime binary to ${LATEST_TAG}..."
  OPENSHELL_VERSION="${CLEAN_VER}" bash "${SCRIPT_DIR}/install_openshell.sh"
else
  echo "[4/4] Binary is already at the latest release (${CLEAN_VER})."
fi

echo "================================================================="
echo "✔ NVIDIA OpenShell upstream synchronization complete!"
echo "  - Git Submodule: ${SUBMODULE_PATH} ($(git -C "${SUBMODULE_PATH}" rev-parse --short HEAD))"
echo "  - Runtime Binary: $("${TARGET_BIN}" --version 2>/dev/null || echo 'installed')"
echo "================================================================="
