#!/bin/bash

# Temporary test script for CDS compilation logic from GitHub Actions workflow
# Usage: ./cds-compilation-for-actions.test.sh

set -e

# Base directory to scan (relative to project root)
BASE_DIR="javascript/frameworks/cap/test"

# Navigate to project root directory (4 levels up from extractors/cds/tools/test/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../../" && pwd)"
cd "$PROJECT_ROOT"

# Verify base directory exists
if [ ! -d "$BASE_DIR" ]; then
  echo "Error: Base directory '$BASE_DIR' does not exist"
  echo "Current working directory: $(pwd)"
  echo "Expected path: $PROJECT_ROOT/$BASE_DIR"
  exit 1
fi

echo "Testing CDS compilation logic from GitHub Actions workflow"
echo "Project root: $PROJECT_ROOT"
echo "Base directory: $BASE_DIR"
echo "Working from: $(pwd)"
echo ""

# Function to resolve CDS-DK version based on package.json
# Follows the same logic as resolveCdsVersions in command.ts
resolve_cds_dk_version() {
  local package_json_path="$1"
  local minimum_version=8

  if [ ! -f "$package_json_path" ]; then
    echo "^$minimum_version"
    return
  fi

  # Extract @sap/cds and @sap/cds-dk versions from package.json using grep and sed
  local cds_version=""
  local cds_dk_version=""

  if grep -q '"@sap/cds"' "$package_json_path"; then
    cds_version=$(grep '"@sap/cds"' "$package_json_path" | sed -E 's/.*"@sap\/cds": "([^"]+)".*/\1/')
  fi

  if grep -q '"@sap/cds-dk"' "$package_json_path"; then
    cds_dk_version=$(grep '"@sap/cds-dk"' "$package_json_path" | sed -E 's/.*"@sap\/cds-dk": "([^"]+)".*/\1/')
  fi

  local preferred_dk_version=""

  if [ -n "$cds_dk_version" ]; then
    # Use explicit @sap/cds-dk version if available, but enforce minimum
    preferred_dk_version=$(enforce_minimum_version "$cds_dk_version" "$minimum_version")
  elif [ -n "$cds_version" ]; then
    # Derive compatible @sap/cds-dk version from @sap/cds version
    preferred_dk_version=$(derive_compatible_version "$cds_version" "$minimum_version")
  else
    # No version information found, use minimum
    preferred_dk_version="^$minimum_version"
  fi

  echo "$preferred_dk_version"
}

# Function to enforce minimum version requirement
enforce_minimum_version() {
  local version="$1"
  local minimum_version="$2"

  # Extract major version number (handle ^, ~, and plain numbers)
  local major_version=$(echo "$version" | sed -E 's/^[\^~]?([0-9]+).*/\1/')

  if [[ "$major_version" =~ ^[0-9]+$ ]]; then
    if [ "$major_version" -lt "$minimum_version" ]; then
      echo "^$minimum_version"
    else
      echo "$version"
    fi
  else
    echo "$version"
  fi
}

# Function to derive compatible @sap/cds-dk version from @sap/cds version
derive_compatible_version() {
  local cds_version="$1"
  local minimum_version="$2"

  # Extract major version and use same range
  local major_version=$(echo "$cds_version" | sed -E 's/^[\^~]?([0-9]+).*/\1/')

  if [[ "$major_version" =~ ^[0-9]+$ ]]; then
    local derived_version="^$major_version"
    # Apply minimum version enforcement
    enforce_minimum_version "$derived_version" "$minimum_version"
  else
    # Fallback if version can't be parsed - use minimum
    echo "^$minimum_version"
  fi
}

# Function to create relative path (macOS compatible)
get_relative_path() {
  local target="$1"
  local base="$2"

  # Use Python to calculate relative path (works on both macOS and Linux)
  python3 -c "import os.path; print(os.path.relpath('$target', '$base'))" 2>/dev/null || echo "$target"
}

# Clean up any existing model.cds.json files first
echo "Cleaning up existing model.cds.json files..."
find "$BASE_DIR" -name "model.cds.json" -type f -delete
echo "Cleanup completed."
echo ""

# Array to collect generated model.cds.json files
GENERATED_FILES=()

# Array to track processed directories to avoid duplicates
PROCESSED_DIRS=()

# Find test directories (those containing .expected files) and deduplicate
echo "Scanning for test directories..."
TEST_DIRS=($(find "$BASE_DIR" -type f -name '*.expected' -exec dirname {} \; | sort -u))

for test_dir in "${TEST_DIRS[@]}";
do
  # Skip if this directory has already been processed
  if [[ " ${PROCESSED_DIRS[@]} " =~ " ${test_dir} " ]]; then
    echo "Skipping already processed directory: $test_dir"
    continue
  fi

  echo "Processing test directory: $test_dir"

  # Change to test directory
  pushd "$test_dir" > /dev/null

  # Check if this directory contains any .cds files in supported locations
  echo "  Checking for CDS files in project directory: $(pwd)"
  CDS_FILES_FOUND=false

  # Check for .cds files in the base directory
  if find . -maxdepth 1 -type f -name '*.cds' | grep -q .; then
    CDS_FILES_FOUND=true
  fi

  # Check for .cds files in app/, db/, or srv/ subdirectories (including nested)
  if [ "$CDS_FILES_FOUND" = false ]; then
    for subdir in app db srv; do
      if [ -d "$subdir" ] && find "$subdir" -type f -name '*.cds' | grep -q .; then
        CDS_FILES_FOUND=true
        break
      fi
    done
  fi

  if [ "$CDS_FILES_FOUND" = false ]; then
    echo "  ⚠️  No .cds files found in base directory or app/db/srv subdirectories - skipping compilation"
    popd > /dev/null
    echo ""
    continue
  fi

  # Generate a single model.cds.json file per project directory,
  # aligning with the CDS extractor's standardized compilation behavior.
  echo "  Compiling CDS project in directory: $(pwd)"

  # Resolve the appropriate @sap/cds-dk version for this project
  local_package_json="$(pwd)/package.json"
  preferred_dk_version=$(resolve_cds_dk_version "$local_package_json")
  echo "  Resolved @sap/cds-dk version: $preferred_dk_version"

  # Determine compilation targets using simplified logic from CDS extractor
  COMPILE_TARGETS=""

  # Rule 1. index.cds if the test_dir directly contains an index.cds file (highest priority)
  if [ -f "index.cds" ]; then
    COMPILE_TARGETS="index.cds"
    echo "  Using index.cds as compilation target"
  else
    # Rule 2. app/ db/ srv/ if there are no .cds files directly in the test_dir
    ROOT_CDS_FILES=$(find . -maxdepth 1 -type f -name '*.cds' | wc -l)
    if [ "$ROOT_CDS_FILES" -eq 0 ]; then
      # No root CDS files, use CAP directories
      COMPILE_TARGETS="app db srv"
      echo "  Using CAP directories as compilation targets: app db srv"
    else
      # Rule 3. app/ db/ srv/ custom-alt.cds if there is some custom-alt.cds file directly in the test_dir
      ROOT_FILES=$(find . -maxdepth 1 -type f -name '*.cds' -printf '%f ' 2>/dev/null || find . -maxdepth 1 -type f -name '*.cds' | sed 's|^\./||' | tr '\n' ' ')
      COMPILE_TARGETS="app db srv $ROOT_FILES"
      echo "  Using CAP directories and root CDS files as compilation targets: app db srv $ROOT_FILES"
    fi
  fi

  # Use npx with project-specific version to ensure compatibility
  cds_dk_package="@sap/cds-dk@$preferred_dk_version"
  echo "  Running: npx --yes --package $cds_dk_package cds compile $COMPILE_TARGETS --locations --to json --dest model.cds.json"

  # Disable exit-on-error for this compilation attempt
  set +e
  npx --yes --package "$cds_dk_package" cds compile \
    $COMPILE_TARGETS \
    --locations \
    --to json \
    --dest "model.cds.json" \
    --log-level warn
  COMPILE_EXIT_CODE=$?
  set -e

  # Log compilation result
  if [ -f "model.cds.json" ]; then
    echo "  ✓ Successfully generated model.cds.json in $(pwd)"
    # Add to list of generated files (convert to relative path)
    RELATIVE_PATH=$(get_relative_path "$(pwd)/model.cds.json" "$PROJECT_ROOT")
    GENERATED_FILES+=("$RELATIVE_PATH")
    # Mark this directory as processed
    PROCESSED_DIRS+=("$test_dir")
  else
    echo "  ✗ Warning: model.cds.json was not generated in $(pwd) (exit code: $COMPILE_EXIT_CODE)"
    if [ -s "compilation.err" ]; then
      echo "  Compilation errors:"
      cat "compilation.err" | sed 's/^/    /'
    fi
  fi

  popd > /dev/null
  echo ""
done

echo "=== COMPILATION SUMMARY ==="
if [ ${#GENERATED_FILES[@]} -eq 0 ]; then
  echo "No model.cds.json files were generated."
else
  echo "Generated ${#GENERATED_FILES[@]} model.cds.json file(s):"
  for file in "${GENERATED_FILES[@]}"; do
    echo "  $file"
  done
fi

echo ""
echo "Test script completed."
