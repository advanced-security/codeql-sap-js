@echo off

REM This script currently:
REM - ignores any arguments passed to it;
REM - assumes it is run from the root of the project source directory;

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo node executable is required (in PATH) to run the 'cds-extractor.js' script. Please install Node.js and try again.
    exit /b 2
)

REM Set the _cwd variable to the present working directory as the directory
REM from which this script was called, which we assume is the "source root" directory
REM of the project that to be scanned / indexed.
set "_cwd=%CD%"
set "_script_dir=%~dp0"
set "_cds_extractor_js_path=%_script_dir%dist\cds-extractor.js"
set "_cds_extractor_node_modules_dir=%_script_dir%node_modules"

if not exist "%_cds_extractor_js_path%" (
    echo Error: The 'cds-extractor.js' script does not exist at the expected path: %_cds_extractor_js_path%
    echo Please ensure that the script has been built and is available in the 'dist' directory.
    exit /b 3
)

if not exist "%_cds_extractor_node_modules_dir%" (
    echo Error: The 'node_modules' directory does not exist at the expected path: %_cds_extractor_node_modules_dir%
    echo Please ensure that the dependencies have been installed by running 'npm install' in the 'extractors\cds\tools' directory.
    exit /b 4
)

REM Change to the directory of this batch script to ensure that npm looks up the
REM package.json file in the correct directory and installs the dependencies
REM (i.e. node_modules) relative to this directory. This is technically a
REM violation of the assumption that extractor scripts will be run with the
REM current working directory set to the root of the project source, but we
REM also need node_modules to be installed here and not in the project source
REM root, so we make a compromise of:
REM  1. changing to this batch script's directory;
REM  2. passing the original working directory as a parameter to the
REM     cds-extractor.js script;
REM  3. expecting the cds-extractor.js script to immediately change back to
REM     original working (aka the project source root) directory.

cd /d "%_script_dir%" && ^
echo Running the 'cds-extractor.js' script && ^
node "%_cds_extractor_js_path%" "%_cwd%"
