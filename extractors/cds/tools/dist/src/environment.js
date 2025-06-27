"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlatformInfo = getPlatformInfo;
exports.getCodeQLExePath = getCodeQLExePath;
exports.getJavaScriptExtractorRoot = getJavaScriptExtractorRoot;
exports.setupJavaScriptExtractorEnv = setupJavaScriptExtractorEnv;
exports.getAutobuildScriptPath = getAutobuildScriptPath;
exports.configureLgtmIndexFilters = configureLgtmIndexFilters;
exports.setupAndValidateEnvironment = setupAndValidateEnvironment;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
const filesystem_1 = require("./filesystem");
const logging_1 = require("./logging");
/**
 * Get platform information
 * @returns Platform information including OS platform, architecture, and whether it's Windows
 */
function getPlatformInfo() {
    const osPlatform = (0, os_1.platform)();
    const osPlatformArch = (0, os_1.arch)();
    const isWindows = osPlatform === 'win32';
    const exeExtension = isWindows ? '.exe' : '';
    return {
        platform: osPlatform,
        arch: osPlatformArch,
        isWindows,
        exeExtension,
    };
}
/**
 * Get the path to the CodeQL executable.
 * Prioritizes CODEQL_DIST if set and valid. Otherwise, tries to find CodeQL via system PATH.
 * @returns The resolved path to the CodeQL executable, or an empty string if not found.
 */
function getCodeQLExePath() {
    const platformInfo = getPlatformInfo();
    const codeqlExeName = platformInfo.isWindows ? 'codeql.exe' : 'codeql';
    // First, check if CODEQL_DIST is set and valid
    const codeqlDist = process.env.CODEQL_DIST;
    if (codeqlDist) {
        const codeqlPathFromDist = (0, path_1.resolve)((0, path_1.join)(codeqlDist, codeqlExeName));
        if ((0, fs_1.existsSync)(codeqlPathFromDist)) {
            (0, logging_1.cdsExtractorLog)('info', `Using CodeQL executable from CODEQL_DIST: ${codeqlPathFromDist}`);
            return codeqlPathFromDist;
        }
        else {
            (0, logging_1.cdsExtractorLog)('error', `CODEQL_DIST is set to '${codeqlDist}', but CodeQL executable was not found at '${codeqlPathFromDist}'. Please ensure this path is correct. Falling back to PATH-based discovery.`);
            // Fall through to PATH-based discovery
        }
    }
    // CODEQL_DIST is not set or was invalid, attempt to find CodeQL via system PATH using 'codeql version --format=json'
    (0, logging_1.cdsExtractorLog)('info', 'CODEQL_DIST environment variable not set or invalid. Attempting to find CodeQL executable via system PATH using "codeql version --format=json".');
    try {
        const versionOutput = (0, child_process_1.execFileSync)(codeqlExeName, ['version', '--format=json'], {
            encoding: 'utf8',
            timeout: 5000, // 5 seconds timeout
            stdio: 'pipe', // Suppress output to console
        });
        try {
            const versionInfo = JSON.parse(versionOutput);
            if (versionInfo &&
                typeof versionInfo.unpackedLocation === 'string' &&
                versionInfo.unpackedLocation) {
                const resolvedPathFromVersion = (0, path_1.resolve)((0, path_1.join)(versionInfo.unpackedLocation, codeqlExeName));
                if ((0, fs_1.existsSync)(resolvedPathFromVersion)) {
                    (0, logging_1.cdsExtractorLog)('info', `CodeQL executable found via 'codeql version --format=json' at: ${resolvedPathFromVersion}`);
                    return resolvedPathFromVersion;
                }
                (0, logging_1.cdsExtractorLog)('warn', `'codeql version --format=json' provided unpackedLocation '${versionInfo.unpackedLocation}', but executable not found at '${resolvedPathFromVersion}'.`);
            }
            else {
                (0, logging_1.cdsExtractorLog)('warn', "Could not determine CodeQL executable path from 'codeql version --format=json' output. 'unpackedLocation' field missing, empty, or invalid.");
            }
        }
        catch (parseError) {
            (0, logging_1.cdsExtractorLog)('warn', `Failed to parse 'codeql version --format=json' output: ${String(parseError)}. Output was: ${versionOutput}`);
        }
    }
    catch (error) {
        let errorMessage = `INFO: Failed to find CodeQL executable via 'codeql version --format=json'. Error: ${String(error)}`;
        if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
            errorMessage += `\nINFO: The command '${codeqlExeName}' was not found in your system PATH.`;
        }
        (0, logging_1.cdsExtractorLog)('info', errorMessage);
    }
    (0, logging_1.cdsExtractorLog)('error', 'Failed to determine CodeQL executable path. Please ensure the CODEQL_DIST environment variable is set and points to a valid CodeQL distribution, or that the CodeQL CLI (codeql) is available in your system PATH and "codeql version --format=json" can provide its location.');
    return ''; // Return empty string if all attempts fail
}
/**
 * Get the JavaScript extractor root path.
 * @param codeqlExePath The path to the CodeQL executable. If empty, resolution will be skipped.
 * @returns The JavaScript extractor root path, or an empty string if not found or if codeqlExePath is empty.
 */
function getJavaScriptExtractorRoot(codeqlExePath) {
    var _a;
    let jsExtractorRoot = (_a = process.env.CODEQL_EXTRACTOR_JAVASCRIPT_ROOT) !== null && _a !== void 0 ? _a : '';
    if (jsExtractorRoot) {
        (0, logging_1.cdsExtractorLog)('info', `Using JavaScript extractor root from environment variable CODEQL_EXTRACTOR_JAVASCRIPT_ROOT: ${jsExtractorRoot}`);
        return jsExtractorRoot;
    }
    if (!codeqlExePath) {
        (0, logging_1.cdsExtractorLog)('warn', 'Cannot resolve JavaScript extractor root because the CodeQL executable path was not provided or found.');
        return '';
    }
    try {
        jsExtractorRoot = (0, child_process_1.execFileSync)(codeqlExePath, ['resolve', 'extractor', '--language=javascript'], { stdio: 'pipe' })
            .toString()
            .trim();
        if (jsExtractorRoot) {
            (0, logging_1.cdsExtractorLog)('info', `JavaScript extractor root resolved to: ${jsExtractorRoot}`);
        }
        else {
            (0, logging_1.cdsExtractorLog)('warn', `'codeql resolve extractor --language=javascript' using '${codeqlExePath}' returned an empty path.`);
        }
    }
    catch (error) {
        (0, logging_1.cdsExtractorLog)('error', `Error resolving JavaScript extractor root using '${codeqlExePath}': ${String(error)}`);
        jsExtractorRoot = ''; // Ensure it's empty on error
    }
    return jsExtractorRoot;
}
/**
 * Set JavaScript extractor environment variables using CDS extractor variables
 */
function setupJavaScriptExtractorEnv() {
    process.env.CODEQL_EXTRACTOR_JAVASCRIPT_WIP_DATABASE =
        process.env.CODEQL_EXTRACTOR_CDS_WIP_DATABASE;
    process.env.CODEQL_EXTRACTOR_JAVASCRIPT_DIAGNOSTIC_DIR =
        process.env.CODEQL_EXTRACTOR_CDS_DIAGNOSTIC_DIR;
    process.env.CODEQL_EXTRACTOR_JAVASCRIPT_LOG_DIR = process.env.CODEQL_EXTRACTOR_CDS_LOG_DIR;
    process.env.CODEQL_EXTRACTOR_JAVASCRIPT_SCRATCH_DIR =
        process.env.CODEQL_EXTRACTOR_CDS_SCRATCH_DIR;
    process.env.CODEQL_EXTRACTOR_JAVASCRIPT_TRAP_DIR = process.env.CODEQL_EXTRACTOR_CDS_TRAP_DIR;
    process.env.CODEQL_EXTRACTOR_JAVASCRIPT_SOURCE_ARCHIVE_DIR =
        process.env.CODEQL_EXTRACTOR_CDS_SOURCE_ARCHIVE_DIR;
}
/**
 * Get the path to the autobuild script
 * @param jsExtractorRoot The JavaScript extractor root path
 * @returns The path to the autobuild script, or an empty string if jsExtractorRoot is empty.
 */
function getAutobuildScriptPath(jsExtractorRoot) {
    if (!jsExtractorRoot)
        return '';
    const platformInfo = getPlatformInfo();
    const autobuildScriptName = platformInfo.isWindows ? 'autobuild.cmd' : 'autobuild.sh';
    return (0, path_1.resolve)((0, path_1.join)(jsExtractorRoot, 'tools', autobuildScriptName));
}
/**
 * Configure LGTM index filters for CDS files
 */
function configureLgtmIndexFilters() {
    let excludeFilters = '';
    if (process.env.LGTM_INDEX_FILTERS) {
        (0, logging_1.cdsExtractorLog)('info', `Found $LGTM_INDEX_FILTERS already set to:
${process.env.LGTM_INDEX_FILTERS}`);
        const allowedExcludePatterns = [(0, path_1.join)('exclude:**', '*'), (0, path_1.join)('exclude:**', '*.*')];
        excludeFilters =
            '\n' +
                process.env.LGTM_INDEX_FILTERS.split('\n')
                    .filter(line => line.startsWith('exclude') &&
                    !allowedExcludePatterns.some(pattern => line.includes(pattern)))
                    .join('\n');
    }
    // Enable extraction of the .cds.json files only.
    const lgtmIndexFiltersPatterns = [
        (0, path_1.join)('exclude:**', '*.*'),
        (0, path_1.join)('include:**', '*.cds.json'),
        (0, path_1.join)('include:**', '*.cds'),
        (0, path_1.join)('exclude:**', 'node_modules', '**', '*.*'),
    ].join('\n');
    process.env.LGTM_INDEX_FILTERS = lgtmIndexFiltersPatterns + excludeFilters;
    process.env.LGTM_INDEX_TYPESCRIPT = 'NONE';
    // Configure to copy over the .cds files as well, by pretending they are JSON.
    process.env.LGTM_INDEX_FILETYPES = '.cds:JSON';
}
/**
 * Sets up the environment and validates key components for running the CDS extractor.
 * This includes checking for the CodeQL executable, validating the source root directory,
 * and setting up environment variables for the JavaScript extractor.
 *
 * @param sourceRoot The source root directory.
 *
 * @returns The {@link EnvironmentSetupResult} containing success status, error messages,
 *          CodeQL executable path, JavaScript extractor root, autobuild script path,
 *          and platform information.
 *
 * @throws Will throw an error if the environment setup fails.
 */
function setupAndValidateEnvironment(sourceRoot) {
    const errorMessages = [];
    const platformInfo = getPlatformInfo();
    // Get the CodeQL executable path
    const codeqlExePath = getCodeQLExePath();
    if (!codeqlExePath) {
        errorMessages.push('Failed to find CodeQL executable. Ensure CODEQL_DIST is set and valid, or CodeQL CLI is in PATH.');
    }
    // Validate that the required source root directory exists
    if (!(0, filesystem_1.dirExists)(sourceRoot)) {
        errorMessages.push(`Project root directory '${sourceRoot}' does not exist.`);
    }
    // Get JavaScript extractor root
    const jsExtractorRoot = getJavaScriptExtractorRoot(codeqlExePath);
    if (!jsExtractorRoot) {
        if (codeqlExePath) {
            // Only add this error if codeqlExePath was found but JS extractor root wasn't
            errorMessages.push('Failed to determine JavaScript extractor root using the found CodeQL executable.');
        }
        else {
            // If codeqlExePath is empty, the error from getCodeQLExePath is usually sufficient.
            // However, we can add a more specific one if needed.
            errorMessages.push('Cannot determine JavaScript extractor root because CodeQL executable was not found.');
        }
    }
    // Set environment variables for JavaScript extractor only if jsExtractorRoot is valid
    if (jsExtractorRoot) {
        process.env.CODEQL_EXTRACTOR_JAVASCRIPT_ROOT = jsExtractorRoot;
        setupJavaScriptExtractorEnv();
    }
    // Get autobuild script path
    const autobuildScriptPath = jsExtractorRoot ? getAutobuildScriptPath(jsExtractorRoot) : '';
    // Not having an autobuild script path might be an error depending on the run mode,
    // but for now, the function just returns what it found.
    return {
        success: errorMessages.length === 0,
        errorMessages,
        codeqlExePath, // Will be '' if not found
        jsExtractorRoot, // Will be '' if not found
        autobuildScriptPath,
        platformInfo,
    };
}
//# sourceMappingURL=environment.js.map