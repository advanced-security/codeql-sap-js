#!/usr/bin/env bash

set -eu

exec "${CODEQL_DIST}/codeql" database index-files \
    --include-extension=".cds" \
    --language="cds" \
    --prune="**/node_modules/**/*" \
    --prune="**/.eslint/**/*" \
    --total-size-limit="10m" \
    -- \
    "$CODEQL_EXTRACTOR_CDS_WIP_DATABASE"
