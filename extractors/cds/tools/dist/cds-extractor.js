"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const glob_1 = require("glob");
const cds_1 = require("./src/cds");
const compiler_1 = require("./src/cds/compiler");
const parser_1 = require("./src/cds/parser");
const codeql_1 = require("./src/codeql");
const diagnostics_1 = require("./src/diagnostics");
const environment_1 = require("./src/environment");
const logging_1 = require("./src/logging");
const packageManager_1 = require("./src/packageManager");
const utils_1 = require("./src/utils");
// Validate the script arguments.
const validationResult = (0, utils_1.validateArguments)(process.argv);
if (!validationResult.isValid) {
    console.warn(validationResult.usageMessage);
    // Exit with an error code on invalid use of this script.
    process.exit(1);
}
// Get the validated and sanitized arguments.
const { sourceRoot } = validationResult.args;
// Initialize the unified logging system with the source root directory.
(0, logging_1.setSourceRootDirectory)(sourceRoot);
// Log the start of the CDS extractor session as a whole.
(0, logging_1.logExtractorStart)(sourceRoot);
// We log the memory usage at the start of the extractor to track memory growth.
(0, logging_1.logMemoryUsage)('Extractor Start');
// Setup the environment and validate all requirements first, before changing
// directory back to the "sourceRoot" directory. This ensures we can properly locate
// the CodeQL tools.
(0, logging_1.startPerformanceTracking)('Environment Setup');
const { success: envSetupSuccess, errorMessages, codeqlExePath, autobuildScriptPath, platformInfo, } = (0, environment_1.setupAndValidateEnvironment)(sourceRoot);
(0, logging_1.endPerformanceTracking)('Environment Setup');
if (!envSetupSuccess) {
    const codeqlExe = platformInfo.isWindows ? 'codeql.exe' : 'codeql';
    (0, logging_1.cdsExtractorLog)('warn', `'${codeqlExe} database index-files --language cds' terminated early due to: ${errorMessages.join(', ')}.`);
    // Exit with an error code when environment setup fails.
    (0, logging_1.logExtractorStop)(false, 'Terminated: Environment setup failed');
    process.exit(1);
}
// Force this script, and any process it spawns, to use the project (source) root
// directory as the current working directory.
process.chdir(sourceRoot);
(0, logging_1.cdsExtractorLog)('info', `CodeQL CDS extractor using autobuild mode for scan of project source root directory '${sourceRoot}'.`);
(0, logging_1.cdsExtractorLog)('info', 'Building enhanced CDS project dependency graph...');
// Build the CDS project `dependencyGraph` as the foundation for the extraction process.
// This graph will contain all discovered CDS projects, their dependencies, the `.cds`
// files discovered within each project, the expected `.cds.json` files for each project
// and the compilation status of such `.cds.json` files.
//
// The `dependencyGraph` will be updated as CDS extractor phases progress, allowing for
// a single data structure to be used for planning, execution, retries (i.e. error handling),
// debugging, and final reporting.
let dependencyGraph;
try {
    (0, logging_1.startPerformanceTracking)('Dependency Graph Build');
    dependencyGraph = (0, parser_1.buildEnhancedCdsProjectDependencyGraph)(sourceRoot, __dirname);
    (0, logging_1.endPerformanceTracking)('Dependency Graph Build');
    (0, logging_1.logPerformanceMilestone)('Dependency graph created', `${dependencyGraph.projects.size} projects, ${dependencyGraph.statusSummary.totalCdsFiles} CDS files`);
    (0, logging_1.logMemoryUsage)('After Dependency Graph');
    // Log details about discovered projects for debugging
    if (dependencyGraph.projects.size > 0) {
        for (const [projectDir, project] of dependencyGraph.projects.entries()) {
            (0, logging_1.cdsExtractorLog)('info', `Enhanced Project: ${projectDir}, Status: ${project.status}, CDS files: ${project.cdsFiles.length}, Files to compile: ${project.cdsFilesToCompile.length}`);
        }
    }
    else {
        (0, logging_1.cdsExtractorLog)('warn', 'No CDS projects were detected. This may indicate an issue with project detection logic.');
        // Let's also try to find CDS files directly as a backup check
        try {
            const allCdsFiles = Array.from(new Set([
                ...(0, glob_1.sync)((0, path_1.join)(sourceRoot, '**/*.cds'), {
                    ignore: ['**/node_modules/**', '**/.git/**'],
                }),
            ]));
            (0, logging_1.cdsExtractorLog)('info', `Direct search found ${allCdsFiles.length} CDS files in the source tree.`);
            if (allCdsFiles.length > 0) {
                (0, logging_1.cdsExtractorLog)('info', `Sample CDS files: ${allCdsFiles.slice(0, 5).join(', ')}${allCdsFiles.length > 5 ? ', ...' : ''}`);
            }
        }
        catch (globError) {
            (0, logging_1.cdsExtractorLog)('warn', `Could not perform direct CDS file search: ${String(globError)}`);
        }
    }
}
catch (error) {
    (0, logging_1.cdsExtractorLog)('error', `Failed to build enhanced dependency graph: ${String(error)}`);
    // Exit with error since we can't continue without a proper dependency graph
    (0, logging_1.logExtractorStop)(false, 'Terminated: Dependency graph build failed');
    process.exit(1);
}
(0, logging_1.startPerformanceTracking)('Dependency Installation');
const projectCacheDirMap = (0, packageManager_1.installDependencies)(dependencyGraph, sourceRoot, codeqlExePath);
(0, logging_1.endPerformanceTracking)('Dependency Installation');
const cdsFilePathsToProcess = [];
// Use the enhanced dependency graph to collect all `.cds` files from each project.
// We want to "extract" all `.cds` files from all projects so that we have a copy
// of each `.cds` source file in the CodeQL database.
for (const project of dependencyGraph.projects.values()) {
    cdsFilePathsToProcess.push(...project.cdsFiles);
}
// Initialize CDS command cache early to avoid repeated testing during compilation.
// This is a critical optimization that avoids testing commands for every single file.
(0, logging_1.startPerformanceTracking)('CDS Command Cache Initialization');
try {
    (0, cds_1.determineCdsCommand)(undefined, sourceRoot);
    (0, logging_1.endPerformanceTracking)('CDS Command Cache Initialization');
    (0, logging_1.cdsExtractorLog)('info', 'CDS command cache initialized successfully');
}
catch (error) {
    (0, logging_1.endPerformanceTracking)('CDS Command Cache Initialization');
    (0, logging_1.cdsExtractorLog)('warn', `CDS command cache initialization failed: ${String(error)}`);
}
// TODO : Improve logging / debugging of dependencyGraph.statusSummary. Just log the JSON?
(0, logging_1.cdsExtractorLog)('info', `Found ${cdsFilePathsToProcess.length} total CDS files, ${dependencyGraph.statusSummary.totalCdsFiles} CDS files in dependency graph`);
(0, logging_1.startPerformanceTracking)('CDS Compilation');
try {
    // Use the new orchestrated compilation approach (autobuild mode, no debug)
    (0, compiler_1.orchestrateCompilation)(dependencyGraph, projectCacheDirMap, codeqlExePath, false);
    // Handle compilation failures for normal mode
    if (!dependencyGraph.statusSummary.overallSuccess) {
        (0, logging_1.cdsExtractorLog)('error', `Compilation completed with failures: ${dependencyGraph.statusSummary.failedCompilations} failed out of ${dependencyGraph.statusSummary.totalCompilationTasks} total tasks`);
        // Add diagnostics for critical errors
        for (const error of dependencyGraph.errors.critical) {
            (0, logging_1.cdsExtractorLog)('error', `Critical error in ${error.phase}: ${error.message}`);
        }
        // Don't exit with error - let the JavaScript extractor run on whatever was compiled
    }
    (0, logging_1.endPerformanceTracking)('CDS Compilation');
    (0, logging_1.logPerformanceMilestone)('CDS compilation completed');
    (0, logging_1.logMemoryUsage)('After CDS Compilation');
}
catch (error) {
    (0, logging_1.endPerformanceTracking)('CDS Compilation');
    (0, logging_1.cdsExtractorLog)('error', `Compilation orchestration failed: ${String(error)}`);
    // Add diagnostic for the overall failure
    if (cdsFilePathsToProcess.length > 0) {
        (0, diagnostics_1.addCompilationDiagnostic)(cdsFilePathsToProcess[0], // Use first file as representative
        `Compilation orchestration failed: ${String(error)}`, codeqlExePath);
    }
}
// Configure the "LGTM" index filters for proper extraction.
(0, environment_1.configureLgtmIndexFilters)();
// Run CodeQL's JavaScript extractor to process the .cds source files and
// the compiled .cds.json files.
(0, logging_1.startPerformanceTracking)('JavaScript Extraction');
const extractorResult = (0, codeql_1.runJavaScriptExtractor)(sourceRoot, autobuildScriptPath, codeqlExePath);
(0, logging_1.endPerformanceTracking)('JavaScript Extraction');
if (!extractorResult.success && extractorResult.error) {
    (0, logging_1.cdsExtractorLog)('error', `Error running JavaScript extractor: ${extractorResult.error}`);
    (0, logging_1.logExtractorStop)(false, 'JavaScript extractor failed');
}
else {
    (0, logging_1.logExtractorStop)(true, 'CDS extraction completed successfully');
}
// Use the `cds-extractor.js` name in the log message as that is the name of the script
// that is actually run by the `codeql database index-files` command. This TypeScript
// file is where the code/logic is edited/implemented, but the runnable script is
// generated by the TypeScript compiler and is named `cds-extractor.js`.
console.log(`Completed run of cds-extractor.js script for CDS extractor.`);
//# sourceMappingURL=cds-extractor.js.map