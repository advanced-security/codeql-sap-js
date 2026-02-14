@echo off
setlocal enabledelayedexpansion

REM CDS compilation script for GitHub Actions workflow (Windows version)
REM This script compiles .cds files to .cds.json format for CodeQL analysis
REM Usage: cds-compilation-for-actions.cmd

REM Base directory to scan (relative to project root)
set "BASE_DIR=javascript\frameworks\cap\test"

REM Navigate to project root directory (4 levels up from extractors\cds\tools\workflow\)
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%..\..\..\.."
pushd "%PROJECT_ROOT%"

REM Verify base directory exists
if not exist "%BASE_DIR%" (
    echo Error: Base directory '%BASE_DIR%' does not exist
    echo Current working directory: %CD%
    echo Expected path: %PROJECT_ROOT%\%BASE_DIR%
    exit /b 1
)

echo CDS compilation script for Windows
echo Project root: %PROJECT_ROOT%
echo Base directory: %BASE_DIR%
echo Working from: %CD%
echo.

REM Clean up any existing model.cds.json files first
echo Cleaning up existing model.cds.json files...
for /r "%BASE_DIR%" %%F in (model.cds.json) do (
    if exist "%%F" (
        del /q "%%F"
    )
)
echo Cleanup completed.
echo.

REM Create a temporary file to store test directories
set "TEMP_DIRS=%TEMP%\cds_test_dirs_%RANDOM%.txt"
if exist "%TEMP_DIRS%" del /q "%TEMP_DIRS%"

REM Find test directories (those containing .expected files)
echo Scanning for test directories...
for /r "%BASE_DIR%" %%F in (*.expected) do (
    set "DIR=%%~dpF"
    set "DIR=!DIR:~0,-1!"
    echo !DIR! >> "%TEMP_DIRS%"
)

REM Remove duplicates from the list
if exist "%TEMP_DIRS%" (
    sort "%TEMP_DIRS%" | findstr /v "^$" > "%TEMP_DIRS%.tmp"
    move /y "%TEMP_DIRS%.tmp" "%TEMP_DIRS%" >nul
)

REM Array to track processed directories (using file-based approach)
set "PROCESSED_DIRS=%TEMP%\cds_processed_%RANDOM%.txt"
if exist "%PROCESSED_DIRS%" del /q "%PROCESSED_DIRS%"

REM Counter for generated files
set GENERATED_COUNT=0

REM Process each test directory
for /f "usebackq delims=" %%D in ("%TEMP_DIRS%") do (
    set "TEST_DIR=%%D"

    REM Check if directory already processed
    set "ALREADY_PROCESSED=0"
    if exist "%PROCESSED_DIRS%" (
        findstr /x /c:"!TEST_DIR!" "%PROCESSED_DIRS%" >nul 2>&1
        if !errorlevel! equ 0 (
            echo Skipping already processed directory: !TEST_DIR!
            set "ALREADY_PROCESSED=1"
        )
    )

    if !ALREADY_PROCESSED! equ 0 (
        echo Processing test directory: !TEST_DIR!

        REM Change to test directory
        pushd "!TEST_DIR!"

        REM Check if this directory contains any .cds files in supported locations
        echo   Checking for CDS files in project directory: !CD!
        set "CDS_FILES_FOUND=0"

        REM Check for .cds files in the base directory
        for %%F in (*.cds) do (
            if exist "%%F" (
                set "CDS_FILES_FOUND=1"
            )
        )

        REM Check for .cds files in app\, db\, or srv\ subdirectories
        if !CDS_FILES_FOUND! equ 0 (
            for %%S in (app db srv) do (
                if exist "%%S\" (
                    for %%F in ("%%S\*.cds") do (
                        set "CDS_FILES_FOUND=1"
                    )
                )
            )
        )

        if !CDS_FILES_FOUND! equ 0 (
            echo   Warning: No .cds files found in base directory or app/db/srv subdirectories - skipping compilation
            popd
            echo.
        ) else (
            echo   Compiling CDS project in directory: !CD!

            REM Resolve the appropriate @sap/cds-dk version for this project
            set "PACKAGE_JSON=!CD!\package.json"
            call :resolve_cds_dk_version "!PACKAGE_JSON!" CDS_DK_VERSION
            echo   Resolved @sap/cds-dk version: !CDS_DK_VERSION!

            REM Determine compilation targets using simplified logic from CDS extractor
            set "COMPILE_TARGETS="

            REM Rule 1: index.cds if the test_dir directly contains an index.cds file (highest priority)
            if exist "index.cds" (
                set "COMPILE_TARGETS=index.cds"
                echo   Using index.cds as compilation target
            ) else (
                REM Count root CDS files
                set "ROOT_CDS_COUNT=0"
                for %%F in (*.cds) do (
                    if exist "%%F" set /a ROOT_CDS_COUNT+=1
                )

                REM Rule 2: app\ db\ srv\ if there are no .cds files directly in the test_dir
                if !ROOT_CDS_COUNT! equ 0 (
                    set "COMPILE_TARGETS=app db srv"
                    echo   Using CAP directories as compilation targets: app db srv
                ) else (
                    REM Rule 3: app\ db\ srv\ custom-alt.cds if there is some custom-alt.cds file directly in the test_dir
                    set "COMPILE_TARGETS=app db srv"
                    for %%F in (*.cds) do (
                        if exist "%%F" set "COMPILE_TARGETS=!COMPILE_TARGETS! %%F"
                    )
                    echo   Using CAP directories and root CDS files as compilation targets: !COMPILE_TARGETS!
                )
            )

            REM Use npx with project-specific version to ensure compatibility
            set "CDS_DK_PACKAGE=@sap/cds-dk@!CDS_DK_VERSION!"
            echo   Running: npx --yes --package !CDS_DK_PACKAGE! cds compile !COMPILE_TARGETS! --locations --to json --dest model.cds.json

            REM Run compilation (allow failures)
            npx --yes --package "!CDS_DK_PACKAGE!" cds compile !COMPILE_TARGETS! --locations --to json --dest "model.cds.json" --log-level warn
            set "COMPILE_EXIT_CODE=!errorlevel!"

            REM Log compilation result
            if exist "model.cds.json" (
                echo   Success: Successfully generated model.cds.json in !CD!
                set /a GENERATED_COUNT+=1
                REM Mark this directory as processed
                echo !TEST_DIR! >> "%PROCESSED_DIRS%"
            ) else (
                echo   Warning: model.cds.json was not generated in !CD! (exit code: !COMPILE_EXIT_CODE!)
            )

            popd
            echo.
        )
    )
)

echo === COMPILATION SUMMARY ===
if !GENERATED_COUNT! equ 0 (
    echo No model.cds.json files were generated.
) else (
    echo Generated !GENERATED_COUNT! model.cds.json file(s)
)

echo.
echo CDS compilation completed.

REM Cleanup temporary files
if exist "%TEMP_DIRS%" del /q "%TEMP_DIRS%"
if exist "%PROCESSED_DIRS%" del /q "%PROCESSED_DIRS%"

popd
exit /b 0

REM ============================================================================
REM Function to resolve CDS-DK version based on package.json
REM Follows the same logic as resolveCdsVersions in command.ts
REM ============================================================================
:resolve_cds_dk_version
setlocal
set "PACKAGE_JSON_PATH=%~1"
set "MINIMUM_VERSION=8"

if not exist "%PACKAGE_JSON_PATH%" (
    endlocal & set "%~2=^%MINIMUM_VERSION%"
    exit /b 0
)

REM Extract @sap/cds and @sap/cds-dk versions from package.json
set "CDS_VERSION="
set "CDS_DK_VERSION="

REM Use findstr to search for the versions in package.json
for /f "tokens=2 delims=:, " %%V in ('findstr /c:"\"@sap/cds\"" "%PACKAGE_JSON_PATH%"') do (
    set "CDS_VERSION=%%~V"
)

for /f "tokens=2 delims=:, " %%V in ('findstr /c:"\"@sap/cds-dk\"" "%PACKAGE_JSON_PATH%"') do (
    set "CDS_DK_VERSION=%%~V"
)

set "PREFERRED_DK_VERSION="

if defined CDS_DK_VERSION (
    REM Use explicit @sap/cds-dk version if available, but enforce minimum
    call :enforce_minimum_version "!CDS_DK_VERSION!" %MINIMUM_VERSION% PREFERRED_DK_VERSION
) else if defined CDS_VERSION (
    REM Derive compatible @sap/cds-dk version from @sap/cds version
    call :derive_compatible_version "!CDS_VERSION!" %MINIMUM_VERSION% PREFERRED_DK_VERSION
) else (
    REM No version information found, use minimum
    set "PREFERRED_DK_VERSION=^%MINIMUM_VERSION%"
)

endlocal & set "%~2=%PREFERRED_DK_VERSION%"
exit /b 0

REM ============================================================================
REM Function to enforce minimum version requirement
REM ============================================================================
:enforce_minimum_version
setlocal
set "VERSION=%~1"
set "MINIMUM_VERSION=%~2"

REM Remove ^ or ~ prefix and extract major version
set "VERSION_CLEAN=%VERSION:~=-%"
set "VERSION_CLEAN=%VERSION_CLEAN:^=%"
for /f "tokens=1 delims=." %%M in ("%VERSION_CLEAN%") do set "MAJOR_VERSION=%%M"

REM Check if major version is numeric and less than minimum
set "IS_NUMERIC=1"
echo %MAJOR_VERSION%| findstr /r "^[0-9][0-9]*$" >nul || set "IS_NUMERIC=0"

if %IS_NUMERIC% equ 1 (
    if %MAJOR_VERSION% lss %MINIMUM_VERSION% (
        endlocal & set "%~3=^%MINIMUM_VERSION%"
    ) else (
        endlocal & set "%~3=%VERSION%"
    )
) else (
    endlocal & set "%~3=%VERSION%"
)
exit /b 0

REM ============================================================================
REM Function to derive compatible @sap/cds-dk version from @sap/cds version
REM ============================================================================
:derive_compatible_version
setlocal
set "CDS_VERSION=%~1"
set "MINIMUM_VERSION=%~2"

REM Extract major version
set "CDS_VERSION_CLEAN=%CDS_VERSION:~=-%"
set "CDS_VERSION_CLEAN=%CDS_VERSION_CLEAN:^=%"
for /f "tokens=1 delims=." %%M in ("%CDS_VERSION_CLEAN%") do set "MAJOR_VERSION=%%M"

REM Check if major version is numeric
set "IS_NUMERIC=1"
echo %MAJOR_VERSION%| findstr /r "^[0-9][0-9]*$" >nul || set "IS_NUMERIC=0"

if %IS_NUMERIC% equ 1 (
    set "DERIVED_VERSION=^%MAJOR_VERSION%"
    REM Apply minimum version enforcement
    call :enforce_minimum_version "!DERIVED_VERSION!" %MINIMUM_VERSION% RESULT
    endlocal & set "%~3=%RESULT%"
) else (
    REM Fallback if version can't be parsed - use minimum
    endlocal & set "%~3=^%MINIMUM_VERSION%"
)
exit /b 0
