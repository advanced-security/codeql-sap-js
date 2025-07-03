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

if ! command -v npm > /dev/null
then
    echo "npm executable is required (in PATH) to install the dependencies for the 'index-files.js' script."
    exit 3
fi

# Set the _cwd variable to the present working directory (PWD) as the directory
# from which this script was called, which we assume is the "source root" directory
# of the project that to be scanned / indexed.
_cwd="$PWD"
_script_dir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
_cds_extractor_js_path="${_script_dir}/dist/cds-extractor.js"
_cds_extractor_node_modules_dir="${_script_dir}/node_modules"

# Change to the directory of this shell script to ensure that npm looks up the
# package.json file in the correct directory and installs the dependencies
# (i.e. node_modules) relative to this directory. This is technically a violation
# of the assumption that extractor scripts will be run with the current working
# directory set to the root of the project source, but we also need node_modules
# to be installed here and not in the project source root, so we make the following
# compromise:
#
#  1. change to this shell script's directory;
#  2. pass the original working directory as a parameter to the
#     cds-extractor.js script;
#  3. expect the cds-extractor.js script to immediately change back to
#     original working (aka the project source root) directory.

cd "$_script_dir" && \

# Check if the 'node_modules' directory exists in the current script's directory.
# This is a highly imperfect check that CDS extractor dependencies have been installed.
if [ ! -d "${_cds_extractor_node_modules_dir}" ]; then
    echo "Installing dependencies for the CDS extractor script in '${_cds_extractor_node_modules_dir}' directory."
    if npm install --quiet --no-audit --no-fund ; then
        echo "CDS extractor dependencies installed successfully."
    else
        echo "Error: Failed to install CDS extractor dependencies."
        echo "Please ensure that the dependencies have been installed by running 'npm install' in the 'extractors/cds/tools' directory."
        exit 4
    fi
fi

# Check if the 'cds-extractor.js' script exists at the expected path.
if [ ! -f "${_cds_extractor_js_path}" ]; then
    echo "Building the 'cds-extractor.js' script from TypeScript source."
    if npm run build --silent; then
        echo "CDS extractor script built successfully."
    else
        echo "Error: Failed to build the CDS extractor script."
        echo "Please ensure that the TypeScript source has been compiled to JavaScript in the 'dist' directory."
        exit 5
    fi
fi

echo "Running the 'cds-extractor.js' script" && \
node "${_cds_extractor_js_path}" "$_cwd"
