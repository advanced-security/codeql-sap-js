@echo off

if "%~1"=="" (
    echo Usage: %0 ^<response_file_path^>
    exit /b 1
)

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo node executable is required (in PATH) to run the 'cds-extractor.js' script. Please install Node.js and try again.
    exit /b 2
)

where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo npm executable is required (in PATH) to install the dependencies for the 'cds-extractor.js' script.
    exit /b 3
)

set "_response_file_path=%~1"
set "_run_mode=index-files"
set "_script_dir=%~dp0"
REM Set _cwd before changing the working directory to the script directory.
REM We assume this script is called from the source root directory of the
REM to be scanned project.
set "_cwd=%CD%"

echo Checking response file for CDS files to index

REM Terminate early if the _response_file_path doesn't exist or is empty,
REM which indicates that no CDS files were selected or found.
if not exist "%_response_file_path%" (
    echo 'codeql database cds-extractor --language cds' command terminated early as response file '%_response_file_path%' does not exist or is empty. This is because no CDS files were selected or found.
    exit /b 0
)

REM Change to the directory of this script to ensure that npm looks up the
REM package.json file in the correct directory and installs the dependencies
REM (i.e. node_modules) relative to this directory. This is technically a
REM violation of the assumption that extractor scripts will be run with the
REM current working directory set to the root of the project source, but we
REM also need node_modules to be installed here and not in the project source
REM root, so we make a compromise of:
REM  1. changing to this script's directory;
REM  2. installing node dependencies here;
REM  3. passing the original working directory as a parameter to the
REM     cds-extractor.js script;
REM  4. expecting the cds-extractor.js script to immediately change back to
REM     the original working (aka the project source root) directory.

cd /d "%_script_dir%" && ^
echo Installing node package dependencies && ^
npm install --quiet --no-audit --no-fund && ^
echo Building TypeScript code && ^
npm run build && ^
echo Running the 'cds-extractor.js' script && ^
node "%_script_dir%out\cds-extractor.js" "%_run_mode%" "%_cwd%" "%_response_file_path%"

exit /b %ERRORLEVEL%
