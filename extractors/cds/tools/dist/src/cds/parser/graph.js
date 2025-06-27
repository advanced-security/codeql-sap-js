"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCdsProjectDependencyGraph = buildCdsProjectDependencyGraph;
exports.buildEnhancedCdsProjectDependencyGraph = buildEnhancedCdsProjectDependencyGraph;
const path_1 = require("path");
const functions_1 = require("./functions");
const logging_1 = require("../../logging");
/**
 * Builds a dependency graph of CDS projects and performs the initial parsing stage of the CDS extractor.
 * This is the top-level function for the parser stage of the CDS extractor.
 *
 * @param sourceRootDir - Source root directory
 * @param _scriptDir - Directory where the script is running (for debug output) [unused]
 * @returns Map of project directories to their CdsProject objects with dependency information
 */
function buildCdsProjectDependencyGraph(sourceRootDir, _scriptDir) {
    var _a, _b, _c, _d;
    // Find all CDS projects under the source directory
    (0, logging_1.cdsExtractorLog)('info', 'Detecting CDS projects...');
    const projectDirs = (0, functions_1.determineCdsProjectsUnderSourceDir)(sourceRootDir);
    if (projectDirs.length === 0) {
        (0, logging_1.cdsExtractorLog)('info', 'No CDS projects found.');
        return new Map();
    }
    (0, logging_1.cdsExtractorLog)('info', `Found ${projectDirs.length} CDS project(s) under source directory.`);
    const projectMap = new Map();
    // First pass: create CdsProject objects for each project directory
    for (const projectDir of projectDirs) {
        const absoluteProjectDir = (0, path_1.join)(sourceRootDir, projectDir);
        const cdsFiles = (0, functions_1.determineCdsFilesForProjectDir)(sourceRootDir, absoluteProjectDir);
        // Try to load package.json if it exists
        const packageJsonPath = (0, path_1.join)(absoluteProjectDir, 'package.json');
        const packageJson = (0, functions_1.readPackageJsonWithCache)(packageJsonPath);
        projectMap.set(projectDir, {
            projectDir,
            cdsFiles,
            cdsFilesToCompile: [], // Will be populated in the third pass
            expectedOutputFiles: [], // Will be populated in the fourth pass
            packageJson,
            dependencies: [],
            imports: new Map(),
        });
    }
    // Second pass: analyze dependencies between projects
    (0, logging_1.cdsExtractorLog)('info', 'Analyzing dependencies between CDS projects...');
    for (const [projectDir, project] of projectMap.entries()) {
        // Check each CDS file for imports
        for (const relativeFilePath of project.cdsFiles) {
            const absoluteFilePath = (0, path_1.join)(sourceRootDir, relativeFilePath);
            try {
                const imports = (0, functions_1.extractCdsImports)(absoluteFilePath);
                const enrichedImports = [];
                // Process each import
                for (const importInfo of imports) {
                    const enrichedImport = { ...importInfo };
                    if (importInfo.isRelative) {
                        // Resolve the relative import path
                        const importedFilePath = (0, path_1.resolve)((0, path_1.dirname)(absoluteFilePath), importInfo.path);
                        const normalizedImportedPath = importedFilePath.endsWith('.cds')
                            ? importedFilePath
                            : `${importedFilePath}.cds`;
                        // Store the resolved path relative to source root
                        try {
                            const relativeToDirPath = (0, path_1.dirname)(relativeFilePath);
                            const resolvedPath = (0, path_1.resolve)((0, path_1.join)(sourceRootDir, relativeToDirPath), importInfo.path);
                            const normalizedResolvedPath = resolvedPath.endsWith('.cds')
                                ? resolvedPath
                                : `${resolvedPath}.cds`;
                            // Convert to relative path from source root
                            if (normalizedResolvedPath.startsWith(sourceRootDir)) {
                                enrichedImport.resolvedPath = normalizedResolvedPath
                                    .substring(sourceRootDir.length)
                                    .replace(/^[/\\]/, '');
                            }
                        }
                        catch (error) {
                            (0, logging_1.cdsExtractorLog)('warn', `Could not resolve import path for ${importInfo.path} in ${relativeFilePath}: ${String(error)}`);
                        }
                        // Find which project contains this imported file
                        for (const [otherProjectDir, otherProject] of projectMap.entries()) {
                            if (otherProjectDir === projectDir)
                                continue; // Skip self
                            const otherProjectAbsoluteDir = (0, path_1.join)(sourceRootDir, otherProjectDir);
                            // Check if the imported file is in the other project
                            const isInOtherProject = otherProject.cdsFiles.some(otherFile => {
                                const otherAbsolutePath = (0, path_1.join)(sourceRootDir, otherFile);
                                return (otherAbsolutePath === normalizedImportedPath ||
                                    normalizedImportedPath.startsWith(otherProjectAbsoluteDir + path_1.sep));
                            });
                            if (isInOtherProject) {
                                // Add dependency if not already present
                                (_a = project.dependencies) !== null && _a !== void 0 ? _a : (project.dependencies = []);
                                if (!project.dependencies.includes(otherProject)) {
                                    project.dependencies.push(otherProject);
                                }
                            }
                        }
                    }
                    // For module imports, check package.json dependencies
                    else if (importInfo.isModule && project.packageJson) {
                        const dependencies = {
                            ...((_b = project.packageJson.dependencies) !== null && _b !== void 0 ? _b : {}),
                            ...((_c = project.packageJson.devDependencies) !== null && _c !== void 0 ? _c : {}),
                        };
                        // Extract module name from import path (e.g., '@sap/cds/common' -> '@sap/cds')
                        const moduleName = importInfo.path.split('/')[0].startsWith('@')
                            ? importInfo.path.split('/').slice(0, 2).join('/')
                            : importInfo.path.split('/')[0];
                        if (dependencies[moduleName]) {
                            // This is a valid module dependency, nothing more to do here
                            // In the future, we could track module dependencies separately
                        }
                    }
                    enrichedImports.push(enrichedImport);
                }
                // Store the enriched imports in the project
                (_d = project.imports) === null || _d === void 0 ? void 0 : _d.set(relativeFilePath, enrichedImports);
            }
            catch (error) {
                (0, logging_1.cdsExtractorLog)('warn', `Error processing imports in ${absoluteFilePath}: ${String(error)}`);
            }
        }
    }
    // Third pass: determine which CDS files should be compiled for each project
    (0, logging_1.cdsExtractorLog)('info', 'Determining CDS files to compile for each project...');
    for (const [, project] of projectMap.entries()) {
        try {
            const filesToCompile = (0, functions_1.determineCdsFilesToCompile)(sourceRootDir, project);
            project.cdsFilesToCompile = filesToCompile;
            (0, logging_1.cdsExtractorLog)('info', `Project ${project.projectDir}: ${filesToCompile.length} files to compile out of ${project.cdsFiles.length} total CDS files`);
        }
        catch (error) {
            (0, logging_1.cdsExtractorLog)('warn', `Error determining files to compile for project ${project.projectDir}: ${String(error)}`);
            // Fall back to compiling all files on error
            project.cdsFilesToCompile = [...project.cdsFiles];
        }
    }
    // Fourth pass: determine expected output files for each project
    (0, logging_1.cdsExtractorLog)('info', 'Determining expected output files for each project...');
    for (const [, project] of projectMap.entries()) {
        try {
            const expectedOutputFiles = (0, functions_1.determineExpectedOutputFiles)(project);
            project.expectedOutputFiles = expectedOutputFiles;
            (0, logging_1.cdsExtractorLog)('info', `Project ${project.projectDir}: expecting ${expectedOutputFiles.length} output files`);
        }
        catch (error) {
            (0, logging_1.cdsExtractorLog)('warn', `Error determining expected output files for project ${project.projectDir}: ${String(error)}`);
            // Fall back to empty array on error
            project.expectedOutputFiles = [];
        }
    }
    return projectMap;
}
/**
 * Builds an enhanced CDS dependency graph with comprehensive tracking and debug information.
 * This is the new enhanced version that returns a CdsDependencyGraph instead of a simple Map.
 * The extractor now runs in autobuild mode by default.
 *
 * @param sourceRootDir - Source root directory
 * @param _scriptDir - Directory where the script is running (for debug output) [unused]
 * @returns Enhanced CDS dependency graph with comprehensive tracking
 */
function buildEnhancedCdsProjectDependencyGraph(sourceRootDir, _scriptDir) {
    const startTime = new Date();
    // Create the initial dependency graph structure
    const dependencyGraph = {
        id: `cds_graph_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sourceRootDir,
        scriptDir: _scriptDir !== null && _scriptDir !== void 0 ? _scriptDir : sourceRootDir,
        projects: new Map(),
        globalCacheDirectories: new Map(),
        debugInfo: {
            extractor: {
                runMode: 'autobuild',
                sourceRootDir,
                scriptDir: _scriptDir,
                startTime,
                environment: {
                    nodeVersion: process.version,
                    platform: process.platform,
                    cwd: process.cwd(),
                    argv: process.argv,
                },
            },
            parser: {
                projectsDetected: 0,
                cdsFilesFound: 0,
                dependencyResolutionSuccess: true,
                parsingErrors: [],
                parsingWarnings: [],
            },
            compiler: {
                availableCommands: [],
                selectedCommand: '',
                cacheDirectories: [],
                cacheInitialized: false,
            },
        },
        currentPhase: 'parsing',
        statusSummary: {
            overallSuccess: false,
            totalProjects: 0,
            totalCdsFiles: 0,
            totalCompilationTasks: 0,
            successfulCompilations: 0,
            failedCompilations: 0,
            skippedCompilations: 0,
            retriedCompilations: 0,
            jsonFilesGenerated: 0,
            criticalErrors: [],
            warnings: [],
            performance: {
                totalDurationMs: 0,
                parsingDurationMs: 0,
                compilationDurationMs: 0,
                extractionDurationMs: 0,
            },
        },
        fileCache: {
            fileContents: new Map(),
            packageJsonCache: new Map(),
            cdsParseCache: new Map(),
        },
        config: {
            maxRetryAttempts: 3,
            enableDetailedLogging: false, // Debug modes removed
            generateDebugOutput: false, // Debug modes removed
            compilationTimeoutMs: 30000, // 30 seconds
        },
        errors: {
            critical: [],
            warnings: [],
        },
    };
    try {
        // Use the existing function to build the basic project map
        const basicProjectMap = buildCdsProjectDependencyGraph(sourceRootDir, _scriptDir);
        // Convert basic projects to enhanced projects
        for (const [projectDir, basicProject] of basicProjectMap.entries()) {
            const enhancedProject = {
                ...basicProject,
                id: `project_${projectDir.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
                enhancedCompilationConfig: undefined, // Will be set during compilation planning
                compilationTasks: [],
                parserDebugInfo: {
                    dependenciesResolved: [],
                    importErrors: [],
                    parseErrors: new Map(),
                },
                status: 'discovered',
                timestamps: {
                    discovered: new Date(),
                },
            };
            dependencyGraph.projects.set(projectDir, enhancedProject);
        }
        // Update summary statistics
        dependencyGraph.statusSummary.totalProjects = dependencyGraph.projects.size;
        dependencyGraph.statusSummary.totalCdsFiles = Array.from(dependencyGraph.projects.values()).reduce((sum, project) => sum + project.cdsFiles.length, 0);
        dependencyGraph.debugInfo.parser.projectsDetected = dependencyGraph.projects.size;
        dependencyGraph.debugInfo.parser.cdsFilesFound = dependencyGraph.statusSummary.totalCdsFiles;
        // Mark dependency resolution phase as completed
        dependencyGraph.currentPhase = 'dependency_resolution';
        const endTime = new Date();
        dependencyGraph.debugInfo.extractor.endTime = endTime;
        dependencyGraph.debugInfo.extractor.durationMs = endTime.getTime() - startTime.getTime();
        dependencyGraph.statusSummary.performance.parsingDurationMs =
            dependencyGraph.debugInfo.extractor.durationMs;
        (0, logging_1.cdsExtractorLog)('info', `Enhanced dependency graph created with ${dependencyGraph.projects.size} projects and ${dependencyGraph.statusSummary.totalCdsFiles} CDS files`);
        return dependencyGraph;
    }
    catch (error) {
        const errorMessage = `Failed to build enhanced dependency graph: ${String(error)}`;
        (0, logging_1.cdsExtractorLog)('error', errorMessage);
        dependencyGraph.errors.critical.push({
            phase: 'parsing',
            message: errorMessage,
            timestamp: new Date(),
            stack: error instanceof Error ? error.stack : undefined,
        });
        dependencyGraph.currentPhase = 'failed';
        return dependencyGraph;
    }
}
//# sourceMappingURL=graph.js.map