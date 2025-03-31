#!/usr/bin/env bash

set -eu

# Do not extract CDS files if the CODEQL_EXTRACTOR_CDS_SKIP_EXTRACTION
# environment variable is set.
if [ -z "${CODEQL_EXTRACTOR_CDS_SKIP_EXTRACTION:-}" ]; then
    # Call the index-files command with the CDS extractor
    "${CODEQL_DIST}/codeql" database index-files \
        --include-extension=.cds \
        --language cds \
        --prune '**/node_modules/**/*' \
        --prune '**/.eslint/**/*' \
        --total-size-limit=10m \
        -- \
        "$CODEQL_EXTRACTOR_JAVASCRIPT_WIP_DATABASE"
fi

# Index UI5 *.view.xml files
"${CODEQL_DIST}/codeql" database index-files \
    --include-extension=.view.xml \
    --language xml \
    --prune '**/node_modules/**/*' \
    --prune '**/.eslint/**/*' \
    --total-size-limit=10m \
    -- \
    "$CODEQL_EXTRACTOR_JAVASCRIPT_WIP_DATABASE"

# UI5 also requires *.view.json files and *.view.html files be indexed, but these are indexed by
# default by CodeQL.

# XSJS also requires indexing of *.xsaccess files, *.xsjs files and xs-app.json files, but these
# are indexed by default by CodeQL.