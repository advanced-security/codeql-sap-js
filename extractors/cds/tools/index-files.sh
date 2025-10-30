#!/usr/bin/env bash

set -eu

## This script currently:
## - ignores any arguments passed to it;
## - assumes it is run from the root of the project source directory;
## 

if ! command -v node > /dev/null
then
    echo "node executable is required (in PATH) to run the 'cds-extractor.bundle.js' script. Please install Node.js and try again."
    exit 2
fi

# Set the _cwd variable to the present working directory (PWD) as the directory
# from which this script was called, which we assume is the "source root" directory
# of the project that to be scanned / indexed.
_cwd="$PWD"
_script_dir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
_cds_extractor_bundle_path="${_script_dir}/dist/cds-extractor.bundle.js"

# Change to the directory of this shell script to maintain consistency with
# the original approach for path resolution.
cd "$_script_dir"

# Check if the pre-built bundle exists
if [ -f "${_cds_extractor_bundle_path}" ]; then
    echo "Running the 'cds-extractor.bundle.js' script"
    node "${_cds_extractor_bundle_path}" "$_cwd"
else
    echo "Error: CDS extractor bundle not found at '${_cds_extractor_bundle_path}'"
    echo "Please ensure that the bundle has been built by running 'npm run bundle' in the 'extractors/cds/tools' directory."
    exit 6
fi
