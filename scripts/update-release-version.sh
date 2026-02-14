#!/usr/bin/env bash
set -euo pipefail

## update-release-version.sh
## Deterministically updates the release version across all version-bearing files
## in the codeql-sap-js repository.
##
## Version-bearing files (15 qlpack.yml files):
##   javascript/frameworks/cap/ext/qlpack.yml
##   javascript/frameworks/cap/lib/qlpack.yml
##   javascript/frameworks/cap/src/qlpack.yml
##   javascript/frameworks/cap/test/qlpack.yml
##   javascript/frameworks/ui5/ext/qlpack.yml
##   javascript/frameworks/ui5/lib/qlpack.yml
##   javascript/frameworks/ui5/src/qlpack.yml
##   javascript/frameworks/ui5/test/qlpack.yml
##   javascript/frameworks/ui5-webcomponents/test/qlpack.yml
##   javascript/frameworks/xsjs/ext/qlpack.yml
##   javascript/frameworks/xsjs/lib/qlpack.yml
##   javascript/frameworks/xsjs/src/qlpack.yml
##   javascript/frameworks/xsjs/test/qlpack.yml
##   javascript/heuristic-models/ext/qlpack.yml
##   javascript/heuristic-models/tests/qlpack.yml
##
## Additionally updates:
##   - Internal dependency references within qlpack.yml files
##     that reference other packs in this repository (e.g., ^X.Y.Z constraints).
##   - qlt.conf.json (CodeQLCLI, CodeQLStandardLibrary, CodeQLCLIBundle)
##     using the base version (X.Y.Z) derived by stripping any pre-release suffix.
##
## Usage:
##   ./scripts/update-release-version.sh <new-version>
##   ./scripts/update-release-version.sh --check [<expected-version>]
##
## Examples:
##   ./scripts/update-release-version.sh 2.4.0
##   ./scripts/update-release-version.sh 2.4.0-rc1
##   ./scripts/update-release-version.sh --check
##   ./scripts/update-release-version.sh --check 2.4.0

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

## All qlpack.yml file paths relative to repo root
QLPACK_FILES=(
  "javascript/frameworks/cap/ext/qlpack.yml"
  "javascript/frameworks/cap/lib/qlpack.yml"
  "javascript/frameworks/cap/src/qlpack.yml"
  "javascript/frameworks/cap/test/qlpack.yml"
  "javascript/frameworks/ui5/ext/qlpack.yml"
  "javascript/frameworks/ui5/lib/qlpack.yml"
  "javascript/frameworks/ui5/src/qlpack.yml"
  "javascript/frameworks/ui5/test/qlpack.yml"
  "javascript/frameworks/ui5-webcomponents/test/qlpack.yml"
  "javascript/frameworks/xsjs/ext/qlpack.yml"
  "javascript/frameworks/xsjs/lib/qlpack.yml"
  "javascript/frameworks/xsjs/src/qlpack.yml"
  "javascript/frameworks/xsjs/test/qlpack.yml"
  "javascript/heuristic-models/ext/qlpack.yml"
  "javascript/heuristic-models/tests/qlpack.yml"
)

## Pack names that belong to this repository (for updating internal dependency refs)
INTERNAL_PACKS=(
  "advanced-security/javascript-sap-cap-models"
  "advanced-security/javascript-sap-cap-all"
  "advanced-security/javascript-sap-cap-queries"
  "advanced-security/javascript-sap-ui5-models"
  "advanced-security/javascript-sap-ui5-all"
  "advanced-security/javascript-sap-ui5-queries"
  "advanced-security/javascript-sap-xsjs-models"
  "advanced-security/javascript-sap-xsjs-all"
  "advanced-security/javascript-sap-xsjs-queries"
  "advanced-security/javascript-heuristic-models"
)

usage() {
  cat <<EOF
Usage: $0 <new-version>
       $0 --check [<expected-version>]

Deterministically updates the release version across all version-bearing files.

ARGUMENTS:
    <new-version>          The new version to set (e.g., 2.4.0 or 2.4.0-alpha).
                           The 'v' prefix is optional and will be normalized.
                           Supports pre-release suffixes: -alpha, -beta, -rc1, etc.

OPTIONS:
    --check [<version>]    Check version consistency across all files.
                           If <version> is provided, also validates that all
                           files match the expected version.
    --dry-run              Show what would be changed without modifying files.
    -h, --help             Show this help message.

EXAMPLES:
    $0 2.4.0               Update all files to version 2.4.0
    $0 2.4.0-alpha         Update all files to pre-release version 2.4.0-alpha
    $0 v2.4.0              Same as above (v prefix is stripped automatically)
    $0 --check             Verify all version-bearing files are consistent
    $0 --check 2.4.0       Verify all files contain version 2.4.0
    $0 --dry-run 2.4.0     Preview changes without writing files
EOF
}

## Collect all version-bearing files and their current versions
collect_versions() {
  local versions=()

  for qlpack_file in "${QLPACK_FILES[@]}"; do
    local full_path="${REPO_ROOT}/${qlpack_file}"
    if [[ -f "${full_path}" ]]; then
      local pack_version
      pack_version=$(grep -m1 "^version:" "${full_path}" | awk '{print $2}')
      if [[ -z "${pack_version}" ]]; then
        echo "ERROR: ${qlpack_file} is missing a 'version:' field" >&2
        return 1
      fi
      versions+=("${qlpack_file}|${pack_version}")
    else
      echo "ERROR: ${qlpack_file} not found" >&2
      return 1
    fi
  done

  printf '%s\n' "${versions[@]}"
}

## Check version consistency
check_versions() {
  local expected_version="${1:-}"
  local all_consistent=true
  local first_version=""
  local file_count=0

  echo "=== Version Consistency Check ==="
  echo ""

  local version_output
  if ! version_output=$(collect_versions); then
    echo "❌ Failed to collect versions" >&2
    return 1
  fi

  while IFS='|' read -r file version; do
    file_count=$((file_count + 1))

    if [[ -z "${first_version}" ]]; then
      first_version="${version}"
    fi

    if [[ -n "${expected_version}" ]]; then
      if [[ "${version}" == "${expected_version}" ]]; then
        echo "  ✅ ${file}: ${version}"
      else
        echo "  ❌ ${file}: ${version} (expected ${expected_version})"
        all_consistent=false
      fi
    else
      if [[ "${version}" == "${first_version}" ]]; then
        echo "  ✅ ${file}: ${version}"
      else
        echo "  ❌ ${file}: ${version} (differs from ${first_version})"
        all_consistent=false
      fi
    fi
  done <<< "${version_output}"

  ## Also check qlt.conf.json consistency
  local qlt_config="${REPO_ROOT}/qlt.conf.json"
  if [[ -f "${qlt_config}" ]]; then
    local cli_version
    cli_version=$(grep -o '"CodeQLCLI":[[:space:]]*"[^"]*"' "${qlt_config}" | grep -o '"[^"]*"$' | tr -d '"')
    ## Derive expected base version: strip pre-release suffix from first_version or expected_version
    local check_base="${expected_version:-${first_version}}"
    check_base="${check_base%%-*}"
    if [[ "${cli_version}" == "${check_base}" ]]; then
      echo "  ✅ qlt.conf.json: CodeQLCLI ${cli_version}"
    else
      echo "  ❌ qlt.conf.json: CodeQLCLI ${cli_version} (expected ${check_base})"
      all_consistent=false
    fi
  fi

  echo ""
  echo "Checked ${file_count} version-bearing files + qlt.conf.json."

  if [[ "${all_consistent}" == true ]]; then
    if [[ -n "${expected_version}" ]]; then
      echo "✅ All files match expected version: ${expected_version}"
    else
      echo "✅ All files are consistent at version: ${first_version}"
    fi
    return 0
  else
    echo "❌ Version inconsistency detected!"
    return 1
  fi
}

## Validate version format (X.Y.Z or X.Y.Z-suffix)
validate_version() {
  local version="$1"
  if [[ ! "${version}" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+)?$ ]]; then
    echo "ERROR: Invalid version format '${version}'" >&2
    echo "Expected format: X.Y.Z or X.Y.Z-suffix (e.g., 2.4.0, 2.4.0-alpha, 2.4.0-rc1)" >&2
    return 1
  fi
}

## Update a qlpack.yml file's version field using sed
update_pack_version() {
  local file="$1"
  local new_version="$2"
  sed -i.bak "s/^version:[[:space:]]*.*/version: ${new_version}/" "${file}"
  rm -f "${file}.bak"
}

## Update qlt.conf.json with the base version (suffix stripped)
## e.g., 2.4.0-alpha -> CodeQLCLI: "2.4.0", CodeQLStandardLibrary: "codeql-cli/v2.4.0", etc.
update_qlt_config() {
  local new_version="$1"
  local dry_run="${2:-false}"
  local qlt_config="${REPO_ROOT}/qlt.conf.json"

  # Derive the base version by stripping any pre-release suffix
  local base_version="${new_version%%-*}"

  if [[ ! -f "${qlt_config}" ]]; then
    echo "WARNING: qlt.conf.json not found, skipping" >&2
    return 0
  fi

  if [[ "${dry_run}" == true ]]; then
    echo "  [DRY RUN] qlt.conf.json: CodeQLCLI -> ${base_version}"
    return 0
  fi

  # Use jq for reliable JSON manipulation (learned from update-codeql.yml)
  if command -v jq &>/dev/null; then
    jq --arg cli_version "${base_version}" \
       --arg std_lib "codeql-cli/v${base_version}" \
       --arg bundle "codeql-bundle-v${base_version}" \
       '.CodeQLCLI = $cli_version | .CodeQLStandardLibrary = $std_lib | .CodeQLCLIBundle = $bundle' \
       "${qlt_config}" > "${qlt_config}.tmp" && mv "${qlt_config}.tmp" "${qlt_config}"
  else
    # Fallback to sed if jq is not available
    local tmp_file
    tmp_file=$(mktemp)
    sed \
      -e "s/\"CodeQLCLI\":[[:space:]]*\"[^\"]*\"/\"CodeQLCLI\": \"${base_version}\"/" \
      -e "s/\"CodeQLStandardLibrary\":[[:space:]]*\"[^\"]*\"/\"CodeQLStandardLibrary\": \"codeql-cli\/v${base_version}\"/" \
      -e "s/\"CodeQLCLIBundle\":[[:space:]]*\"[^\"]*\"/\"CodeQLCLIBundle\": \"codeql-bundle-v${base_version}\"/" \
      "${qlt_config}" > "${tmp_file}"
    mv "${tmp_file}" "${qlt_config}"
  fi
  echo "  ✅ qlt.conf.json: CodeQLCLI -> ${base_version}"
}

## Update internal dependency references in a qlpack.yml file
## e.g., advanced-security/javascript-sap-cap-models: "^2.3.0" -> "^2.4.0"
## e.g., advanced-security/javascript-sap-cap-models: "^2.3.0" -> "^2.4.0-alpha"
## and   advanced-security/javascript-heuristic-models: 2.3.0 -> 2.4.0
update_internal_deps() {
  local file="$1"
  local old_version="$2"
  local new_version="$3"

  # Escape regex metacharacters in the old version (e.g., '.' -> '\.')
  local escaped_old_version
  escaped_old_version=$(printf '%s' "${old_version}" | sed 's/[.\*\[\^\$]/\\&/g')

  for pack_name in "${INTERNAL_PACKS[@]}"; do
    # Update quoted caret-prefixed versions: "^X.Y.Z"
    sed -i.bak "s|${pack_name}: \"\\^${escaped_old_version}\"|${pack_name}: \"^${new_version}\"|g" "${file}"
    rm -f "${file}.bak"
    # Update unquoted exact versions: X.Y.Z
    sed -i.bak "s|${pack_name}: ${escaped_old_version}$|${pack_name}: ${new_version}|g" "${file}"
    rm -f "${file}.bak"
  done
}

## Update all version-bearing files
update_versions() {
  local new_version="$1"
  local dry_run="${2:-false}"
  local updated_count=0

  echo "=== Updating Release Version to ${new_version} ==="
  echo ""

  # Determine the current version from the first qlpack.yml file
  local current_version=""
  local first_file="${REPO_ROOT}/${QLPACK_FILES[0]}"
  if [[ -f "${first_file}" ]]; then
    current_version=$(grep -m1 "^version:" "${first_file}" | awk '{print $2}')
  fi

  if [[ -z "${current_version}" ]]; then
    echo "ERROR: Could not determine current version from ${QLPACK_FILES[0]}" >&2
    return 1
  fi

  echo "  Current version: ${current_version}"
  echo "  New version:     ${new_version}"
  echo ""

  if [[ "${current_version}" == "${new_version}" ]]; then
    echo "ℹ️ Version is already ${new_version}. Nothing to update."
    return 0
  fi

  ## Update all qlpack.yml files
  for qlpack_file in "${QLPACK_FILES[@]}"; do
    local full_path="${REPO_ROOT}/${qlpack_file}"
    if [[ -f "${full_path}" ]]; then
      local old_version
      old_version=$(grep -m1 "^version:" "${full_path}" | awk '{print $2}')
      if [[ "${dry_run}" == true ]]; then
        echo "  [DRY RUN] ${qlpack_file}: ${old_version} -> ${new_version}"
      else
        update_pack_version "${full_path}" "${new_version}"
        update_internal_deps "${full_path}" "${current_version}" "${new_version}"
        echo "  ✅ ${qlpack_file}: ${old_version} -> ${new_version}"
      fi
      updated_count=$((updated_count + 1))
    fi
  done

  ## Update qlt.conf.json
  update_qlt_config "${new_version}" "${dry_run}"

  echo ""
  if [[ "${dry_run}" == true ]]; then
    echo "Would update ${updated_count} qlpack files + qlt.conf.json. (Dry run — no files modified)"
  else
    echo "Updated ${updated_count} qlpack files + qlt.conf.json to version ${new_version}."
    echo ""
    echo "Next steps:"
    echo "  1. Run 'codeql pack upgrade' on all packs to update lock files"
    echo "  2. Run CodeQL unit tests to validate the changes"
    echo "  3. Commit the changes and tag with 'v${new_version}'"
  fi
}

## Parse arguments
CHECK_MODE=false
DRY_RUN=false
NEW_VERSION=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --check)
      CHECK_MODE=true
      shift
      ## Optional expected version argument
      if [[ $# -gt 0 && ! "$1" =~ ^-- ]]; then
        NEW_VERSION="${1#v}"
        shift
      fi
      ;;
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
      NEW_VERSION="${1#v}"  ## Strip optional v prefix
      shift
      ;;
  esac
done

if [[ "${CHECK_MODE}" == true ]]; then
  check_versions "${NEW_VERSION}"
  exit $?
fi

if [[ -z "${NEW_VERSION}" ]]; then
  echo "Error: No version specified" >&2
  echo "" >&2
  usage >&2
  exit 1
fi

validate_version "${NEW_VERSION}"
update_versions "${NEW_VERSION}" "${DRY_RUN}"
