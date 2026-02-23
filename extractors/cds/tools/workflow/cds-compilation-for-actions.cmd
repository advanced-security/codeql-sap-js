@echo off
REM CDS compilation script for GitHub Actions workflow (Windows)
REM Delegates all logic to the cross-platform Node.js script.
node "%~dp0compile-test-cds.mjs" %*
