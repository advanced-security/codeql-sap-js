#!/bin/bash
# !!!!!!! Run it at javascript/frameworks/cap/test/queries/test/queries/ !!!!!!!

#test if codeql is on the path
if command -v codeql
   then

# Remember current directory
TEST_DIR=$(pwd)

# Ensure that we have the `cds` command
if ! command -v cds &> /dev/null
then
    npm install -g @sap/cds
fi

# Loop over all the directories in the test directory
for dir in *; do
    # Change to the directory
    cd $dir

    # Remember this folder's name
    FOLDER_NAME=$(basename $(pwd))

    # Enable XML extraction
    export LGTM_INDEX_XML_MODE='ALL'

    # Enable JSON extraction
    export LGTM_INDEX_FILTERS=include:**/*.json

    # Compile all .cds files to .json
    ./compile-all-cds-in-directory.sh

    # Create CodeQL database
    codeql database create $FOLDER_NAME --language=javascript --overwrite

    # Change back to the test directory
    cd $TEST_DIR
done

echo "Done!"

else
    echo "Add CodeQL to PATH!"
fi
