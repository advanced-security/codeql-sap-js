#!/bin/sh

set -eu

# NOTE: the code below is copied in three places:
#  - scripts/compile-cds.sh
#  - extractors/cds/tools/autobuild.sh (here)
#  - extractors/javascript/tools/pre-finalize.sh
# Any changes should be synchronized between these three places.

exec "${CODEQL_DIST}/codeql" database index-files \
    --language cds \
    --total-size-limit 10m \
    --include-extension=.cds \
    --prune **/node_modules/**/* \
    --prune **/.eslint/**/* \
    "$CODEQL_EXTRACTOR_CDS_WIP_DATABASE"