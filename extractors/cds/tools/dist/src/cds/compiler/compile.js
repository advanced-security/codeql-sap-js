"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileCdsToJson = compileCdsToJson;
const child_process_1 = require("child_process");
const path_1 = require("path");
const glob_1 = require("glob");
const version_1 = require("./version");
const filesystem_1 = require("../../filesystem");
const logging_1 = require("../../logging");
/**
 * Creates spawn options for CDS compilation processes.
 * CRITICAL: Always sets cwd to sourceRoot to ensure generated JSON paths are relative to sourceRoot.
 *
 * @param sourceRoot The source root directory - used as cwd for all spawned processes
 * @param cdsCommand The CDS command to determine if we need Node.js environment setup
 * @param cacheDir Optional cache directory for dependencies
 * @returns Spawn options configured for CDS compilation
 */
function createSpawnOptions(sourceRoot, cdsCommand, cacheDir) {
    var _a;
    const spawnOptions = {
        cwd: sourceRoot, // CRITICAL: Always use sourceRoot as cwd to ensure correct path generation
        shell: false, // Use shell=false to ensure proper argument handling for paths with spaces
        stdio: 'pipe',
        env: { ...process.env },
    };
    // Check if we're using a direct binary path (contains node_modules/.bin/) or npx-style command
    const isDirectBinary = cdsCommand.includes('node_modules/.bin/');
    // Only set up Node.js environment for npx-style commands, not for direct binary execution
    if (cacheDir && !isDirectBinary) {
        const nodePath = (0, path_1.join)(cacheDir, 'node_modules');
        // Set up environment to use the cached dependencies
        spawnOptions.env = {
            ...process.env,
            NODE_PATH: `${nodePath}${path_1.delimiter}${(_a = process.env.NODE_PATH) !== null && _a !== void 0 ? _a : ''}`,
            PATH: `${(0, path_1.join)(nodePath, '.bin')}${path_1.delimiter}${process.env.PATH}`,
            // Add NPM configuration to ensure dependencies are resolved from the cache directory
            npm_config_prefix: cacheDir,
            // Ensure we don't pick up global CDS installations that might conflict
            npm_config_global: 'false',
            // Clear any existing CDS environment variables that might interfere
            CDS_HOME: cacheDir,
        };
    }
    else if (isDirectBinary) {
        // For direct binary execution, use minimal environment to avoid conflicts
        // Remove Node.js-specific environment variables that might interfere
        const cleanEnv = { ...process.env };
        delete cleanEnv.NODE_PATH;
        delete cleanEnv.npm_config_prefix;
        delete cleanEnv.npm_config_global;
        delete cleanEnv.CDS_HOME;
        spawnOptions.env = cleanEnv;
    }
    return spawnOptions;
}
/**
 * Handles project-level compilation for CAP projects with typical directory structure.
 * CRITICAL: Uses the project directory as cwd and calculates paths relative to project directory.
 *
 * @param resolvedCdsFilePath The resolved CDS file path that triggered this compilation
 * @param sourceRoot The source root directory
 * @param projectDir The project directory (relative to sourceRoot)
 * @param cdsCommand The CDS command to use
 * @param spawnOptions Pre-configured spawn options with sourceRoot as cwd
 * @param versionInfo Version information for logging
 * @returns Compilation result
 */
function compileProjectLevel(resolvedCdsFilePath, sourceRoot, projectDir, cdsCommand, spawnOptions, _versionInfo) {
    var _a, _b, _c;
    (0, logging_1.cdsExtractorLog)('info', `${resolvedCdsFilePath} is part of a CAP project - using project-aware compilation ${_versionInfo}...`);
    // For project-level compilation, compile the entire project together
    // This follows the CAP best practice of compiling db and srv directories together
    const projectAbsolutePath = (0, path_1.join)(sourceRoot, projectDir);
    // Common directories in CAP projects that should be compiled together
    const capDirectories = ['db', 'srv', 'app'];
    const existingDirectories = [];
    for (const dir of capDirectories) {
        const dirPath = (0, path_1.join)(projectAbsolutePath, dir);
        if ((0, filesystem_1.dirExists)(dirPath)) {
            existingDirectories.push(dir);
        }
    }
    // Check if there are any CDS files in the project at all before proceeding
    const allCdsFiles = (0, glob_1.globSync)((0, path_1.join)(projectAbsolutePath, '**/*.cds'), {
        nodir: true,
        ignore: ['**/node_modules/**'],
    });
    if (allCdsFiles.length === 0) {
        throw new Error(`Project directory '${projectDir}' does not contain any CDS files and cannot be compiled`);
    }
    if (existingDirectories.length === 0) {
        // If no standard directories, check if there are CDS files in the root
        const rootCdsFiles = (0, glob_1.globSync)((0, path_1.join)(projectAbsolutePath, '*.cds'));
        if (rootCdsFiles.length > 0) {
            existingDirectories.push('.');
        }
        else {
            // Find directories that contain CDS files
            const cdsFileParents = new Set(allCdsFiles.map((file) => {
                const relativePath = (0, path_1.relative)(projectAbsolutePath, file);
                const firstDir = relativePath.split('/')[0];
                return firstDir === relativePath ? '.' : firstDir;
            }));
            existingDirectories.push(...Array.from(cdsFileParents));
        }
    }
    // Generate output path for the compiled model - relative to sourceRoot for consistency
    const relativeOutputPath = (0, path_1.join)(projectDir, 'model.cds.json');
    const projectJsonOutPath = (0, path_1.join)(sourceRoot, relativeOutputPath);
    // Use sourceRoot as working directory but provide project-relative paths
    const projectSpawnOptions = {
        ...spawnOptions,
        cwd: sourceRoot, // Use sourceRoot as working directory for consistency
    };
    // Convert directories to be relative to sourceRoot (include project prefix)
    const projectRelativeDirectories = existingDirectories.map(dir => dir === '.' ? projectDir : (0, path_1.join)(projectDir, dir));
    const compileArgs = [
        'compile',
        ...projectRelativeDirectories, // Use paths relative to sourceRoot
        '--to',
        'json',
        '--dest',
        (0, path_1.join)(projectDir, 'model.cds.json'), // Output to specific model.cds.json file
        '--locations',
        '--log-level',
        'warn',
    ];
    (0, logging_1.cdsExtractorLog)('info', `Compiling CAP project directories: ${existingDirectories.join(', ')}`);
    (0, logging_1.cdsExtractorLog)('info', `Executing CDS command in directory ${projectAbsolutePath}: command='${cdsCommand}' args='${JSON.stringify(compileArgs)}'`);
    // CRITICAL: Use the project directory as cwd
    // Use array arguments for consistent test behavior
    const result = (0, child_process_1.spawnSync)(cdsCommand, compileArgs, projectSpawnOptions);
    if (result.error) {
        (0, logging_1.cdsExtractorLog)('error', `SpawnSync error: ${result.error.message}`);
        throw new Error(`Error executing CDS compiler: ${result.error.message}`);
    }
    // Log stderr for debugging even on success (CDS often writes warnings to stderr)
    if (result.stderr && result.stderr.length > 0) {
        (0, logging_1.cdsExtractorLog)('warn', `CDS stderr output: ${result.stderr.toString()}`);
    }
    if (result.status !== 0) {
        (0, logging_1.cdsExtractorLog)('error', `CDS command failed with status ${result.status}`);
        (0, logging_1.cdsExtractorLog)('error', `Command: ${cdsCommand} ${compileArgs.map(arg => (arg.includes(' ') ? `"${arg}"` : arg)).join(' ')}`);
        (0, logging_1.cdsExtractorLog)('error', `Stdout: ${((_a = result.stdout) === null || _a === void 0 ? void 0 : _a.toString()) || 'No stdout'}`);
        (0, logging_1.cdsExtractorLog)('error', `Stderr: ${((_b = result.stderr) === null || _b === void 0 ? void 0 : _b.toString()) || 'No stderr'}`);
        throw new Error(`Could not compile the CAP project ${projectDir}.\nReported error(s):\n\`\`\`\n${((_c = result.stderr) === null || _c === void 0 ? void 0 : _c.toString()) || 'Unknown error'}\n\`\`\``);
    }
    if (!(0, filesystem_1.fileExists)(projectJsonOutPath) && !(0, filesystem_1.dirExists)(projectJsonOutPath)) {
        throw new Error(`CAP project '${projectDir}' was not compiled to JSON. This is likely because the project structure is invalid.`);
    }
    // Handle directory output if the CDS compiler generated a directory
    if ((0, filesystem_1.dirExists)(projectJsonOutPath)) {
        (0, logging_1.cdsExtractorLog)('info', `CDS compiler generated JSON to output directory: ${projectJsonOutPath}`);
        // Recursively rename all .json files to have a .cds.json extension
        (0, filesystem_1.recursivelyRenameJsonFiles)(projectJsonOutPath);
    }
    else {
        (0, logging_1.cdsExtractorLog)('info', `CDS compiler generated JSON to file: ${projectJsonOutPath}`);
    }
    return {
        success: true,
        outputPath: projectJsonOutPath,
        compiledAsProject: true,
        message: 'Project was compiled using project-aware compilation',
    };
}
/**
 * Determines if the given project should use project-level compilation.
 *
 * @param project The CDS project to check
 * @returns true if project-level compilation should be used
 */
function shouldUseProjectLevelCompilation(project) {
    var _a, _b;
    return (_b = (_a = project === null || project === void 0 ? void 0 : project.cdsFilesToCompile) === null || _a === void 0 ? void 0 : _a.includes('__PROJECT_LEVEL_COMPILATION__')) !== null && _b !== void 0 ? _b : false;
}
/**
 * Determines if a file should be compiled individually or skipped because it's part of a project.
 *
 * @param project The CDS project
 * @param relativePath The relative path of the file being checked
 * @returns true if the file should be compiled individually
 */
function shouldCompileIndividually(project, relativePath) {
    var _a, _b;
    return (_b = (_a = project === null || project === void 0 ? void 0 : project.cdsFilesToCompile) === null || _a === void 0 ? void 0 : _a.includes(relativePath)) !== null && _b !== void 0 ? _b : true;
}
/**
 * Compiles a CDS file to JSON using robust, project-aware compilation only.
 * This function has been refactored to align with the autobuild.md vision by removing
 * all forms of individual file compilation and ensuring only project-aware compilation is used.
 *
 * For root files, this will compile them to their 1:1 .cds.json representation if and only if
 * the file is a true root file in a project.
 *
 * @param cdsFilePath Path to the CDS file
 * @param sourceRoot The source root directory - CRITICAL: All spawned processes must use this as their cwd to ensure paths in generated JSON are relative to sourceRoot
 * @param cdsCommand The CDS command to use
 * @param cacheDir Optional path to a directory containing installed dependencies
 * @param projectMap Optional map of project directories to project objects with dependency information
 * @param projectDir Optional project directory this CDS file belongs to
 * @returns Result of the compilation
 */
function compileCdsToJson(cdsFilePath, sourceRoot, cdsCommand, cacheDir, projectMap, projectDir) {
    try {
        const resolvedCdsFilePath = (0, path_1.resolve)(cdsFilePath);
        if (!(0, filesystem_1.fileExists)(resolvedCdsFilePath)) {
            throw new Error(`Expected CDS file '${resolvedCdsFilePath}' does not exist.`);
        }
        // Get and log the CDS version
        const cdsVersion = (0, version_1.getCdsVersion)(cdsCommand, cacheDir);
        const versionInfo = cdsVersion ? `with CDS v${cdsVersion}` : '';
        // CRITICAL: Create spawn options with sourceRoot as cwd to ensure correct path generation
        const spawnOptions = createSpawnOptions(sourceRoot, cdsCommand, cacheDir);
        // According to autobuild.md, we must always use project-aware compilation
        // and remove all forms of individual file compilation
        const isProjectAware = projectMap && projectDir && projectMap.get(projectDir);
        if (isProjectAware) {
            const project = projectMap.get(projectDir);
            const relativePath = (0, path_1.relative)(sourceRoot, resolvedCdsFilePath);
            // Check if this is a project-level compilation marker
            if (shouldUseProjectLevelCompilation(project)) {
                return compileProjectLevel(resolvedCdsFilePath, sourceRoot, projectDir, cdsCommand, spawnOptions, versionInfo);
            }
            // Check if this file is in the list of files to compile for this project
            if (!shouldCompileIndividually(project, relativePath)) {
                (0, logging_1.cdsExtractorLog)('info', `${resolvedCdsFilePath} is imported by other files - will be compiled as part of a project ${versionInfo}...`);
                const cdsJsonOutPath = `${resolvedCdsFilePath}.json`;
                return {
                    success: true,
                    outputPath: cdsJsonOutPath,
                    compiledAsProject: true,
                    message: 'File was compiled as part of a project-based compilation',
                };
            }
            else {
                // This is a root file - compile it using project-aware approach to its 1:1 representation
                (0, logging_1.cdsExtractorLog)('info', `${resolvedCdsFilePath} identified as a root CDS file - using project-aware compilation for root file ${versionInfo}...`);
                return compileRootFileAsProject(resolvedCdsFilePath, sourceRoot, projectDir, cdsCommand, spawnOptions, versionInfo);
            }
        }
        else {
            // No project information available - treat as standalone project with the file as root
            (0, logging_1.cdsExtractorLog)('info', `Processing CDS file ${resolvedCdsFilePath} as standalone project ${versionInfo}...`);
            return compileStandaloneFile(resolvedCdsFilePath, sourceRoot, cdsCommand, spawnOptions, versionInfo);
        }
    }
    catch (error) {
        return { success: false, message: String(error) };
    }
}
/**
 * Compiles a root CDS file using project-aware approach for 1:1 .cds.json representation.
 * This follows the autobuild.md vision of project-aware compilation only.
 *
 * @param resolvedCdsFilePath The resolved CDS file path
 * @param sourceRoot The source root directory
 * @param projectDir The project directory
 * @param cdsCommand The CDS command to use
 * @param spawnOptions Pre-configured spawn options
 * @param versionInfo Version information for logging
 * @returns Compilation result
 */
function compileRootFileAsProject(resolvedCdsFilePath, sourceRoot, _projectDir, cdsCommand, spawnOptions, _versionInfo) {
    var _a, _b, _c;
    // Calculate relative path for the output file
    const relativeCdsPath = (0, path_1.relative)(sourceRoot, resolvedCdsFilePath);
    const cdsJsonOutPath = `${resolvedCdsFilePath}.json`;
    // Use project-aware compilation with specific file target
    const compileArgs = [
        'compile',
        relativeCdsPath, // Compile the specific file relative to sourceRoot
        '--to',
        'json',
        '--dest',
        `${relativeCdsPath}.json`,
        '--locations',
        '--log-level',
        'warn',
    ];
    (0, logging_1.cdsExtractorLog)('info', `Compiling root CDS file using project-aware approach: ${relativeCdsPath}`);
    (0, logging_1.cdsExtractorLog)('info', `Executing CDS command: command='${cdsCommand}' args='${JSON.stringify(compileArgs)}'`);
    // Execute the compilation
    const result = (0, child_process_1.spawnSync)(cdsCommand, compileArgs, spawnOptions);
    if (result.error) {
        (0, logging_1.cdsExtractorLog)('error', `SpawnSync error: ${result.error.message}`);
        throw new Error(`Error executing CDS compiler: ${result.error.message}`);
    }
    // Log stderr for debugging even on success
    if (result.stderr && result.stderr.length > 0) {
        (0, logging_1.cdsExtractorLog)('warn', `CDS stderr output: ${result.stderr.toString()}`);
    }
    if (result.status !== 0) {
        (0, logging_1.cdsExtractorLog)('error', `CDS command failed with status ${result.status}`);
        (0, logging_1.cdsExtractorLog)('error', `Command: ${cdsCommand} ${compileArgs.map(arg => (arg.includes(' ') ? `"${arg}"` : arg)).join(' ')}`);
        (0, logging_1.cdsExtractorLog)('error', `Stdout: ${((_a = result.stdout) === null || _a === void 0 ? void 0 : _a.toString()) || 'No stdout'}`);
        (0, logging_1.cdsExtractorLog)('error', `Stderr: ${((_b = result.stderr) === null || _b === void 0 ? void 0 : _b.toString()) || 'No stderr'}`);
        throw new Error(`Could not compile the root CDS file ${relativeCdsPath}.\nReported error(s):\n\`\`\`\n${((_c = result.stderr) === null || _c === void 0 ? void 0 : _c.toString()) || 'Unknown error'}\n\`\`\``);
    }
    if (!(0, filesystem_1.fileExists)(cdsJsonOutPath) && !(0, filesystem_1.dirExists)(cdsJsonOutPath)) {
        throw new Error(`Root CDS file '${relativeCdsPath}' was not compiled to JSON. Expected output: ${cdsJsonOutPath}`);
    }
    // Handle directory output if the CDS compiler generated a directory
    if ((0, filesystem_1.dirExists)(cdsJsonOutPath)) {
        (0, logging_1.cdsExtractorLog)('info', `CDS compiler generated JSON to output directory: ${cdsJsonOutPath}`);
        // Recursively rename all .json files to have a .cds.json extension
        (0, filesystem_1.recursivelyRenameJsonFiles)(cdsJsonOutPath);
    }
    else {
        (0, logging_1.cdsExtractorLog)('info', `CDS compiler generated JSON to file: ${cdsJsonOutPath}`);
    }
    return {
        success: true,
        outputPath: cdsJsonOutPath,
        compiledAsProject: true,
        message: 'Root file compiled using project-aware compilation',
    };
}
/**
 * Compiles a standalone CDS file using project-aware approach.
 * This follows the autobuild.md vision by treating standalone files as single-file projects.
 *
 * @param resolvedCdsFilePath The resolved CDS file path
 * @param sourceRoot The source root directory
 * @param cdsCommand The CDS command to use
 * @param spawnOptions Pre-configured spawn options
 * @param versionInfo Version information for logging
 * @returns Compilation result
 */
function compileStandaloneFile(resolvedCdsFilePath, sourceRoot, cdsCommand, spawnOptions, _versionInfo) {
    var _a, _b, _c;
    // Calculate relative path for the standalone file
    const relativeCdsPath = (0, path_1.relative)(sourceRoot, resolvedCdsFilePath);
    const cdsJsonOutPath = `${resolvedCdsFilePath}.json`;
    // Use project-aware compilation for standalone file (treat as single-file project)
    const compileArgs = [
        'compile',
        relativeCdsPath, // Compile the specific file relative to sourceRoot
        '--to',
        'json',
        '--dest',
        `${relativeCdsPath}.json`, // Output to specific file to avoid space issues
        '--locations',
        '--log-level',
        'warn',
    ];
    (0, logging_1.cdsExtractorLog)('info', `Compiling standalone CDS file using project-aware approach: ${relativeCdsPath}`);
    (0, logging_1.cdsExtractorLog)('info', `Executing CDS command: command='${cdsCommand}' args='${JSON.stringify(compileArgs)}'`);
    // Execute the compilation
    const result = (0, child_process_1.spawnSync)(cdsCommand, compileArgs, spawnOptions);
    if (result.error) {
        (0, logging_1.cdsExtractorLog)('error', `SpawnSync error: ${result.error.message}`);
        throw new Error(`Error executing CDS compiler: ${result.error.message}`);
    }
    // Log stderr for debugging even on success
    if (result.stderr && result.stderr.length > 0) {
        (0, logging_1.cdsExtractorLog)('warn', `CDS stderr output: ${result.stderr.toString()}`);
    }
    if (result.status !== 0) {
        (0, logging_1.cdsExtractorLog)('error', `CDS command failed with status ${result.status}`);
        (0, logging_1.cdsExtractorLog)('error', `Command: ${cdsCommand} ${compileArgs.map(arg => (arg.includes(' ') ? `"${arg}"` : arg)).join(' ')}`);
        (0, logging_1.cdsExtractorLog)('error', `Stdout: ${((_a = result.stdout) === null || _a === void 0 ? void 0 : _a.toString()) || 'No stdout'}`);
        (0, logging_1.cdsExtractorLog)('error', `Stderr: ${((_b = result.stderr) === null || _b === void 0 ? void 0 : _b.toString()) || 'No stderr'}`);
        throw new Error(`Could not compile the standalone CDS file ${relativeCdsPath}.\nReported error(s):\n\`\`\`\n${((_c = result.stderr) === null || _c === void 0 ? void 0 : _c.toString()) || 'Unknown error'}\n\`\`\``);
    }
    if (!(0, filesystem_1.fileExists)(cdsJsonOutPath) && !(0, filesystem_1.dirExists)(cdsJsonOutPath)) {
        throw new Error(`Standalone CDS file '${relativeCdsPath}' was not compiled to JSON. Expected output: ${cdsJsonOutPath}`);
    }
    // Handle directory output if the CDS compiler generated a directory
    if ((0, filesystem_1.dirExists)(cdsJsonOutPath)) {
        (0, logging_1.cdsExtractorLog)('info', `CDS compiler generated JSON to output directory: ${cdsJsonOutPath}`);
        // Recursively rename all .json files to have a .cds.json extension
        (0, filesystem_1.recursivelyRenameJsonFiles)(cdsJsonOutPath);
    }
    else {
        (0, logging_1.cdsExtractorLog)('info', `CDS compiler generated JSON to file: ${cdsJsonOutPath}`);
    }
    return {
        success: true,
        outputPath: cdsJsonOutPath,
        compiledAsProject: false, // Standalone file, not part of a project
        message: 'Standalone file compiled using project-aware compilation approach',
    };
}
//# sourceMappingURL=compile.js.map