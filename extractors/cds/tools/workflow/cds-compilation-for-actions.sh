#!/bin/bash
# CDS compilation script for GitHub Actions workflow (Linux/macOS)
# Delegates all logic to the cross-platform Node.js script.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/compile-test-cds.mjs" "$@"
