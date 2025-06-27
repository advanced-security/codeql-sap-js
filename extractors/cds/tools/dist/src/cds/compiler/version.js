"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCdsVersion = getCdsVersion;
const child_process_1 = require("child_process");
const path_1 = require("path");
/**
 * Get the CDS compiler version from a specific command or cache directory
 * @param cdsCommand The CDS command to use
 * @param cacheDir Optional path to a directory containing installed dependencies
 * @returns The CDS compiler version string, or undefined if it couldn't be determined
 */
function getCdsVersion(cdsCommand, cacheDir) {
    var _a;
    try {
        // Set up environment vars if using a cache directory
        const spawnOptions = {
            shell: true,
            stdio: 'pipe',
            env: { ...process.env },
        };
        // If a cache directory is provided, set NODE_PATH to use that cache
        if (cacheDir) {
            const nodePath = (0, path_1.join)(cacheDir, 'node_modules');
            // Set up environment to use the cached dependencies
            spawnOptions.env = {
                ...process.env,
                NODE_PATH: `${nodePath}${path_1.delimiter}${(_a = process.env.NODE_PATH) !== null && _a !== void 0 ? _a : ''}`,
                PATH: `${(0, path_1.join)(nodePath, '.bin')}${path_1.delimiter}${process.env.PATH}`,
                npm_config_prefix: cacheDir,
            };
        }
        // Execute the CDS command with the --version flag
        const result = (0, child_process_1.spawnSync)(cdsCommand, ['--version'], spawnOptions);
        if (result.status === 0 && result.stdout) {
            const versionOutput = result.stdout.toString().trim();
            // Extract version number, which is typically in formats like "@sap/cds: 6.1.3" or similar
            const match = versionOutput.match(/@sap\/cds[^0-9]*([0-9]+\.[0-9]+\.[0-9]+)/);
            if (match === null || match === void 0 ? void 0 : match[1]) {
                return match[1]; // Return just the version number
            }
            return versionOutput; // Return full output if we couldn't parse it
        }
        return undefined;
    }
    catch (_b) {
        return undefined;
    }
}
//# sourceMappingURL=version.js.map