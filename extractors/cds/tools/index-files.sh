#!/bin/bash

set -eu

echo "Indexing CDS files"

# Check if the list of files is empty
response_file="$1"

# If the response_file doesn't exist, terminate:
if [ ! -f "$response_file" ]; then
    echo "codeql database index-files --language cds terminated early as response file '$response_file' does not exist. This is because no CDS files were selected or found."
    exit 0
fi

# If the response_file is empty, terminate
if [ ! -s "$response_file" ]; then
    echo "codeql database index-files --language cds terminated early as response file '$response_file' is empty. This is because no CDS files were selected or found."
    exit 0
fi

# Determine if we have the cds command available, and if not, install the cds development kit
# in the appropriate directories
if ! command -v cds &> /dev/null
then
    echo "Pre-installing cds compiler"

    # Find all the directories containing a package.json with a dependency on @sap/cds, where
    # the directory contains at least one of the files listed in the response file (e.g. the
    # cds files we want to extract).
    #
    # We then install the cds development kit (@sap/cds-dk) in each directory, which makes the
    # `cds` command usable from the npx command within that directory.
    #
    # Nested package.json files simply cause the package to be installed in the parent node_modules
    # directory.
    #
    # We also ensure we skip node_modules, as we can end up in a recursive loop
    find . -type d -name node_modules -prune -false -o -type f \( -iname 'package.json' \) -exec grep -ql '@sap/cds' {} \; -execdir bash -c "grep -q \"^\$(pwd)\(/\|$\)\" \"$response_file\"" \; -execdir bash -c "echo \"Installing @sap/cds-dk into \$(pwd) to enable CDS compilation.\"" \; -execdir npm install --silent @sap/cds-dk \; -execdir npm install --silent \;

    # Use the npx command to dynamically install the cds development kit (@sap/cds-dk) package if necessary,
    # which then provides the cds command line tool in directories which are not covered by the package.json
    # install command approach above
    cds_command="npx -y --package @sap/cds-dk cds"
else
    cds_command="cds"
fi

echo "Processing CDS files to JSON"

# Run the cds compile command on each file in the response file, outputting the compiled JSON to a file with
# the same name
while IFS= read -r cds_file; do
    echo "Processing CDS file $cds_file to: $cds_file.json"
    # Avoid using the `-o` (or `--dest`) option as it sends output to a new directory, where we want to
    # output to a file in the same directory as the input file but with a .json extension.
    if ! $cds_command compile "$cds_file" -2 json --locations > "$cds_file.json" 2> "$cds_file.err"
    then
        stderr_truncated=`grep "^\[ERROR\]" "$cds_file.err" | tail -n 4`
        error_message=$'Could not compile the file '"$cds_file"$'.\nReported error(s):\n```\n'"$stderr_truncated"$'\n```'
        echo "$error_message"
        # Log an error diagnostic which appears on the status page
        "$CODEQL_DIST/codeql" database add-diagnostic --extractor-name cds --ready-for-status-page --source-id cds/compilation-failure --source-name "Failure to compile one or more SAP CAP CDS files" --severity error --markdown-message "$error_message" --file-path "$cds_file" "$CODEQL_EXTRACTOR_CDS_WIP_DATABASE"
    fi
done < "$response_file"

# Check if the JS extractor variables are set, and set them if not
if [ -z "${CODEQL_EXTRACTOR_JAVASCRIPT_ROOT:-}" ]; then
    # Find the JavaScript extractor location
    export CODEQL_EXTRACTOR_JAVASCRIPT_ROOT="$("$CODEQL_DIST/codeql" resolve extractor --language=javascript)"    

    # Set the JAVASCRIPT extractor environment variables to the same as the CDS extractor environment variables
    # so that the JS extractor will write to the CDS database
    export CODEQL_EXTRACTOR_JAVASCRIPT_WIP_DATABASE="$CODEQL_EXTRACTOR_CDS_WIP_DATABASE"
    export CODEQL_EXTRACTOR_JAVASCRIPT_DIAGNOSTIC_DIR="$CODEQL_EXTRACTOR_CDS_DIAGNOSTIC_DIR"
    export CODEQL_EXTRACTOR_JAVASCRIPT_LOG_DIR="$CODEQL_EXTRACTOR_CDS_LOG_DIR"
    export CODEQL_EXTRACTOR_JAVASCRIPT_SCRATCH_DIR="$CODEQL_EXTRACTOR_CDS_SCRATCH_DIR"
    export CODEQL_EXTRACTOR_JAVASCRIPT_TRAP_DIR="$CODEQL_EXTRACTOR_CDS_TRAP_DIR"
    export CODEQL_EXTRACTOR_JAVASCRIPT_SOURCE_ARCHIVE_DIR="$CODEQL_EXTRACTOR_CDS_SOURCE_ARCHIVE_DIR"
fi

# Check if LGTM_INDEX_FILTERS is already set
# This typically happens if "paths" or "paths-ignore" are set in the LGTM.yml file
if [ -z "${LGTM_INDEX_FILTERS:-}" ]; then
    exclude_filters=""
else
    echo $'Found \$LGTM_INDEX_FILTERS already set to:\n'"$LGTM_INDEX_FILTERS"
    # If it is set, we will try to honour the paths-ignore filter
    # Split by \n and find all the entries that start with exclude, excluding "exclude:**/*" and "exclude:**/*.*"
    # and then join them back together with \n
    exclude_filters=$'\n'"$(echo "$LGTM_INDEX_FILTERS" | grep '^exclude' | grep -v 'exclude:\*\*/\*\|exclude:\*\*/\*\.\*')"
fi

# Enable extraction of the cds.json files only
export LGTM_INDEX_FILTERS=$'exclude:**/*.*\ninclude:**/*.cds.json\ninclude:**/*.cds\nexclude:**/node_modules/**/*.*'"$exclude_filters"
echo "Setting \$LGTM_INDEX_FILTERS to:\n$LGTM_INDEX_FILTERS"
export LGTM_INDEX_TYPESCRIPT="NONE"
# Configure to copy over the CDS files as well, by pretending they are JSON
export LGTM_INDEX_FILETYPES=".cds:JSON"
# Ignore the LGTM_INDEX_INCLUDE variable for this purpose, as it may
# refer explicitly to .ts or .js files
unset LGTM_INDEX_INCLUDE

echo "Extracting the cds.json files"

# Invoke the JavaScript autobuilder to index the .cds.json files only
"$CODEQL_EXTRACTOR_JAVASCRIPT_ROOT"/tools/autobuild.sh