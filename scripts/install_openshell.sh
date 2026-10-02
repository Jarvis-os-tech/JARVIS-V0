#!/usr/bin/env bash
# ==============================================================================
# J.A.R.V.I.S. — NVIDIA OpenShell Automated Installer & Health Checker
# ==============================================================================
set -euo pipefail

OPENSHELL_VERSION="${OPENSHELL_VERSION:-0.1.2}"
ARCH="$(uname -m)"
OS="$(uname -s)"
TARGET_BIN="${HOME}/.local/bin/openshell"

echo "=== [J.A.R.V.I.S. Security] NVIDIA OpenShell Setup ==="
echo "Target version: ${OPENSHELL_VERSION}"
echo "Platform: ${OS} (${ARCH})"

if [[ "$*" == *"--check"* ]]; then
  if command -v openshell >/dev/null 2>&1; then
    INSTALLED_VER="$(openshell --version || true)"
    echo "✔ OpenShell is installed: ${INSTALLED_VER}"
    exit 0
  else
    echo "✖ OpenShell binary not found in PATH"
    exit 1
  fi
fi

# Ensure target bin directory exists
mkdir -p "${HOME}/.local/bin"

if command -v openshell >/dev/null 2>&1; then
  echo "✔ OpenShell is already present in PATH: $(openshell --version)"
  exit 0
fi

if [[ -f "${TARGET_BIN}" ]]; then
  echo "✔ OpenShell already exists at ${TARGET_BIN}"
  chmod +x "${TARGET_BIN}"
  exit 0
fi

echo "Downloading OpenShell standalone binary for ${ARCH}..."
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

DOWNLOAD_URL="https://github.com/NVIDIA/OpenShell/releases/download/v${OPENSHELL_VERSION}/openshell-x86_64-unknown-linux-musl.tar.gz"

curl -LsSf "${DOWNLOAD_URL}" | tar -xz -C "${TMP_DIR}"
cp "${TMP_DIR}/openshell" "${TARGET_BIN}"
chmod +x "${TARGET_BIN}"

echo "✔ OpenShell ${OPENSHELL_VERSION} successfully installed to ${TARGET_BIN}"
"${TARGET_BIN}" --version
