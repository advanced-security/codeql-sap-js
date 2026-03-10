#!/usr/bin/env bash
set -euo pipefail

## bundle-packs.sh
## Bundle CodeQL packs into distributable .tar.gz archives.
##
## This script bundles all publishable CodeQL packs in the codeql-sap-js
## repository using `codeql pack bundle`, producing .tar.gz files suitable
## for upload as release artifacts or offline distribution.
##
## Requirements:
##   - The `codeql` CLI must be available on PATH.
##
## Usage:
##   ./scripts/bundle-packs.sh [OPTIONS]
##   ./scripts/bundle-packs.sh --output-dir dist-packs
##   ./scripts/bundle-packs.sh --dry-run
##
## Options:
##   --output-dir <dir>  Directory for bundled .tar.gz files (default: dist-packs).
##   --dry-run           Show what would be bundled without actually bundling.
##   -h, --help          Show this help message.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

DRY_RUN=false
OUTPUT_DIR="dist-packs"

## All publishable pack directories relative to repo root.
## These must match the packs listed in publish-packs.sh.
PUBLISHABLE_PACKS=(
  "javascript/frameworks/cap/src"
  "javascript/frameworks/cap/ext"
  "javascript/frameworks/cap/lib"
  "javascript/frameworks/ui5/src"
  "javascript/frameworks/ui5/ext"
  "javascript/frameworks/ui5/lib"
  "javascript/frameworks/xsjs/src"
  "javascript/frameworks/xsjs/ext"
  "javascript/frameworks/xsjs/lib"
  "javascript/heuristic-models/ext"
)

usage() {
  cat <<EOF
Usage: $0 [OPTIONS]

Bundle CodeQL packs into distributable .tar.gz archives.

OPTIONS:
    --output-dir <dir>  Directory for bundled .tar.gz files (default: dist-packs).
    --dry-run           Show what would be bundled without actually bundling.
    -h, --help          Show this help message.

EXAMPLES:
    ./scripts/bundle-packs.sh
    ./scripts/bundle-packs.sh --output-dir dist-packs
    ./scripts/bundle-packs.sh --dry-run
EOF
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --output-dir)
      if [[ $# -lt 2 || "${2-}" == -* ]]; then
        echo "Error: --output-dir requires a value" >&2
        usage >&2
        exit 1
      fi
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
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

## ── Diagnostics ──────────────────────────────────────────────────────────────

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  CodeQL Pack Bundler                                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Output dir:    ${OUTPUT_DIR}"
echo "Dry run:       ${DRY_RUN}"
echo "Repo root:     ${REPO_ROOT}"
echo ""

# Verify codeql is available
if ! command -v codeql &> /dev/null; then
  echo "Error: 'codeql' CLI not found on PATH." >&2
  echo "Install CodeQL CLI and ensure it is on your PATH before running this script." >&2
  exit 1
fi

echo "CodeQL CLI:    $(command -v codeql)"
echo "CodeQL version: $(codeql version --format=terse)"
echo ""

## ── Bundle packs ─────────────────────────────────────────────────────────────

cd "${REPO_ROOT}"

if [[ "${DRY_RUN}" == false ]]; then
  mkdir -p "${OUTPUT_DIR}"
fi

BUNDLED=0
SKIPPED=0
FAILED=0

echo "Bundling ${#PUBLISHABLE_PACKS[@]} CodeQL packs..."
echo ""

for pack_dir in "${PUBLISHABLE_PACKS[@]}"; do
  if [[ ! -d "${pack_dir}" ]]; then
    echo "⚠️  Skipping: ${pack_dir} (directory not found)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  if [[ ! -f "${pack_dir}/qlpack.yml" ]]; then
    echo "⚠️  Skipping: ${pack_dir} (no qlpack.yml found)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  pack_name=$(grep -m1 "^name:" "${pack_dir}/qlpack.yml" | awk '{print $2}')
  # Convert pack name to filename: advanced-security/foo -> foo
  bundle_name="${pack_name#advanced-security/}"
  output="${OUTPUT_DIR}/${bundle_name}.tar.gz"

  echo "────────────────────────────────────────────────────────────────"
  echo "📦 Pack:      ${pack_name}"
  echo "   Directory: ${pack_dir}"
  echo "   Output:    ${output}"

  if [[ "${DRY_RUN}" == true ]]; then
    echo "   Action:    [DRY RUN] Would bundle with: codeql pack bundle --threads=-1 --output=${output} -- ${pack_dir}"
    BUNDLED=$((BUNDLED + 1))
    continue
  fi

  if codeql pack bundle --threads=-1 --output="${output}" -- "${pack_dir}"; then
    echo "   ✅ Bundled ${bundle_name}"
    BUNDLED=$((BUNDLED + 1))
  else
    EXIT_CODE=$?
    echo "   ❌ Failed to bundle ${bundle_name} (exit code: ${EXIT_CODE})" >&2
    FAILED=$((FAILED + 1))
  fi
  echo ""
done

## ── Summary ──────────────────────────────────────────────────────────────────

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "Summary"
echo "════════════════════════════════════════════════════════════════"
echo "  Total:   ${#PUBLISHABLE_PACKS[@]}"
echo "  Bundled: ${BUNDLED}"
echo "  Skipped: ${SKIPPED}"
echo "  Failed:  ${FAILED}"
echo ""

if [[ "${DRY_RUN}" == false && -d "${OUTPUT_DIR}" ]]; then
  echo "Bundled packs:"
  ls -lh "${OUTPUT_DIR}/"
  echo ""
fi

if [[ "${FAILED}" -gt 0 ]]; then
  echo "❌ ${FAILED} pack(s) failed to bundle." >&2
  exit 1
fi

if [[ "${DRY_RUN}" == true ]]; then
  echo "✅ Dry run complete. No packs were actually bundled."
else
  echo "✅ All CodeQL packs bundled successfully."
fi
