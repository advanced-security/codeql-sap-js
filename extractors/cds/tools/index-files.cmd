@echo off

REM This script currently:
REM - ignores any arguments passed to it;
REM - assumes it is run from the root of the project source directory;

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo node executable is required (in PATH) to run the 'cds-extractor.js' script. Please install Node.js and try again.
    exit /b 2
)

where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo npm executable is required (in PATH) to install the dependencies for the 'index-files.js' script.
    exit /b 3
)

REM Set the _cwd variable to the present working directory as the directory
REM from which this script was called, which we assume is the "source root" directory
REM of the project that to be scanned / indexed.
set "_cwd=%CD%"
set "_script_dir=%~dp0"
set "_cds_extractor_js_path=%_script_dir%dist\cds-extractor.js"
set "_cds_extractor_node_modules_dir=%_script_dir%node_modules"

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

REM Check if the 'node_modules' directory exists in the current script's directory.
REM This is a highly imperfect check that CDS extractor dependencies have been installed.
if not exist "%_cds_extractor_node_modules_dir%" (
    echo Installing dependencies for the CDS extractor script in '%_cds_extractor_node_modules_dir%' directory.
    npm install --quiet --no-audit --no-fund
    if %ERRORLEVEL% equ 0 (
        echo CDS extractor dependencies installed successfully.
    ) else (
        echo Error: Failed to install CDS extractor dependencies.
        echo Please ensure that the dependencies have been installed by running 'npm install' in the 'extractors\cds\tools' directory.
        exit /b 4
    )
)

REM Check if the 'cds-extractor.js' script exists at the expected path.
if not exist "%_cds_extractor_js_path%" (
    echo Building the 'cds-extractor.js' script from TypeScript source.
    npm run build --silent
    if %ERRORLEVEL% equ 0 (
        echo CDS extractor script built successfully.
    ) else (
        echo Error: Failed to build the CDS extractor script.
        echo Please ensure that the TypeScript source has been compiled to JavaScript in the 'dist' directory.
        exit /b 5
    )
)

echo Running the 'cds-extractor.js' script && ^
node "%_cds_extractor_js_path%" "%_cwd%"
