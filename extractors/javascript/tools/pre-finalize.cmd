@echo off

if not defined CODEQL_EXTRACTOR_CDS_SKIP_EXTRACTION (
    echo Running database index-files for CDS ^(.cds^) files ...

    type NUL && "%CODEQL_DIST%\codeql.exe" database index-files ^
        --include-extension=.cds ^
        --language cds ^
        --prune **\node_modules\**\* ^
        --prune **\.eslint\**\* ^
        --total-size-limit=10m ^
        -- ^
        "%CODEQL_EXTRACTOR_JAVASCRIPT_WIP_DATABASE%"

    if errorlevel 1 (
        echo database index-files for CDS ^(.cds^) files failed.
        exit /b 1
    )

    echo Finished running database index-files for CDS ^(.cds^) files.
)

echo Running database index-files for UI5 (.view.xml and .fragment.xml) files ...

where node >nul 2>nul
if errorlevel 1 goto ui5_legacy
if not exist "%~dp0index-ui5.js" goto ui5_legacy

node "%~dp0index-ui5.js"
goto ui5_status

:ui5_legacy
echo Warning: Node.js or index-ui5.js is unavailable; using legacy UI5 indexing without source-path filters. 1>&2
type NUL && "%CODEQL_DIST%\codeql.exe" database index-files ^
    --include-extension=.view.xml ^
    --include-extension=.fragment.xml ^
    --language=xml ^
    --prune **\node_modules\**\* ^
    --prune **\.eslint\**\* ^
    --total-size-limit=10m ^
    -- ^
    "%CODEQL_EXTRACTOR_JAVASCRIPT_WIP_DATABASE%"

:ui5_status
if %ERRORLEVEL% neq 0 (
    echo database index-files for UI5 ^(.view.xml and .fragment.xml^) files failed with exit code %ERRORLEVEL%.
    exit /b %ERRORLEVEL%
)

echo Finished running database index-files for UI5 ^(.view.xml and .fragment.xml^) files.

REM UI5 also requires *.view.json files and *.view.html files be indexed, but these are indexed by
REM default by CodeQL.

REM XSJS also requires indexing of *.xsaccess files, *.xsjs files and xs-app.json files, but these
REM are indexed by default by CodeQL.

exit /b %ERRORLEVEL%