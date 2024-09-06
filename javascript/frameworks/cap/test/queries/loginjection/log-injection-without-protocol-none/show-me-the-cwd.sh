#!/usr/bin/env bash

(cd $CODEQL_EXTRACTOR_JAVASCRIPT_WIP_DATABASE && pwd && for cds_file in $(find . -type f \( -iname '*.cds' \) -print  ); do cds compile $cds_file -2 json -o "$(dirname $cds_file)/$(basename $cds_file .cds).json" --locations; done)
