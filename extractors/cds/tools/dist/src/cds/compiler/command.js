"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetCdsCommandCache = resetCdsCommandCache;
exports.determineCdsCommand = determineCdsCommand;
exports.getCommandAnalysisForDebug = getCommandAnalysisForDebug;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
const shell_quote_1 = require("shell-quote");
const filesystem_1 = require("../../filesystem");
const logging_1 = require("../../logging");
// Global cache instance to share results across all calls
const cdsCommandCache = {
    commandResults: new Map(),
    availableCacheDirs: [],
    initialized: false,
};
/**
 * Reset the command cache - primarily for testing
 */
function resetCdsCommandCache() {
    cdsCommandCache.commandResults.clear();
    cdsCommandCache.availableCacheDirs = [];
    cdsCommandCache.globalCommand = undefined;
    cdsCommandCache.initialized = false;
}
/**
 * Check if a CDS command is available and working
 * @param command The command to test
 * @param sourceRoot The source root directory to use as cwd when testing the command
 * @param silent Whether to suppress logging of test failures
 * @returns Object with test result and version information
 */
function testCdsCommand(command, sourceRoot, silent = false) {
    // Check cache first
    const cachedResult = cdsCommandCache.commandResults.get(command);
    if (cachedResult) {
        return cachedResult;
    }
    try {
        // Try to run the command with --version to see if it works
        // CRITICAL: Use sourceRoot as cwd and clean environment to avoid conflicts
        let result;
        const cleanEnv = {
            ...process.env,
            // Remove any CodeQL-specific environment variables that might interfere
            CODEQL_EXTRACTOR_CDS_WIP_DATABASE: undefined,
            CODEQL_RUNNER: undefined,
        };
        if (command.includes('node ')) {
            // For node commands, we need to split and execute properly
            const parts = command.split(' ');
            const nodeExecutable = parts[0]; // 'node'
            const scriptPath = parts[1].replace(/"/g, ''); // Remove quotes from path
            result = (0, child_process_1.execFileSync)(nodeExecutable, [scriptPath, '--version'], {
                encoding: 'utf8',
                stdio: 'pipe',
                timeout: 5000, // Reduced timeout for faster failure
                cwd: sourceRoot,
                env: cleanEnv,
            }).toString();
        }
        else {
            // Use shell-quote to properly escape the command and prevent injection
            const escapedCommand = (0, shell_quote_1.quote)([command, '--version']);
            result = (0, child_process_1.execFileSync)('sh', ['-c', escapedCommand], {
                encoding: 'utf8',
                stdio: 'pipe',
                timeout: 5000, // Reduced timeout for faster failure
                cwd: sourceRoot,
                env: cleanEnv,
            }).toString();
        }
        // Extract version from output (typically in format "@sap/cds-dk: 6.1.3" or just "6.1.3")
        const versionMatch = result.match(/(\d+\.\d+\.\d+)/);
        const version = versionMatch ? versionMatch[1] : undefined;
        const testResult = { works: true, version };
        cdsCommandCache.commandResults.set(command, testResult);
        return testResult;
    }
    catch (error) {
        const errorMessage = String(error);
        if (!silent) {
            (0, logging_1.cdsExtractorLog)('debug', `CDS command test failed for '${command}': ${errorMessage}`);
        }
        const testResult = { works: false, error: errorMessage };
        cdsCommandCache.commandResults.set(command, testResult);
        return testResult;
    }
}
/**
 * Discover all available cache directories in the source tree
 * @param sourceRoot The source root directory
 * @returns Array of cache directory paths
 */
function discoverAvailableCacheDirs(sourceRoot) {
    if (cdsCommandCache.availableCacheDirs.length > 0) {
        return cdsCommandCache.availableCacheDirs;
    }
    const cacheRootDir = (0, path_1.join)(sourceRoot, '.cds-extractor-cache');
    const availableDirs = [];
    try {
        if ((0, fs_1.existsSync)(cacheRootDir)) {
            const entries = (0, fs_1.readdirSync)(cacheRootDir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory() && entry.name.startsWith('cds-')) {
                    const cacheDir = (0, path_1.join)(cacheRootDir, entry.name);
                    const cdsBin = (0, path_1.join)(cacheDir, 'node_modules', '.bin', 'cds');
                    if ((0, filesystem_1.fileExists)(cdsBin)) {
                        availableDirs.push(cacheDir);
                    }
                }
            }
        }
    }
    catch (error) {
        (0, logging_1.cdsExtractorLog)('debug', `Failed to discover cache directories: ${String(error)}`);
    }
    cdsCommandCache.availableCacheDirs = availableDirs;
    return availableDirs;
}
/**
 * Initialize the CDS command cache by testing global commands
 * @param sourceRoot The source root directory
 */
function initializeCdsCommandCache(sourceRoot) {
    var _a;
    if (cdsCommandCache.initialized) {
        return;
    }
    (0, logging_1.cdsExtractorLog)('info', 'Initializing CDS command cache...');
    // Test global commands first (most commonly used)
    const globalCommands = ['cds', 'npx -y --package @sap/cds-dk cds'];
    for (const command of globalCommands) {
        const result = testCdsCommand(command, sourceRoot, true); // Silent testing
        if (result.works) {
            cdsCommandCache.globalCommand = command;
            (0, logging_1.cdsExtractorLog)('info', `Found working global CDS command: ${command} (v${(_a = result.version) !== null && _a !== void 0 ? _a : 'unknown'})`);
            break;
        }
    }
    // Discover available cache directories
    const cacheDirs = discoverAvailableCacheDirs(sourceRoot);
    if (cacheDirs.length > 0) {
        (0, logging_1.cdsExtractorLog)('info', `Discovered ${cacheDirs.length} CDS cache director${cacheDirs.length === 1 ? 'y' : 'ies'}`);
    }
    cdsCommandCache.initialized = true;
}
/**
 * Get the best CDS command for a specific cache directory
 * @param cacheDir Optional specific cache directory
 * @param sourceRoot The source root directory
 * @returns The best CDS command to use
 */
function getBestCdsCommand(cacheDir, sourceRoot) {
    // Initialize cache if needed
    initializeCdsCommandCache(sourceRoot);
    // If a specific cache directory is provided and valid, prefer it
    if (cacheDir) {
        const localCdsBin = (0, path_1.join)(cacheDir, 'node_modules', '.bin', 'cds');
        if ((0, filesystem_1.fileExists)(localCdsBin)) {
            const result = testCdsCommand(localCdsBin, sourceRoot, true);
            if (result.works) {
                return localCdsBin;
            }
        }
    }
    // Try any available cache directories
    for (const availableCacheDir of cdsCommandCache.availableCacheDirs) {
        const localCdsBin = (0, path_1.join)(availableCacheDir, 'node_modules', '.bin', 'cds');
        const result = testCdsCommand(localCdsBin, sourceRoot, true);
        if (result.works) {
            return localCdsBin;
        }
    }
    // Fall back to global command
    if (cdsCommandCache.globalCommand) {
        return cdsCommandCache.globalCommand;
    }
    // Final fallback: test remaining npx options
    const fallbackCommands = ['npx -y --package @sap/cds cds', 'npx --yes @sap/cds-dk cds'];
    for (const command of fallbackCommands) {
        const result = testCdsCommand(command, sourceRoot, true);
        if (result.works) {
            return command;
        }
    }
    // Return the default fallback even if it doesn't work, as tests expect this behavior
    return 'npx -y --package @sap/cds-dk cds';
}
/**
 * Determine the `cds` command to use based on the environment and cache directory.
 *
 * This function uses a caching strategy to minimize repeated CLI command testing:
 * - Initializes a global cache on first call
 * - Tests global commands once and caches results
 * - Discovers all available cache directories upfront
 * - Reuses test results across multiple calls
 */
function determineCdsCommand(cacheDir, sourceRoot) {
    try {
        // Always use the efficient path - debug information is collected separately
        return getBestCdsCommand(cacheDir, sourceRoot);
    }
    catch (error) {
        const errorMessage = `Failed to determine CDS command: ${String(error)}`;
        (0, logging_1.cdsExtractorLog)('error', errorMessage);
        throw new Error(errorMessage);
    }
}
/**
 * Get detailed command analysis for debug purposes
 * This replaces the old performComprehensiveAnalysis function
 */
function getCommandAnalysisForDebug(cacheDir, sourceRoot) {
    try {
        initializeCdsCommandCache(sourceRoot);
        const availableCommands = [];
        let selectedCommand = null;
        let selectedVersion;
        // Test cache directory if provided
        if (cacheDir) {
            const localCdsBin = (0, path_1.join)(cacheDir, 'node_modules', '.bin', 'cds');
            const result = testCdsCommand(localCdsBin, sourceRoot);
            availableCommands.push({
                strategy: 'provided-cache',
                command: localCdsBin,
                version: result.version,
                error: result.error,
            });
            if (result.works && !selectedCommand) {
                selectedCommand = localCdsBin;
                selectedVersion = result.version;
            }
        }
        // Test all available cache directories
        for (const availableCacheDir of cdsCommandCache.availableCacheDirs) {
            const localCdsBin = (0, path_1.join)(availableCacheDir, 'node_modules', '.bin', 'cds');
            const result = testCdsCommand(localCdsBin, sourceRoot);
            availableCommands.push({
                strategy: 'cached-local',
                command: localCdsBin,
                version: result.version,
                error: result.error,
            });
            if (result.works && !selectedCommand) {
                selectedCommand = localCdsBin;
                selectedVersion = result.version;
            }
        }
        // Test global commands
        const globalCommands = [
            { command: 'cds', strategy: 'global-cds' },
            { command: 'npx -y --package @sap/cds-dk cds', strategy: 'npx-cds-dk' },
            { command: 'npx -y --package @sap/cds cds', strategy: 'npx-cds' },
        ];
        for (const { command, strategy } of globalCommands) {
            const result = testCdsCommand(command, sourceRoot);
            availableCommands.push({
                strategy,
                command,
                version: result.version,
                error: result.error,
            });
            if (result.works && !selectedCommand) {
                selectedCommand = command;
                selectedVersion = result.version;
            }
        }
        if (!selectedCommand) {
            throw new Error(`No working CDS command found. Tested ${availableCommands.length} options.`);
        }
        return {
            selectedCommand,
            selectedVersion,
            availableCommands,
        };
    }
    catch (error) {
        throw new Error(`Failed to analyze CDS commands: ${String(error)}`);
    }
}
//# sourceMappingURL=command.js.map