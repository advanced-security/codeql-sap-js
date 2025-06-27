"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.installDependencies = installDependencies;
const child_process_1 = require("child_process");
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = require("path");
const diagnostics_1 = require("../diagnostics");
const logging_1 = require("../logging");
const versionResolver_1 = require("./versionResolver");
const cacheSubDirName = '.cds-extractor-cache';
/**
 * Extracts unique dependency combinations from the dependency graph.
 * @param projects A map of projects from the dependency graph.
 * @returns An array of unique dependency combinations.
 */
function extractUniqueDependencyCombinations(projects) {
    var _a, _b, _c, _d;
    const combinations = new Map();
    for (const project of Array.from(projects.values())) {
        if (!project.packageJson) {
            continue;
        }
        const cdsVersion = (_b = (_a = project.packageJson.dependencies) === null || _a === void 0 ? void 0 : _a['@sap/cds']) !== null && _b !== void 0 ? _b : 'latest';
        const cdsDkVersion = (_d = (_c = project.packageJson.devDependencies) === null || _c === void 0 ? void 0 : _c['@sap/cds-dk']) !== null && _d !== void 0 ? _d : cdsVersion;
        // Resolve versions first to ensure we cache based on actual resolved versions
        const resolvedVersions = (0, versionResolver_1.resolveCdsVersions)(cdsVersion, cdsDkVersion);
        const { resolvedCdsVersion, resolvedCdsDkVersion, ...rest } = resolvedVersions;
        // Calculate hash based on resolved versions to ensure proper cache reuse
        const actualCdsVersion = resolvedCdsVersion !== null && resolvedCdsVersion !== void 0 ? resolvedCdsVersion : cdsVersion;
        const actualCdsDkVersion = resolvedCdsDkVersion !== null && resolvedCdsDkVersion !== void 0 ? resolvedCdsDkVersion : cdsDkVersion;
        const hash = (0, crypto_1.createHash)('sha256')
            .update(`${actualCdsVersion}|${actualCdsDkVersion}`)
            .digest('hex');
        if (!combinations.has(hash)) {
            combinations.set(hash, {
                cdsVersion,
                cdsDkVersion,
                hash,
                resolvedCdsVersion: resolvedCdsVersion !== null && resolvedCdsVersion !== void 0 ? resolvedCdsVersion : undefined,
                resolvedCdsDkVersion: resolvedCdsDkVersion !== null && resolvedCdsDkVersion !== void 0 ? resolvedCdsDkVersion : undefined,
                ...rest,
            });
        }
    }
    return Array.from(combinations.values());
}
/**
 * Add a warning diagnostic for dependency version fallback
 * @param packageJsonPath Path to the package.json file
 * @param warningMessage The warning message
 * @param codeqlExePath Path to the CodeQL executable
 * @returns True if the diagnostic was added, false otherwise
 */
function addDependencyVersionWarning(packageJsonPath, warningMessage, codeqlExePath) {
    var _a;
    try {
        (0, child_process_1.execFileSync)(codeqlExePath, [
            'database',
            'add-diagnostic',
            '--extractor-name=cds',
            '--ready-for-status-page',
            '--source-id=cds/dependency-version-fallback',
            '--source-name=Using fallback versions for SAP CAP CDS dependencies',
            `--severity=${diagnostics_1.DiagnosticSeverity.Warning}`,
            `--markdown-message=${warningMessage}`,
            `--file-path=${(0, path_1.resolve)(packageJsonPath)}`,
            '--',
            `${(_a = process.env.CODEQL_EXTRACTOR_CDS_WIP_DATABASE) !== null && _a !== void 0 ? _a : ''}`,
        ]);
        (0, logging_1.cdsExtractorLog)('info', `Added warning diagnostic for dependency fallback: ${packageJsonPath}`);
        return true;
    }
    catch (err) {
        (0, logging_1.cdsExtractorLog)('error', `Failed to add warning diagnostic for ${packageJsonPath}: ${String(err)}`);
        return false;
    }
}
/**
 * Attempt to install dependencies in a cache directory with fallback logic
 * @param cacheDir Cache directory path
 * @param combination Dependency combination to install
 * @param cacheDirName Name of the cache directory for logging
 * @param packageJsonPath Optional package.json path for diagnostics
 * @param codeqlExePath Optional CodeQL executable path for diagnostics
 * @returns True if installation succeeded, false otherwise
 */
function installDependenciesInCache(cacheDir, combination, cacheDirName, packageJsonPath, codeqlExePath) {
    const { resolvedCdsVersion, resolvedCdsDkVersion, isFallback, warning } = combination;
    // Check if node_modules directory already exists in the cache dir
    const nodeModulesExists = (0, fs_1.existsSync)((0, path_1.join)(cacheDir, 'node_modules', '@sap', 'cds')) &&
        (0, fs_1.existsSync)((0, path_1.join)(cacheDir, 'node_modules', '@sap', 'cds-dk'));
    if (nodeModulesExists) {
        (0, logging_1.cdsExtractorLog)('info', `Using cached dependencies for @sap/cds@${resolvedCdsVersion} and @sap/cds-dk@${resolvedCdsDkVersion} from ${cacheDirName}`);
        // Add warning diagnostic if using fallback versions
        if (isFallback && warning && packageJsonPath && codeqlExePath) {
            addDependencyVersionWarning(packageJsonPath, warning, codeqlExePath);
        }
        return true;
    }
    if (!resolvedCdsVersion || !resolvedCdsDkVersion) {
        (0, logging_1.cdsExtractorLog)('error', 'Cannot install dependencies: no compatible versions found');
        return false;
    }
    // Install dependencies in the cache directory
    (0, logging_1.cdsExtractorLog)('info', `Installing @sap/cds@${resolvedCdsVersion} and @sap/cds-dk@${resolvedCdsDkVersion} in cache directory: ${cacheDirName}`);
    if (isFallback && warning) {
        (0, logging_1.cdsExtractorLog)('warn', warning);
    }
    try {
        (0, child_process_1.execFileSync)('npm', ['install', '--quiet', '--no-audit', '--no-fund'], {
            cwd: cacheDir,
            stdio: 'inherit',
        });
        // Add warning diagnostic if using fallback versions
        if (isFallback && warning && packageJsonPath && codeqlExePath) {
            addDependencyVersionWarning(packageJsonPath, warning, codeqlExePath);
        }
        return true;
    }
    catch (err) {
        const errorMessage = `Failed to install resolved dependencies in cache directory ${cacheDir}: ${err instanceof Error ? err.message : String(err)}`;
        (0, logging_1.cdsExtractorLog)('error', errorMessage);
        return false;
    }
}
/**
 * Install dependencies for CDS projects using a robust cache strategy with fallback logic
 * @param dependencyGraph The dependency graph of the project
 * @param sourceRoot Source root directory
 * @param codeqlExePath Path to the CodeQL executable (optional)
 * @returns Map of project directories to their corresponding cache directories
 */
function installDependencies(dependencyGraph, sourceRoot, codeqlExePath) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    // Sanity check that we found at least one project
    if (dependencyGraph.projects.size === 0) {
        (0, logging_1.cdsExtractorLog)('warn', 'failed to detect any CDS projects for dependency installation.');
        (0, logging_1.cdsExtractorLog)('info', 'This is expected if the source contains no CAP/CDS projects.');
        return new Map();
    }
    // Extract unique dependency combinations from all projects with version resolution
    const dependencyCombinations = extractUniqueDependencyCombinations(dependencyGraph.projects);
    if (dependencyCombinations.length === 0) {
        (0, logging_1.cdsExtractorLog)('warn', 'No CDS dependencies found in any project.');
        (0, logging_1.cdsExtractorLog)('info', 'Will attempt to use system-installed CDS tools if available.');
        return new Map();
    }
    (0, logging_1.cdsExtractorLog)('info', `Found ${dependencyCombinations.length} unique CDS dependency combination(s).`);
    // Log each dependency combination for transparency
    for (const combination of dependencyCombinations) {
        const { cdsVersion, cdsDkVersion, hash, resolvedCdsVersion, resolvedCdsDkVersion, isFallback } = combination;
        const actualCdsVersion = resolvedCdsVersion !== null && resolvedCdsVersion !== void 0 ? resolvedCdsVersion : cdsVersion;
        const actualCdsDkVersion = resolvedCdsDkVersion !== null && resolvedCdsDkVersion !== void 0 ? resolvedCdsDkVersion : cdsDkVersion;
        const fallbackNote = isFallback ? ' (using fallback versions)' : '';
        (0, logging_1.cdsExtractorLog)('info', `Dependency combination ${hash.substring(0, 8)}: @sap/cds@${actualCdsVersion}, @sap/cds-dk@${actualCdsDkVersion}${fallbackNote}`);
    }
    // Create a cache directory under the source root directory.
    const cacheRootDir = (0, path_1.join)(sourceRoot, cacheSubDirName);
    (0, logging_1.cdsExtractorLog)('info', `Using cache directory '${cacheSubDirName}' within source root directory '${cacheRootDir}'`);
    if (!(0, fs_1.existsSync)(cacheRootDir)) {
        try {
            (0, fs_1.mkdirSync)(cacheRootDir, { recursive: true });
            (0, logging_1.cdsExtractorLog)('info', `Created cache directory: ${cacheRootDir}`);
        }
        catch (err) {
            (0, logging_1.cdsExtractorLog)('warn', `Failed to create cache directory: ${err instanceof Error ? err.message : String(err)}`);
            (0, logging_1.cdsExtractorLog)('info', 'Skipping dependency installation due to cache directory failure.');
            return new Map();
        }
    }
    else {
        (0, logging_1.cdsExtractorLog)('info', `Cache directory already exists: ${cacheRootDir}`);
    }
    // Map to track which cache directory to use for each project
    const projectCacheDirMap = new Map();
    let successfulInstallations = 0;
    // Install each unique dependency combination in its own cache directory
    for (const combination of dependencyCombinations) {
        const { cdsVersion, cdsDkVersion, hash } = combination;
        const { resolvedCdsVersion, resolvedCdsDkVersion } = combination;
        const cacheDirName = `cds-${hash}`;
        const cacheDir = (0, path_1.join)(cacheRootDir, cacheDirName);
        (0, logging_1.cdsExtractorLog)('info', `Processing dependency combination ${hash.substring(0, 8)} in cache directory: ${cacheDirName}`);
        // Create the cache directory if it doesn't exist
        if (!(0, fs_1.existsSync)(cacheDir)) {
            try {
                (0, fs_1.mkdirSync)(cacheDir, { recursive: true });
                (0, logging_1.cdsExtractorLog)('info', `Created cache subdirectory: ${cacheDirName}`);
            }
            catch (err) {
                (0, logging_1.cdsExtractorLog)('error', `Failed to create cache directory for combination ${hash.substring(0, 8)} (${cacheDirName}): ${err instanceof Error ? err.message : String(err)}`);
                continue;
            }
            // Create a package.json for this dependency combination using resolved versions
            const actualCdsVersion = resolvedCdsVersion !== null && resolvedCdsVersion !== void 0 ? resolvedCdsVersion : cdsVersion;
            const actualCdsDkVersion = resolvedCdsDkVersion !== null && resolvedCdsDkVersion !== void 0 ? resolvedCdsDkVersion : cdsDkVersion;
            const packageJson = {
                name: `cds-extractor-cache-${hash}`,
                version: '1.0.0',
                private: true,
                dependencies: {
                    '@sap/cds': actualCdsVersion,
                    '@sap/cds-dk': actualCdsDkVersion,
                },
            };
            try {
                (0, fs_1.writeFileSync)((0, path_1.join)(cacheDir, 'package.json'), JSON.stringify(packageJson, null, 2));
                (0, logging_1.cdsExtractorLog)('info', `Created package.json in cache subdirectory: ${cacheDirName}`);
            }
            catch (err) {
                (0, logging_1.cdsExtractorLog)('error', `Failed to create package.json in cache directory ${cacheDirName}: ${err instanceof Error ? err.message : String(err)}`);
                continue;
            }
        }
        // Try to install dependencies in the cache directory
        // Get the first project package.json path for diagnostic purposes
        const samplePackageJsonPath = (_a = Array.from(dependencyGraph.projects.values()).find(project => project.packageJson)) === null || _a === void 0 ? void 0 : _a.projectDir;
        const packageJsonPath = samplePackageJsonPath
            ? (0, path_1.join)(sourceRoot, samplePackageJsonPath, 'package.json')
            : undefined;
        const installSuccess = installDependenciesInCache(cacheDir, combination, cacheDirName, packageJsonPath, codeqlExePath);
        if (!installSuccess) {
            (0, logging_1.cdsExtractorLog)('warn', `Skipping failed dependency combination ${hash.substring(0, 8)} (cache directory: ${cacheDirName})`);
            continue;
        }
        successfulInstallations++;
        // Associate projects with this dependency combination
        for (const [projectDir, project] of Array.from(dependencyGraph.projects.entries())) {
            if (!project.packageJson) {
                continue;
            }
            const p_cdsVersion = (_c = (_b = project.packageJson.dependencies) === null || _b === void 0 ? void 0 : _b['@sap/cds']) !== null && _c !== void 0 ? _c : 'latest';
            const p_cdsDkVersion = (_e = (_d = project.packageJson.devDependencies) === null || _d === void 0 ? void 0 : _d['@sap/cds-dk']) !== null && _e !== void 0 ? _e : p_cdsVersion;
            // Resolve the project's versions to match against the combination's resolved versions
            const projectResolvedVersions = (0, versionResolver_1.resolveCdsVersions)(p_cdsVersion, p_cdsDkVersion);
            const projectActualCdsVersion = (_f = projectResolvedVersions.resolvedCdsVersion) !== null && _f !== void 0 ? _f : p_cdsVersion;
            const projectActualCdsDkVersion = (_g = projectResolvedVersions.resolvedCdsDkVersion) !== null && _g !== void 0 ? _g : p_cdsDkVersion;
            // Match based on resolved versions since that's what the hash is based on
            const combinationActualCdsVersion = (_h = combination.resolvedCdsVersion) !== null && _h !== void 0 ? _h : combination.cdsVersion;
            const combinationActualCdsDkVersion = (_j = combination.resolvedCdsDkVersion) !== null && _j !== void 0 ? _j : combination.cdsDkVersion;
            if (projectActualCdsVersion === combinationActualCdsVersion &&
                projectActualCdsDkVersion === combinationActualCdsDkVersion) {
                projectCacheDirMap.set(projectDir, cacheDir);
            }
        }
    }
    // Log final status
    if (successfulInstallations === 0) {
        (0, logging_1.cdsExtractorLog)('warn', 'Failed to install any dependency combinations.');
    }
    else if (successfulInstallations < dependencyCombinations.length) {
        (0, logging_1.cdsExtractorLog)('warn', `Successfully installed ${successfulInstallations} out of ${dependencyCombinations.length} dependency combinations.`);
    }
    else {
        (0, logging_1.cdsExtractorLog)('info', 'All dependency combinations installed successfully.');
    }
    // Log project to cache directory mappings for transparency
    if (projectCacheDirMap.size > 0) {
        (0, logging_1.cdsExtractorLog)('info', `Project to cache directory mappings:`);
        for (const [projectDir, cacheDir] of Array.from(projectCacheDirMap.entries())) {
            const cacheDirName = (_k = (0, path_1.join)(cacheDir).split('/').pop()) !== null && _k !== void 0 ? _k : 'unknown';
            (0, logging_1.cdsExtractorLog)('info', `  ${projectDir} → ${cacheDirName}`);
        }
    }
    return projectCacheDirMap;
}
//# sourceMappingURL=installer.js.map