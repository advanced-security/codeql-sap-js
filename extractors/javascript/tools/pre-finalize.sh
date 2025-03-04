#!/usr/bin/env bash

set -eu

# Do not extract CDS files if the CODEQL_EXTRACTOR_CDS_SKIP_EXTRACTION
# environment variable is set.
if [ -z "${CODEQL_EXTRACTOR_CDS_SKIP_EXTRACTION:-}" ]; then
    # Call the index-files command with the CDS extractor
    "${CODEQL_DIST}/codeql" database index-files \
        --include-extension=.cds \
        --language cds \
        --prune **/node_modules/**/* \
        --prune **/.eslint/**/* \
        --total-size-limit=10m \
        -- \
        "$CODEQL_EXTRACTOR_JAVASCRIPT_WIP_DATABASE"
fi