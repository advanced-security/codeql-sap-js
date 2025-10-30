@echo off

if not defined CODEQL_EXTRACTOR_CDS_SKIP_EXTRACTION (
    type NUL && "%CODEQL_DIST%\codeql.exe" database index-files ^
        --include-extension=.cds ^
        --language cds ^
        --prune **\node_modules\**\* ^
        --prune **\.eslint\**\* ^
        --total-size-limit=10m ^
        -- ^
        "%CODEQL_EXTRACTOR_JAVASCRIPT_WIP_DATABASE%"
)

exit /b %ERRORLEVEL%