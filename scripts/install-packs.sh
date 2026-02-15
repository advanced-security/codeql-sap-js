#!/usr/bin/env bash
set -euo pipefail

## install-packs.sh
## Install CodeQL pack dependencies for all packs in the codeql-sap-js repository.
##
## This script installs dependencies for both source and test packs, using
## --additional-packs for workspace-local resolution of internal pack references.
##
## Usage:
##   ./scripts/install-packs.sh
##   ./scripts/install-packs.sh --framework cap
##   ./scripts/install-packs.sh --framework ui5

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

FRAMEWORK=""

usage() {
  cat <<EOF
Usage: $0 [OPTIONS]

Install CodeQL pack dependencies for all packs in the repository.

OPTIONS:
    --framework <name>  Install packs only for the specified framework
                        Valid values: cap, ui5, ui5-webcomponents, xsjs, heuristic-models
    -h, --help          Show this help message

By default, the script installs packs for all frameworks.
EOF
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --framework)
      if [[ $# -lt 2 || "${2-}" == -* ]]; then
        echo "Error: --framework requires a value" >&2
        usage >&2
        exit 1
      fi
      FRAMEWORK="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Error: Unknown option $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

## Validate framework if provided
VALID_FRAMEWORKS=("cap" "ui5" "ui5-webcomponents" "xsjs" "heuristic-models")
if [[ -n "${FRAMEWORK}" ]]; then
  FRAMEWORK_VALID=false
  for valid_fw in "${VALID_FRAMEWORKS[@]}"; do
    if [[ "${FRAMEWORK}" == "${valid_fw}" ]]; then
      FRAMEWORK_VALID=true
      break
    fi
  done

  if [[ "${FRAMEWORK_VALID}" == false ]]; then
    echo "Error: Invalid framework '${FRAMEWORK}'" >&2
    echo "Valid frameworks: ${VALID_FRAMEWORKS[*]}" >&2
    exit 1
  fi
fi

cd "${REPO_ROOT}"

## Install packs for a given qlpack.yml directory
install_pack() {
  local pack_dir="$1"
  if [[ -d "${pack_dir}" ]]; then
    echo "INFO: Running 'codeql pack install' for '${pack_dir}'..."
    codeql pack install --no-strict-mode --additional-packs="${REPO_ROOT}/javascript" -- "${pack_dir}"
  else
    echo "WARNING: Directory '${pack_dir}' not found, skipping" >&2
  fi
}

## Install packs for a framework (all subdirectories that contain qlpack.yml)
install_framework() {
  local framework_path="$1"
  echo "Installing packs for: ${framework_path}"

  # Find all qlpack.yml files under this framework and install their packs
  find "${REPO_ROOT}/${framework_path}" -name "qlpack.yml" -type f | sort | while read -r qlpack_file; do
    local pack_dir
    pack_dir=$(dirname "${qlpack_file}")
    # Use relative path for cleaner output
    local rel_path="${pack_dir#${REPO_ROOT}/}"
    install_pack "${rel_path}"
  done
}

if [[ -n "${FRAMEWORK}" ]]; then
  case "${FRAMEWORK}" in
    heuristic-models)
      install_framework "javascript/heuristic-models"
      ;;
    ui5-webcomponents)
      install_framework "javascript/frameworks/ui5-webcomponents"
      ;;
    *)
      install_framework "javascript/frameworks/${FRAMEWORK}"
      ;;
  esac
else
  echo "Installing packs for all frameworks..."
  install_framework "javascript/frameworks/cap"
  install_framework "javascript/frameworks/ui5"
  install_framework "javascript/frameworks/ui5-webcomponents"
  install_framework "javascript/frameworks/xsjs"
  install_framework "javascript/heuristic-models"
fi

echo ""
echo "✅ All CodeQL pack dependencies installed successfully."
