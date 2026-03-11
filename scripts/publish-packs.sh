#!/usr/bin/env bash
set -euo pipefail

## publish-packs.sh
## Publish CodeQL packs to the GitHub Container Registry (GHCR).
##
## This script publishes all publishable CodeQL packs in the codeql-sap-js
## repository to GHCR using `codeql pack publish`. Pre-release versions
## (those containing a hyphen, e.g., 2.24.2-rc1) are automatically detected
## and published with the --allow-prerelease flag.
##
## Requirements:
##   - GITHUB_TOKEN environment variable must be set to a non-empty value
##     with packages:write permission for the target GHCR registry.
##   - The `codeql` CLI must be available on PATH.
##
## Usage:
##   GITHUB_TOKEN=<token> ./scripts/publish-packs.sh <release-name>
##   GITHUB_TOKEN=<token> ./scripts/publish-packs.sh 2.24.2
##   GITHUB_TOKEN=<token> ./scripts/publish-packs.sh 2.24.2-rc1
##   GITHUB_TOKEN=<token> ./scripts/publish-packs.sh --dry-run 2.24.2
##
## Options:
##   --dry-run   Show what would be published without actually publishing.
##   -h, --help  Show this help message.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

DRY_RUN=false

## All publishable pack directories relative to repo root.
## These are the packs that have qlpack.yml files and are intended
## for publishing to GHCR.
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
Usage: $0 [OPTIONS] <release-name>

Publish CodeQL packs to the GitHub Container Registry (GHCR).

ARGUMENTS:
    <release-name>      Release version (e.g., 2.24.2 or 2.24.2-rc1).
                        Do NOT include a "v" prefix.

OPTIONS:
    --dry-run           Show what would be published without actually publishing.
    -h, --help          Show this help message.

ENVIRONMENT:
    GITHUB_TOKEN        Required. Token with packages:write permission for GHCR.

EXAMPLES:
    GITHUB_TOKEN=\$TOKEN ./scripts/publish-packs.sh 2.24.2
    GITHUB_TOKEN=\$TOKEN ./scripts/publish-packs.sh 2.24.2-rc1
    GITHUB_TOKEN=\$TOKEN ./scripts/publish-packs.sh --dry-run 2.24.2
EOF
}

RELEASE_NAME=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      echo "Error: Unknown option $1" >&2
      usage >&2
      exit 1
      ;;
    *)
      if [[ -n "${RELEASE_NAME}" ]]; then
        echo "Error: Unexpected argument '$1'. Release name already set to '${RELEASE_NAME}'." >&2
        usage >&2
        exit 1
      fi
      RELEASE_NAME="$1"
      shift
      ;;
  esac
done

## ── Validate inputs ──────────────────────────────────────────────────────────

if [[ -z "${RELEASE_NAME}" ]]; then
  echo "Error: Release name is required." >&2
  usage >&2
  exit 1
fi

if [[ "${RELEASE_NAME}" =~ ^v ]]; then
  echo "Error: Release name '${RELEASE_NAME}' should not include a 'v' prefix." >&2
  echo "Hint: Use '${RELEASE_NAME#v}' instead." >&2
  exit 1
fi

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "Error: GITHUB_TOKEN environment variable is required but not set or empty." >&2
  echo "Set it to a token with packages:write permission for GHCR." >&2
  exit 1
fi

## ── Diagnostics ──────────────────────────────────────────────────────────────

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  CodeQL Pack Publisher                                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Release name:  ${RELEASE_NAME}"
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

# Diagnostic: show GITHUB_TOKEN metadata (without revealing the token value)
TOKEN_LENGTH=${#GITHUB_TOKEN}
TOKEN_PREFIX="${GITHUB_TOKEN:0:4}"
echo "GITHUB_TOKEN:  set (length=${TOKEN_LENGTH}, prefix=${TOKEN_PREFIX}...)"

# Diagnostic: verify token validity and scopes via the GitHub API.
# Note: GHCR's /v2/ endpoint uses OCI token exchange, so a raw Bearer check
# against it always returns 401/403. The GitHub API /user endpoint is the
# reliable way to validate a token and inspect its scopes.
echo ""
echo "Verifying GitHub token via API..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: token ${GITHUB_TOKEN}" \
  "https://api.github.com/user" 2>/dev/null || echo "000")

if [[ "${API_STATUS}" == "200" ]]; then
  # Single verbose request for login (body) and scopes (headers).
  API_HEADER_FILE=$(mktemp)
  trap 'rm -f "${API_HEADER_FILE}"' EXIT
  API_LOGIN=$(curl -s -D "${API_HEADER_FILE}" \
    -H "Authorization: token ${GITHUB_TOKEN}" \
    "https://api.github.com/user" 2>/dev/null \
    | grep -o '"login" *: *"[^"]*"' | cut -d'"' -f4 || true)
  echo "✅ Token is valid (HTTP ${API_STATUS}, user: ${API_LOGIN:-unknown})"

  # Check scopes for classic PATs (ghp_ prefix). Fine-grained tokens and
  # GITHUB_TOKEN from Actions do not return X-OAuth-Scopes.
  SCOPES_HEADER=$(grep -i "^x-oauth-scopes:" "${API_HEADER_FILE}" \
    | sed 's/^[^:]*: //' | tr -d '\r' || true)

  if [[ -n "${SCOPES_HEADER}" ]]; then
    echo "   Scopes:  ${SCOPES_HEADER}"
    if echo "${SCOPES_HEADER}" | grep -qi "write:packages"; then
      echo "   ✅ write:packages scope present"
    else
      echo "   ❌ write:packages scope NOT found in token scopes" >&2
      echo "   The token needs the 'write:packages' scope to publish to GHCR." >&2
      exit 1
    fi
  else
    echo "   Scopes:  (not reported — fine-grained token or Actions GITHUB_TOKEN)"
  fi
elif [[ "${API_STATUS}" == "401" ]]; then
  echo "❌ Token authentication failed (HTTP ${API_STATUS})" >&2
  echo "The GITHUB_TOKEN is invalid or expired." >&2
  exit 1
else
  echo "⚠️  GitHub API returned HTTP ${API_STATUS}"
  echo "This may indicate a network issue. Proceeding anyway — codeql pack publish"
  echo "will report the definitive error."
fi
echo ""

## ── Pre-release detection ────────────────────────────────────────────────────

PRERELEASE_FLAG=""
if [[ "${RELEASE_NAME}" == *-* ]]; then
  PRERELEASE_FLAG="--allow-prerelease"
  echo "Detected pre-release version — will use: ${PRERELEASE_FLAG}"
  echo ""
fi

## ── Publish packs ────────────────────────────────────────────────────────────

cd "${REPO_ROOT}"

PUBLISHED=0
SKIPPED=0
FAILED=0

echo "Publishing ${#PUBLISHABLE_PACKS[@]} CodeQL packs..."
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
  pack_version=$(grep -m1 "^version:" "${pack_dir}/qlpack.yml" | awk '{print $2}')

  echo "────────────────────────────────────────────────────────────────"
  echo "📦 Pack:      ${pack_name}"
  echo "   Version:   ${pack_version}"
  echo "   Directory: ${pack_dir}"

  if [[ "${DRY_RUN}" == true ]]; then
    echo "   Action:    [DRY RUN] Would publish with: codeql pack publish --threads=-1 ${PRERELEASE_FLAG} -- ${pack_dir}"
    PUBLISHED=$((PUBLISHED + 1))
    continue
  fi

  if codeql pack publish --threads=-1 ${PRERELEASE_FLAG} -- "${pack_dir}"; then
    echo "   ✅ Published ${pack_name}@${pack_version}"
    PUBLISHED=$((PUBLISHED + 1))
  else
    EXIT_CODE=$?
    echo "   ❌ Failed to publish ${pack_name} (exit code: ${EXIT_CODE})" >&2
    FAILED=$((FAILED + 1))
  fi
  echo ""
done

## ── Summary ──────────────────────────────────────────────────────────────────

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "Summary"
echo "════════════════════════════════════════════════════════════════"
echo "  Total:     ${#PUBLISHABLE_PACKS[@]}"
echo "  Published: ${PUBLISHED}"
echo "  Skipped:   ${SKIPPED}"
echo "  Failed:    ${FAILED}"
echo ""

if [[ "${FAILED}" -gt 0 ]]; then
  echo "❌ ${FAILED} pack(s) failed to publish." >&2
  exit 1
fi

if [[ "${DRY_RUN}" == true ]]; then
  echo "✅ Dry run complete. No packs were actually published."
else
  echo "✅ All CodeQL packs published successfully."
fi
