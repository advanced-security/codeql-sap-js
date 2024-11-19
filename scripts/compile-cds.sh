#!/bin/bash

# To use this script with the CodeQL CLI:
# 1. Set the `codeql database create` `--search-path`` argument to the `extractors/` directory in this repository, e.g.:
#    ```
#    codeql database create --language javascript --search-path path/to/this/repo/extractors/ ...
#    ```
# 2. Run this script as an additional build command, for example by providing the
#    `--command path/to/this/compile-cds.sh` argument to `codeql database create`.
#
# To use this script with the GitHub Actions workflow:
#  1. Set the `CODEQL_ACTION_EXTRA_OPTIONS` env var when running the `github/codeql-action/init` action
#     to add the `--search-path` option as above.
#     ```
#     - name: Initialize CodeQL
#       uses: github/codeql-action/init@v3
#       env:
#         CODEQL_ACTION_EXTRA_OPTIONS: '{"database":{"init":["--search-path","${{ github.workspace }}/extractors"]}}'
#       ....
#     ```
# 2. Run the script as a command before the `github/codeql-action/analyze` step, e.g:
#     ```
#     - name: Run CDS extractor
#       run: |
#         path/to/this/compile-cds.sh`

set -eu

# NOTE: the code below is copied in three places:
#  - scripts/compile-cds.sh (here)
#  - extractors/cds/tools/autobuild.sh
#  - extractors/javascript/tools/pre-finalize.sh
# Any changes should be synchronized between these three places.

# Do not extract CDS files if the CODEQL_EXTRACTOR_CDS_SKIP_EXTRACTION environment variable is set
if [ -z "${CODEQL_EXTRACTOR_CDS_SKIP_EXTRACTION:-}" ]; then
    # Call the index-files command with the CDS extractor
    "$CODEQL_DIST/codeql" database index-files \
        --language cds \
        --total-size-limit 10m \
        --include-extension=.cds \
        --prune **/node_modules/**/* \
        --prune **/.eslint/**/* \
        "$CODEQL_EXTRACTOR_JAVASCRIPT_WIP_DATABASE"
fi