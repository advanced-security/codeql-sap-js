#!/usr/bin/env bash

set -eu

if [ $# -ne 1 ]
then
    echo "Usage:  $0 <response_file_path>"
    exit 1
fi

if ! command -v node > /dev/null
then
    echo "node executable is required (in PATH) to run the 'cds-extractor.js' script. Please install Node.js and try again."
    exit 2
fi

if ! command -v npm > /dev/null
then
    echo "npm executable is required (in PATH) to install the dependencies for the 'cds-extractor.js' script."
    exit 3
fi

# Set the _cwd variable to the present working directory (PWD) as the directory
# from which this script was called, which we assume is the "source root" directory
# of the project that to be scanned / indexed.
_cwd="$PWD"
_response_file_path="$1"
_run_mode="index-files"
_script_dir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

echo "Checking response file for CDS files to index"

# Terminate early if the _response_file_path doesn't exist or is empty,
# which indicates that no CDS files were selected or found.
if [ ! -f "$_response_file_path" ] || [ ! -s "$_response_file_path" ]
then
    echo "'codeql database cds-extractor --language cds' command terminated early as response file '$_response_file_path' does not exist or is empty. This is because no CDS files were selected or found."
    # Exit without error to avoid failing any calling (javascript)
    # extractor, and llow the tool the report the lack of coverage
    # for CDS files.
    exit 0
fi

# Change to the directory of this script to ensure that npm looks up the
# package.json file in the correct directory and installs the dependencies
# (i.e. node_modules) relative to this directory. This is technically a
# violation of the assumption that extractor scripts will be run with the
# current working directory set to the root of the project source, but we
# also need node_modules to be installed here and not in the project source
# root, so we make a compromise of:
#  1. changing to this script's directory;
#  2. installing node dependencies here;
#  3. passing the original working directory as a parameter to the
#     cds-extractor.js script;
#  4. expecting the cds-extractor.js script to immediately change back to
#     original working (aka the project source root) directory.

cd "$_script_dir" && \
echo "Installing node package dependencies" && \
npm install --quiet --no-audit --no-fund && \
echo "Building TypeScript code" && \
npm run build && \
echo "Running the 'cds-extractor.js' script" && \
node "$(dirname "$0")/out/cds-extractor.js" "$_run_mode" "$_cwd" "$_response_file_path"
