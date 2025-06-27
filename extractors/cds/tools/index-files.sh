#!/usr/bin/env bash

set -eu

## This script currently:
## - ignores any arguments passed to it;
## - assumes it is run from the root of the project source directory;
## 

if ! command -v node > /dev/null
then
    echo "node executable is required (in PATH) to run the 'cds-extractor.js' script. Please install Node.js and try again."
    exit 2
fi

# Set the _cwd variable to the present working directory (PWD) as the directory
# from which this script was called, which we assume is the "source root" directory
# of the project that to be scanned / indexed.
_cwd="$PWD"
_script_dir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
_cds_extractor_js_path="${_script_dir}/dist/cds-extractor.js"
_cds_extractor_node_modules_dir="${_script_dir}/node_modules"

if [ ! -f "${_cds_extractor_js_path}" ]; then
    echo "Error: The 'cds-extractor.js' script does not exist at the expected path: ${_cds_extractor_js_path}"
    echo "Please ensure that the script has been built and is available in the 'dist' directory."
    exit 3
fi

if [ ! -d "${_cds_extractor_node_modules_dir}" ]; then
    echo "Error: The 'node_modules' directory does not exist at the expected path: ${_cds_extractor_node_modules_dir}"
    echo "Please ensure that the dependencies have been installed by running 'npm install' in the 'extractors/cds/tools' directory."
    exit 4
fi

# Change to the directory of this shell script to ensure that npm looks up the
# package.json file in the correct directory and installs the dependencies
# (i.e. node_modules) relative to this directory. This is technically a
# violation of the assumption that extractor scripts will be run with the
# current working directory set to the root of the project source, but we
# also need node_modules to be installed here and not in the project source
# root, so we make a compromise of:
#  1. changing to this shell script's directory;
#  2. passing the original working directory as a parameter to the
#     cds-extractor.js script;
#  3. expecting the cds-extractor.js script to immediately change back to
#     original working (aka the project source root) directory.

cd "$_script_dir" && \
echo "Running the 'cds-extractor.js' script" && \
node "${_cds_extractor_js_path}" "$_cwd"
