@echo off

REM This script currently:
REM - ignores any arguments passed to it;
REM - assumes it is run from the root of the project source directory;

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo node executable is required (in PATH) to run the 'cds-extractor.bundle.js' script. Please install Node.js and try again.
    exit /b 2
)

REM Set the _cwd variable to the present working directory as the directory
REM from which this script was called, which we assume is the "source root" directory
REM of the project that to be scanned / indexed.
set "_cwd=%CD%"
set "_script_dir=%~dp0"
set "_cds_extractor_bundle_path=%_script_dir%dist\cds-extractor.bundle.js"

REM Change to the directory of this batch script to maintain consistency with
REM the original approach for path resolution.
cd /d "%_script_dir%"

REM Check if the pre-built bundle exists
if exist "%_cds_extractor_bundle_path%" (
    echo Running the 'cds-extractor.bundle.js' script
    node "%_cds_extractor_bundle_path%" "%_cwd%"
) else (
    echo Error: CDS extractor bundle not found at '%_cds_extractor_bundle_path%'
    echo Please ensure that the bundle has been built by running 'npm run bundle' in the 'extractors\cds\tools' directory.
    exit /b 6
)
