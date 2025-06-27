"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.determineProjectCompilationConfig = determineProjectCompilationConfig;
exports.configureProjectCompilations = configureProjectCompilations;
const path_1 = require("path");
const command_1 = require("./command");
const version_1 = require("./version");
const filesystem_1 = require("../../filesystem");
const logging_1 = require("../../logging");
/**
 * Extracts the expected @sap/cds version from a project's package.json
 * @param project The CDS project
 * @returns The expected CDS version or undefined if not found
 */
function getExpectedCdsVersion(project) {
    var _a, _b, _c;
    const packageJson = project.packageJson;
    if (!packageJson) {
        return undefined;
    }
    // Check dependencies first, then devDependencies
    const cdsVersion = (_b = (_a = packageJson.dependencies) === null || _a === void 0 ? void 0 : _a['@sap/cds']) !== null && _b !== void 0 ? _b : (_c = packageJson.devDependencies) === null || _c === void 0 ? void 0 : _c['@sap/cds'];
    if (cdsVersion) {
        // Remove version range specifiers (^, ~, >=, etc.) to get the base version
        return cdsVersion.replace(/^[\^~>=<]+/, '');
    }
    return undefined;
}
/**
 * Determines if a project should use project-level compilation based on its structure
 * @param project The CDS project
 * @param sourceRoot The source root directory
 * @returns true if project-level compilation should be used
 */
function shouldUseProjectLevelCompilation(project, sourceRoot) {
    // Check if this project has the typical CAP structure (db, srv directories)
    const projectAbsolutePath = (0, path_1.join)(sourceRoot, project.projectDir);
    const capDirectories = ['db', 'srv', 'app'];
    let hasCapStructure = false;
    for (const dir of capDirectories) {
        const dirPath = (0, path_1.join)(projectAbsolutePath, dir);
        if ((0, filesystem_1.dirExists)(dirPath)) {
            hasCapStructure = true;
            break;
        }
    }
    return hasCapStructure;
}
/**
 * Checks version compatibility between the project's expected CDS version and the available CDS command
 * @param cdsCommand The CDS command to check
 * @param cacheDir Optional cache directory
 * @param expectedVersion The expected CDS version from the project
 * @returns Version compatibility information
 */
function checkVersionCompatibility(cdsCommand, cacheDir, expectedVersion) {
    try {
        const actualVersion = (0, version_1.getCdsVersion)(cdsCommand, cacheDir);
        if (!actualVersion) {
            return {
                isCompatible: false,
                errorMessage: 'Could not determine CDS version',
            };
        }
        if (!expectedVersion) {
            // If no expected version, consider it compatible but log a warning
            (0, logging_1.cdsExtractorLog)('warn', `No expected CDS version found in project, using available version ${actualVersion}`);
            return {
                isCompatible: true,
                cdsVersion: actualVersion,
            };
        }
        // Extract major version numbers for compatibility check
        const actualMajor = parseInt(actualVersion.split('.')[0], 10);
        const expectedMajor = parseInt(expectedVersion.split('.')[0], 10);
        const isCompatible = actualMajor === expectedMajor;
        if (!isCompatible) {
            return {
                isCompatible: false,
                errorMessage: `Version mismatch: project expects @sap/cds v${expectedVersion} but available CDS command provides v${actualVersion}`,
                cdsVersion: actualVersion,
                expectedCdsVersion: expectedVersion,
            };
        }
        return {
            isCompatible: true,
            cdsVersion: actualVersion,
            expectedCdsVersion: expectedVersion,
        };
    }
    catch (error) {
        return {
            isCompatible: false,
            errorMessage: `Version check failed: ${String(error)}`,
        };
    }
}
/**
 * Determines the compilation configuration for a CDS project
 * @param project The CDS project
 * @param sourceRoot The source root directory
 * @param projectCacheDirMap Map of project directories to their cache directories
 * @returns The compilation configuration for the project
 */
function determineProjectCompilationConfig(project, sourceRoot, projectCacheDirMap) {
    const cacheDir = projectCacheDirMap.get(project.projectDir);
    const expectedCdsVersion = getExpectedCdsVersion(project);
    const useProjectLevelCompilation = shouldUseProjectLevelCompilation(project, sourceRoot);
    (0, logging_1.cdsExtractorLog)('info', `Determining compilation config for project ${project.projectDir}: cache=${cacheDir !== null && cacheDir !== void 0 ? cacheDir : 'none'}, expectedVersion=${expectedCdsVersion !== null && expectedCdsVersion !== void 0 ? expectedCdsVersion : 'none'}, projectLevel=${useProjectLevelCompilation}`);
    // Try to determine the best CDS command for this project
    let cdsCommand;
    let versionCompatibility;
    try {
        // First, try to use the cache-based command if available
        cdsCommand = (0, command_1.determineCdsCommand)(cacheDir, sourceRoot);
        versionCompatibility = checkVersionCompatibility(cdsCommand, cacheDir, expectedCdsVersion);
        if (!versionCompatibility.isCompatible && cacheDir) {
            // If cache-based command has version issues, try fallback without cache
            (0, logging_1.cdsExtractorLog)('warn', `Cache-based CDS command has version issues for project ${project.projectDir}: ${versionCompatibility.errorMessage}`);
            (0, logging_1.cdsExtractorLog)('info', 'Trying fallback CDS command without cache...');
            const fallbackCommand = (0, command_1.determineCdsCommand)(undefined, sourceRoot);
            const fallbackCompatibility = checkVersionCompatibility(fallbackCommand, undefined, expectedCdsVersion);
            if (fallbackCompatibility.isCompatible ||
                (!fallbackCompatibility.isCompatible && !versionCompatibility.isCompatible)) {
                // Use fallback if it's compatible, or if both are incompatible (prefer system command)
                cdsCommand = fallbackCommand;
                versionCompatibility = fallbackCompatibility;
                (0, logging_1.cdsExtractorLog)('info', `Using fallback CDS command for project ${project.projectDir}: ${cdsCommand}`);
            }
        }
    }
    catch (_a) {
        // If all else fails, try to get any available CDS command
        try {
            cdsCommand = (0, command_1.determineCdsCommand)(undefined, sourceRoot);
            versionCompatibility = checkVersionCompatibility(cdsCommand, undefined, expectedCdsVersion);
        }
        catch (fallbackError) {
            // No CDS command available at all
            throw new Error(`No CDS command available for project ${project.projectDir}: ${String(fallbackError)}`);
        }
    }
    (0, logging_1.cdsExtractorLog)('info', `Compilation config for ${project.projectDir}: command=${cdsCommand}, compatible=${versionCompatibility.isCompatible}`);
    return {
        cdsCommand,
        cacheDir,
        useProjectLevelCompilation,
        versionCompatibility,
    };
}
/**
 * Configures compilation for all projects in the project map
 * @param projectMap Map of project directories to CDS projects
 * @param sourceRoot The source root directory
 * @param projectCacheDirMap Map of project directories to their cache directories
 * @returns Updated project map with compilation configurations
 */
function configureProjectCompilations(projectMap, sourceRoot, projectCacheDirMap) {
    (0, logging_1.cdsExtractorLog)('info', 'Configuring compilation settings for all detected projects...');
    const configuredProjectMap = new Map();
    for (const [projectDir, project] of projectMap.entries()) {
        try {
            const compilationConfig = determineProjectCompilationConfig(project, sourceRoot, projectCacheDirMap);
            const configuredProject = {
                ...project,
                compilationConfig,
            };
            configuredProjectMap.set(projectDir, configuredProject);
            // Log any version compatibility issues
            if (!compilationConfig.versionCompatibility.isCompatible) {
                (0, logging_1.cdsExtractorLog)('warn', `Version compatibility issue in project ${projectDir}: ${compilationConfig.versionCompatibility.errorMessage}`);
            }
        }
        catch (error) {
            (0, logging_1.cdsExtractorLog)('error', `Failed to configure compilation for project ${projectDir}: ${String(error)}`);
            // Still add the project but without compilation config
            configuredProjectMap.set(projectDir, project);
        }
    }
    (0, logging_1.cdsExtractorLog)('info', `Compilation configuration completed for ${configuredProjectMap.size} projects`);
    return configuredProjectMap;
}
//# sourceMappingURL=configuration.js.map