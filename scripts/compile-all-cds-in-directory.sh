#!/bin/bash
# !!!!!!! Run it at the root of a CAP application, where its package.json is !!!!!!!

# Ensure that we have the `cds` command
npm install @sap/cds

# Compile all .cds files to .json
for cds_file in $(find . -type f \( -iname '*.cds' \) -print)
do
    npx cds compile $cds_file \
        -2 json \
        -o "$cds_file.json" \
        --locations
done
