#!/usr/bin/env bash
set -euo pipefail

## test-custom-bundle.sh
## Build the customized JavaScript standard library and compile a minimal
## dependent query pack.
##
## Requirements:
##   - CodeQL pack dependencies are installed.
##   - jq and Python 3 are available.
##
## Usage:
##   ./scripts/test-custom-bundle.sh
##   CODEQL_BIN=/path/to/codeql ./scripts/test-custom-bundle.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CODEQL_BIN="${CODEQL_BIN:-codeql}"
TEMP_ROOT="${TMPDIR:-/tmp}"
WORK_DIR="$(mktemp -d "${TEMP_ROOT%/}/codeql-javascript-custom-bundle.XXXXXX")"

cleanup() {
  local exit_code=$?
  case "${WORK_DIR}" in
    "${TEMP_ROOT%/}"/codeql-javascript-custom-bundle.*)
      rm -rf -- "${WORK_DIR}"
      ;;
    *)
      echo "Refusing to remove unexpected temporary directory: ${WORK_DIR}" >&2
      return 1
      ;;
  esac
  return "${exit_code}"
}
trap cleanup EXIT

require_command() {
  local command_name="$1"
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    echo "Required command not found: ${command_name}" >&2
    exit 1
  fi
}

if [[ "${CODEQL_BIN}" == */* ]]; then
  if [[ ! -x "${CODEQL_BIN}" ]]; then
    echo "CodeQL executable not found: ${CODEQL_BIN}" >&2
    exit 1
  fi
else
  require_command "${CODEQL_BIN}"
fi
require_command jq
require_command python3

javascript_all_version="$(
  awk '
    $1 == "codeql/javascript-all:" { in_javascript_all = 1; next }
    in_javascript_all && $1 == "version:" { print $2; exit }
  ' "${REPO_ROOT}/javascript/frameworks/cap/lib/codeql-pack.lock.yml"
)"

if [[ -z "${javascript_all_version}" ]]; then
  echo "Unable to resolve the locked codeql/javascript-all version." >&2
  exit 1
fi

javascript_all_qlpack="${HOME}/.codeql/packages/codeql/javascript-all/${javascript_all_version}/qlpack.yml"
if [[ ! -f "${javascript_all_qlpack}" ]]; then
  pack_resolution_file="${WORK_DIR}/resolved-packs.json"
  "${CODEQL_BIN}" resolve packs --kind=library --format=json > "${pack_resolution_file}"
  javascript_all_qlpack="$(
    jq -r --arg version "${javascript_all_version}" '
      .steps[]
      | select(.type == "by-name-and-version")
      | ((.found? // {})["codeql/javascript-all"]?[$version]?.path // empty)
    ' "${pack_resolution_file}" | head -n 1
  )"
fi

if [[ -z "${javascript_all_qlpack}" || ! -f "${javascript_all_qlpack}" ]]; then
  echo "codeql/javascript-all@${javascript_all_version} is not installed." >&2
  exit 1
fi

source_dir="${WORK_DIR}/source"
pack_dir="${WORK_DIR}/qlpacks"
compiled_dir="${WORK_DIR}/compiled"
smoke_query_dir="${source_dir}/smoke-query"
mkdir -p "${source_dir}" "${pack_dir}" "${compiled_dir}" "${smoke_query_dir}"

cp -R "$(dirname "${javascript_all_qlpack}")" "${source_dir}/javascript-all"
cp -R "${REPO_ROOT}/javascript/frameworks/cap/lib" "${source_dir}/cap-all"
cp -R "${REPO_ROOT}/javascript/frameworks/ui5/lib" "${source_dir}/ui5-all"
cp "${REPO_ROOT}/javascript/frameworks/cap/src/codeql-pack.lock.yml" \
  "${smoke_query_dir}/codeql-pack.lock.yml"

rm -f \
  "${source_dir}/cap-all/codeql-pack.lock.yml" \
  "${source_dir}/ui5-all/codeql-pack.lock.yml"

python3 - "${source_dir}" <<'PY'
from pathlib import Path
import sys

source_dir = Path(sys.argv[1])


def replace_dependencies(pack_dir: Path) -> None:
    qlpack = pack_dir / "qlpack.yml"
    lines = qlpack.read_text().splitlines(keepends=True)
    start = next(i for i, line in enumerate(lines) if line.rstrip() == "dependencies:")
    end = start + 1
    while end < len(lines) and lines[end].startswith("  "):
        end += 1
    lines[start:end] = ["dependencies: {}\n"]
    qlpack.write_text("".join(lines))


def pack_version(pack_dir: Path) -> str:
    for line in (pack_dir / "qlpack.yml").read_text().splitlines():
        if line.startswith("version:"):
            return line.split(":", 1)[1].strip()
    raise RuntimeError(f"Pack version not found in {pack_dir}")


replace_dependencies(source_dir / "cap-all")
replace_dependencies(source_dir / "ui5-all")

cap_version = pack_version(source_dir / "cap-all")
ui5_version = pack_version(source_dir / "ui5-all")
javascript_qlpack = source_dir / "javascript-all" / "qlpack.yml"
javascript_lines = javascript_qlpack.read_text().splitlines(keepends=True)
dependencies = next(
    i for i, line in enumerate(javascript_lines) if line.rstrip() == "dependencies:"
)
javascript_lines[dependencies + 1:dependencies + 1] = [
    f"  advanced-security/javascript-sap-cap-all: {cap_version}\n",
    f"  advanced-security/javascript-sap-ui5-all: {ui5_version}\n",
]
javascript_qlpack.write_text("".join(javascript_lines))

customizations = source_dir / "javascript-all" / "Customizations.qll"
with customizations.open("a") as output:
    output.write(
        "\nimport advanced_security.javascript_sap_cap_all.Customizations"
        "\nimport advanced_security.javascript_sap_ui5_all.Customizations\n"
    )
PY

cat > "${smoke_query_dir}/qlpack.yml" <<EOF
---
library: false
name: regression/javascript-custom-bundle
version: 0.0.0
extractor: javascript
dependencies:
  codeql/javascript-all: "${javascript_all_version}"
EOF

cat > "${smoke_query_dir}/Smoke.ql" <<'EOF'
import javascript

from Expr e
select e
EOF

echo "Bundling CAP and UI5 customization packs..."
"${CODEQL_BIN}" pack bundle --pack-path="${pack_dir}" -- "${source_dir}/cap-all"
"${CODEQL_BIN}" pack bundle --pack-path="${pack_dir}" -- "${source_dir}/ui5-all"

echo "Bundling customized codeql/javascript-all@${javascript_all_version}..."
"${CODEQL_BIN}" pack bundle \
  --pack-path="${pack_dir}" \
  --additional-packs="${pack_dir}" \
  -- "${source_dir}/javascript-all"

echo "Compiling a dependent smoke query against the customized standard library..."
"${CODEQL_BIN}" pack create \
  --threads=0 \
  --no-default-compilation-cache \
  --additional-packs="${pack_dir}" \
  --output="${compiled_dir}" \
  -- "${smoke_query_dir}"

echo "Customized JavaScript library compatibility test passed."
