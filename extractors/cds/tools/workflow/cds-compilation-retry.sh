#!/usr/bin/env bash

# CDS Compilation Retry Test Script
# 
# This script tests the CDS compilation retry feature by simulating failed compilation
# scenarios that should trigger the retry mechanism. It works by:
# 
# 1. Removing existing .cds.json files at specified paths (simulate initial state)
# 2. Watching for file creation at those paths (detect CDS extractor output)
# 3. Removing newly created files once (simulate compilation failure to trigger retry)
# 4. Allowing subsequent file creation to succeed (verify retry works)
#
# WORKFLOW:
# - Start this script in background or separate terminal BEFORE running CDS extractor
# - The script will clean up any existing .cds.json files
# - When CDS extractor creates .cds.json files, this script removes them immediately
# - CDS extractor should detect missing files and trigger retry mechanism
# - On retry, CDS extractor creates files again, script allows them to remain
# - Result: Tests that retry mechanism correctly detects and recovers from failures
#
# Usage: ./cds-compilation-retry.test.sh <source_root> <relative_path1> [relative_path2] ...
#
# Arguments:
#   source_root    : Full path to the directory that CDS extractor will scan
#   relative_path* : Relative paths from source_root to .cds.json files to monitor
#
# Example:
#   ./cds-compilation-retry.test.sh ~/some-base-path/cloud-cap-samples bookstore/model.cds.json bookshop/model.alt.cds.json
#
# Expected behavior:
#   - Files like /path/to/cloud-cap-samples/bookstore/model.cds.json will be:
#     1. Deleted if they exist initially
#     2. Deleted within 1 second of being created (first time)
#     3. Left alone when created again (second time - retry success)

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validate input arguments
if [ $# -lt 2 ]; then
    log_error "Usage: $0 <source_root> <relative_path1> [relative_path2] ..."
    log_error "Example: $0 /path/to/source bookstore/model.cds.json bookshop/model.alt.cds.json"
    exit 1
fi

SOURCE_ROOT="$1"
shift
RELATIVE_PATHS=("$@")

# Remove trailing slash from SOURCE_ROOT to avoid double slashes in paths
SOURCE_ROOT="${SOURCE_ROOT%/}"

# Validate source root directory
if [ ! -d "$SOURCE_ROOT" ]; then
    log_error "Source root directory does not exist: $SOURCE_ROOT"
    exit 1
fi

log_info "CDS Compilation Retry Test Script starting..."
log_info "Source root: $SOURCE_ROOT"
log_info "Target files: ${RELATIVE_PATHS[*]}"

# Build full paths and track removal status
declare -A FILE_REMOVED_ONCE
declare -A FILE_COMPLETED
for relative_path in "${RELATIVE_PATHS[@]}"; do
    full_path="$SOURCE_ROOT/$relative_path"
    FILE_REMOVED_ONCE["$full_path"]="false"
    FILE_COMPLETED["$full_path"]="false"
    log_info "Will monitor: $full_path"
    
    # Create directory if it doesn't exist
    dir_path="$(dirname "$full_path")"
    if [ ! -d "$dir_path" ]; then
        log_info "Creating directory: $dir_path"
        mkdir -p "$dir_path"
    fi
    
    # Remove existing file if present
    if [ -f "$full_path" ]; then
        rm "$full_path"
        log_success "Removed existing file: $full_path"
    fi
done

# Set up signal handler for clean exit
cleanup() {
    log_info "Script interrupted, cleaning up..."
}
trap cleanup EXIT INT TERM

log_info "Starting file monitoring (press Ctrl+C to stop)..."

# Simple infinite polling loop
while true; do
    active_files=0
    
    for relative_path in "${RELATIVE_PATHS[@]}"; do
        full_path="$SOURCE_ROOT/$relative_path"
        
        # Skip files that are already completed
        if [ "${FILE_COMPLETED[$full_path]}" = "true" ]; then
            continue
        fi
        
        active_files=$((active_files + 1))
        
        if [ -f "$full_path" ]; then
            if [ "${FILE_REMOVED_ONCE[$full_path]}" = "false" ]; then
                # First creation: Remove file to simulate compilation failure
                log_warning "File created, removing to trigger retry: $full_path"
                rm "$full_path"
                FILE_REMOVED_ONCE["$full_path"]="true"
                log_success "File removed (retry will be triggered): $full_path"
            else
                # Second creation: Allow file to remain and mark as completed
                log_success "File created and allowed to remain (retry succeeded): $full_path"
                FILE_COMPLETED["$full_path"]="true"
                active_files=$((active_files - 1))
            fi
        fi
    done
    
    # Exit if no more files to monitor
    if [ $active_files -eq 0 ]; then
        log_success "All files have been processed successfully. Exiting."
        break
    fi
    
    # Sleep for 0.5 seconds before next check
    sleep 0.5
done
