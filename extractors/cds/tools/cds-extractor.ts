import { join } from 'path';

import { sync as globSync } from 'glob';

import { orchestrateCompilation } from './src/cds/compiler';
import { buildCdsProjectDependencyGraph } from './src/cds/parser';
import { runJavaScriptExtractor } from './src/codeql';
import {
  addCompilationDiagnostic,
  addDependencyGraphDiagnostic,
  addDependencyInstallationDiagnostic,
  addEnvironmentSetupDiagnostic,
  addJavaScriptExtractorDiagnostic,
  addNoCdsProjectsDiagnostic,
} from './src/diagnostics';
import { configureLgtmIndexFilters, setupAndValidateEnvironment } from './src/environment';
import {
  cdsExtractorLog,
  generateStatusReport,
  logExtractorStart,
  logExtractorStop,
  logPerformanceMilestone,
  logPerformanceTrackingStart,
  logPerformanceTrackingStop,
  setSourceRootDirectory,
} from './src/logging';
import { cacheInstallDependencies } from './src/packageManager';
import { validateArguments } from './src/utils';

// Validate the script arguments.
const validationResult = validateArguments(process.argv);
if (!validationResult.isValid) {
  console.warn(validationResult.usageMessage);
  // For invalid arguments, we can't proceed but we also can't add diagnostics since we don't have
  // the necessary context (sourceRoot, codeqlExePath). Log the issue and exit gracefully.
  console.log(
    `CDS extractor terminated due to invalid arguments: ${validationResult.usageMessage}`,
  );
  console.log(`Completed run of the cds-extractor.js script for the CDS extractor.`);
  process.exit(0); // Use exit code 0 to not fail the overall JavaScript extractor
}

// Get the validated and sanitized arguments.
const { sourceRoot } = validationResult.args!;

// Initialize the unified logging system with the source root directory.
setSourceRootDirectory(sourceRoot);

// Log the start of the CDS extractor session as a whole.
logExtractorStart(sourceRoot);

// Setup the environment and validate all requirements first, before changing
// directory back to the "sourceRoot" directory. This ensures we can properly locate
// the CodeQL tools.
logPerformanceTrackingStart('Environment Setup');
const {
  success: envSetupSuccess,
  errorMessages,
  codeqlExePath,
  autobuildScriptPath,
  platformInfo,
} = setupAndValidateEnvironment(sourceRoot);
logPerformanceTrackingStop('Environment Setup');

if (!envSetupSuccess) {
  const codeqlExe = platformInfo.isWindows ? 'codeql.exe' : 'codeql';
  const errorMessage = `'${codeqlExe} database index-files --language cds' terminated early due to: ${errorMessages.join(
    ', ',
  )}.`;

  cdsExtractorLog('warn', errorMessage);

  // Add diagnostic for environment setup failure if we have a codeqlExePath
  if (codeqlExePath) {
    addEnvironmentSetupDiagnostic(sourceRoot, errorMessage, codeqlExePath);
  }

  // Continue with a warning instead of exiting - let JavaScript extractor proceed
  logExtractorStop(
    false,
    'Warning: Environment setup failed, continuing with limited functionality',
  );
} else {
  // Force this script, and any process it spawns, to use the project (source) root
  // directory as the current working directory.
  process.chdir(sourceRoot);
}

cdsExtractorLog(
  'info',
  `CodeQL CDS extractor using autobuild mode for scan of project source root directory '${sourceRoot}'.`,
);

cdsExtractorLog('info', 'Building CDS project dependency graph...');

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
  logPerformanceTrackingStart('Dependency Graph Build');
  dependencyGraph = buildCdsProjectDependencyGraph(sourceRoot);
  logPerformanceTrackingStop('Dependency Graph Build');

  logPerformanceMilestone(
    'Dependency graph created',
    `${dependencyGraph.projects.size} projects, ${dependencyGraph.statusSummary.totalCdsFiles} CDS files`,
  );

  // Log details about discovered projects for debugging
  if (dependencyGraph.projects.size > 0) {
    for (const [projectDir, project] of dependencyGraph.projects.entries()) {
      cdsExtractorLog(
        'info',
        `Project: ${projectDir}, Status: ${project.status}, CDS files: ${project.cdsFiles.length}, Compilation targets: ${project.compilationTargets.length}`,
      );
    }
  } else {
    cdsExtractorLog(
      'error',
      'No CDS projects were detected. This is an unrecoverable error as there is nothing to scan.',
    );
    // Let's also try to find CDS files directly as a backup check
    try {
      const allCdsFiles = Array.from(
        new Set([
          ...globSync(join(sourceRoot, '**/*.cds'), {
            ignore: ['**/node_modules/**', '**/.git/**'],
          }),
        ]),
      );
      cdsExtractorLog(
        'info',
        `Direct search found ${allCdsFiles.length} CDS files in the source tree.`,
      );
      if (allCdsFiles.length > 0) {
        cdsExtractorLog(
          'info',
          `Sample CDS files: ${allCdsFiles.slice(0, 5).join(', ')}${allCdsFiles.length > 5 ? ', ...' : ''}`,
        );
        cdsExtractorLog(
          'error',
          'CDS files were found but no projects were detected. This indicates a problem with project detection logic.',
        );
      } else {
        cdsExtractorLog(
          'info',
          'No CDS files found in the source tree. This may be expected if the source does not contain CAP/CDS projects.',
        );
      }
    } catch (globError) {
      cdsExtractorLog('warn', `Could not perform direct CDS file search: ${String(globError)}`);
    }

    // Add diagnostic warning for no CDS projects detected
    const warningMessage =
      'No CDS projects were detected. This may be expected if the source does not contain CAP/CDS projects.';
    if (codeqlExePath) {
      addNoCdsProjectsDiagnostic(sourceRoot, warningMessage, codeqlExePath);
    }

    // Continue instead of exiting - let JavaScript extractor proceed with non-CDS files
    logExtractorStop(false, 'Warning: No CDS projects detected, skipping CDS-specific processing');

    // Skip the rest of CDS processing and go directly to JavaScript extraction
    configureLgtmIndexFilters();

    // Run CodeQL's JavaScript extractor to process any remaining files
    logPerformanceTrackingStart('JavaScript Extraction');
    const extractorResult = runJavaScriptExtractor(
      sourceRoot,
      autobuildScriptPath || '', // Use empty string if autobuildScriptPath is undefined
      codeqlExePath,
    );
    logPerformanceTrackingStop('JavaScript Extraction');

    if (!extractorResult.success && extractorResult.error) {
      cdsExtractorLog('error', `Error running JavaScript extractor: ${extractorResult.error}`);
      if (codeqlExePath) {
        addJavaScriptExtractorDiagnostic(
          sourceRoot,
          extractorResult.error,
          codeqlExePath,
          sourceRoot,
        );
      }
      logExtractorStop(false, 'JavaScript extractor failed');
    } else {
      logExtractorStop(true, 'JavaScript extraction completed (CDS processing was skipped)');
    }

    console.log(`Completed run of the cds-extractor.js script for the CDS extractor.`);
    process.exit(0); // Graceful exit to skip the rest of the processing
  }
} catch (error) {
  const errorMessage = `Failed to build CDS dependency graph: ${String(error)}`;
  cdsExtractorLog('error', errorMessage);

  // Add diagnostic for dependency graph build failure
  if (codeqlExePath) {
    addDependencyGraphDiagnostic(sourceRoot, errorMessage, codeqlExePath);
  }

  // Continue with a warning instead of exiting - let JavaScript extractor proceed with non-CDS files
  logExtractorStop(
    false,
    'Warning: Dependency graph build failed, skipping CDS-specific processing',
  );

  // Skip the rest of CDS processing and go directly to JavaScript extraction
  configureLgtmIndexFilters();

  // Run CodeQL's JavaScript extractor to process any remaining files
  logPerformanceTrackingStart('JavaScript Extraction');
  const extractorResult = runJavaScriptExtractor(
    sourceRoot,
    autobuildScriptPath || '', // Use empty string if autobuildScriptPath is undefined
    codeqlExePath,
  );
  logPerformanceTrackingStop('JavaScript Extraction');

  if (!extractorResult.success && extractorResult.error) {
    cdsExtractorLog('error', `Error running JavaScript extractor: ${extractorResult.error}`);
    if (codeqlExePath) {
      addJavaScriptExtractorDiagnostic(
        sourceRoot,
        extractorResult.error,
        codeqlExePath,
        sourceRoot,
      );
    }
    logExtractorStop(false, 'JavaScript extractor failed');
  } else {
    logExtractorStop(true, 'JavaScript extraction completed (CDS processing was skipped)');
  }

  console.log(`Completed run of the cds-extractor.js script for the CDS extractor.`);
  process.exit(0); // Graceful exit to skip the rest of the processing
}

logPerformanceTrackingStart('Dependency Installation');
const projectCacheDirMap = cacheInstallDependencies(dependencyGraph, sourceRoot, codeqlExePath);
logPerformanceTrackingStop('Dependency Installation');

// Check if dependency installation resulted in any usable project mappings
if (projectCacheDirMap.size === 0) {
  cdsExtractorLog(
    'error',
    'No project cache directory mappings were created. This indicates that dependency installation failed for all discovered projects.',
  );

  // This is a critical error if we have projects but no cache mappings
  if (dependencyGraph.projects.size > 0) {
    const errorMessage = `Found ${dependencyGraph.projects.size} CDS projects but failed to install dependencies for any of them. Cannot proceed with compilation.`;
    cdsExtractorLog('error', errorMessage);

    // Add diagnostic for dependency installation failure
    if (codeqlExePath) {
      addDependencyInstallationDiagnostic(sourceRoot, errorMessage, codeqlExePath);
    }

    // Continue with a warning instead of exiting - let JavaScript extractor proceed
    logExtractorStop(
      false,
      'Warning: Dependency installation failed for all projects, continuing with limited functionality',
    );
  }

  // If we have no projects and no cache mappings, this should have been caught earlier
  cdsExtractorLog(
    'warn',
    'No projects and no cache mappings - this should have been detected earlier.',
  );
}

const cdsFilePathsToProcess: string[] = [];

// Use the dependency graph to collect all `.cds` files from each project.
// We want to "extract" all `.cds` files from all projects so that we have a copy
// of each `.cds` source file in the CodeQL database.
for (const project of dependencyGraph.projects.values()) {
  cdsFilePathsToProcess.push(...project.cdsFiles);
}

// TODO : Improve logging / debugging of dependencyGraph.statusSummary. Just log the JSON?
cdsExtractorLog(
  'info',
  `Found ${cdsFilePathsToProcess.length} total CDS files, ${dependencyGraph.statusSummary.totalCdsFiles} CDS files in dependency graph`,
);

logPerformanceTrackingStart('CDS Compilation');
try {
  // Use the new orchestrated compilation approach (autobuild mode, no debug)
  orchestrateCompilation(dependencyGraph, projectCacheDirMap, codeqlExePath);

  // Handle compilation failures for normal mode
  if (!dependencyGraph.statusSummary.overallSuccess) {
    cdsExtractorLog(
      'error',
      `Compilation completed with failures: ${dependencyGraph.statusSummary.failedCompilations} failed out of ${dependencyGraph.statusSummary.totalCompilationTasks} total tasks`,
    );

    // Add diagnostics for critical errors
    for (const error of dependencyGraph.errors.critical) {
      cdsExtractorLog('error', `Critical error in ${error.phase}: ${error.message}`);
    }

    // Don't exit with error - let the JavaScript extractor run on whatever was compiled
  }

  logPerformanceTrackingStop('CDS Compilation');
  logPerformanceMilestone('CDS compilation completed');
} catch (error) {
  logPerformanceTrackingStop('CDS Compilation');
  cdsExtractorLog('error', `Compilation orchestration failed: ${String(error)}`);

  // Add diagnostic for the overall failure
  if (cdsFilePathsToProcess.length > 0) {
    addCompilationDiagnostic(
      cdsFilePathsToProcess[0], // Use first file as representative
      `Compilation orchestration failed: ${String(error)}`,
      codeqlExePath,
      sourceRoot,
    );
  }
}

// Configure the "LGTM" index filters for proper extraction.
configureLgtmIndexFilters();

// Run CodeQL's JavaScript extractor to process the .cds source files and
// the compiled .cds.json files.
logPerformanceTrackingStart('JavaScript Extraction');
const extractionStartTime = Date.now();
const extractorResult = runJavaScriptExtractor(sourceRoot, autobuildScriptPath, codeqlExePath);
const extractionEndTime = Date.now();
logPerformanceTrackingStop('JavaScript Extraction');

// Update the dependency graph's performance metrics with the extraction duration
dependencyGraph.statusSummary.performance.extractionDurationMs =
  extractionEndTime - extractionStartTime;

// Calculate total duration by summing all phases
const totalDuration =
  dependencyGraph.statusSummary.performance.parsingDurationMs +
  dependencyGraph.statusSummary.performance.compilationDurationMs +
  dependencyGraph.statusSummary.performance.extractionDurationMs;
dependencyGraph.statusSummary.performance.totalDurationMs = totalDuration;

if (!extractorResult.success && extractorResult.error) {
  cdsExtractorLog('error', `Error running JavaScript extractor: ${extractorResult.error}`);

  // Add diagnostic for JavaScript extractor failure
  if (codeqlExePath && dependencyGraph.projects.size > 0) {
    // Use the first CDS file as a representative file for the diagnostic
    const firstProject = Array.from(dependencyGraph.projects.values())[0];
    const representativeFile = firstProject.cdsFiles[0] || sourceRoot;
    addJavaScriptExtractorDiagnostic(
      representativeFile,
      extractorResult.error,
      codeqlExePath,
      sourceRoot,
    );
  }

  logExtractorStop(false, 'JavaScript extractor failed');
} else {
  logExtractorStop(true, 'CDS extraction completed successfully');
}

cdsExtractorLog(
  'info',
  'CDS Extractor Status Report : Final...\n' + generateStatusReport(dependencyGraph),
);

// Use the `cds-extractor.js` name in the log message as that is the name of the script
// that is actually run by the `codeql database index-files` command. This TypeScript
// file is where the code/logic is edited/implemented, but the runnable script is
// generated by the TypeScript compiler and is named `cds-extractor.js`.
console.log(`Completed run of the cds-extractor.js script for the CDS extractor.`);
