import { join } from 'path';

import { sync as globSync } from 'glob';

import { orchestrateCompilation } from './src/cds/compiler';
import { buildCdsProjectDependencyGraph, type CdsDependencyGraph } from './src/cds/parser';
import { handleEarlyExit, runJavaScriptExtractionWithMarker } from './src/codeql';
import {
  addCompilationDiagnostic,
  addDependencyGraphDiagnostic,
  addDependencyInstallationDiagnostic,
  addEnvironmentSetupDiagnostic,
  addNoCdsProjectsDiagnostic,
} from './src/diagnostics';
import { setupAndValidateEnvironment } from './src/environment';
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

// ============================================================================
// Main Extraction Flow
// ============================================================================

// Validate arguments
const validationResult = validateArguments(process.argv);
if (!validationResult.isValid) {
  console.warn(validationResult.usageMessage);
  console.log(
    `CDS extractor terminated due to invalid arguments: ${validationResult.usageMessage}`,
  );
  console.log(`Completed run of the cds-extractor.js script for the CDS extractor.`);
  process.exit(0);
}

const { sourceRoot } = validationResult.args!;

// Initialize logging
setSourceRootDirectory(sourceRoot);
logExtractorStart(sourceRoot);

// Setup and validate environment
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
  const errorMessage = `'${codeqlExe} database index-files --language cds' terminated early due to: ${errorMessages.join(', ')}.`;
  cdsExtractorLog('warn', errorMessage);

  if (codeqlExePath) {
    addEnvironmentSetupDiagnostic(sourceRoot, errorMessage, codeqlExePath);
  }

  logExtractorStop(
    false,
    'Warning: Environment setup failed, continuing with limited functionality',
  );
} else {
  process.chdir(sourceRoot);
}

cdsExtractorLog(
  'info',
  `CodeQL CDS extractor using autobuild mode for scan of project source root directory '${sourceRoot}'.`,
);

// Build CDS project dependency graph
cdsExtractorLog('info', 'Building CDS project dependency graph...');
let dependencyGraph: CdsDependencyGraph;

try {
  logPerformanceTrackingStart('Dependency Graph Build');
  dependencyGraph = buildCdsProjectDependencyGraph(sourceRoot);
  logPerformanceTrackingStop('Dependency Graph Build');

  logPerformanceMilestone(
    'Dependency graph created',
    `${dependencyGraph.projects.size} projects, ${dependencyGraph.statusSummary.totalCdsFiles} CDS files`,
  );

  // Log project details
  if (dependencyGraph.projects.size > 0) {
    for (const [projectDir, project] of dependencyGraph.projects.entries()) {
      cdsExtractorLog(
        'info',
        `Project: ${projectDir}, Status: ${project.status}, CDS files: ${project.cdsFiles.length}, Compilation targets: ${project.compilationTargets.length}`,
      );
    }
  } else {
    // No CDS projects detected - try direct file search as diagnostic
    cdsExtractorLog(
      'error',
      'No CDS projects were detected. This is an unrecoverable error as there is nothing to scan.',
    );

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

    const warningMessage =
      'No CDS projects were detected. This may be expected if the source does not contain CAP/CDS projects.';
    if (codeqlExePath) {
      addNoCdsProjectsDiagnostic(sourceRoot, warningMessage, codeqlExePath);
    }

    logExtractorStop(false, 'Warning: No CDS projects detected, skipping CDS-specific processing');
    handleEarlyExit(
      sourceRoot,
      autobuildScriptPath || '',
      codeqlExePath,
      'JavaScript extraction completed (CDS processing was skipped)',
    );
  }
} catch (error) {
  const errorMessage = `Failed to build CDS dependency graph: ${String(error)}`;
  cdsExtractorLog('error', errorMessage);

  if (codeqlExePath) {
    addDependencyGraphDiagnostic(sourceRoot, errorMessage, codeqlExePath);
  }

  logExtractorStop(
    false,
    'Warning: Dependency graph build failed, skipping CDS-specific processing',
  );
  handleEarlyExit(
    sourceRoot,
    autobuildScriptPath || '',
    codeqlExePath,
    'JavaScript extraction completed (CDS processing was skipped)',
  );
}

// Install dependencies
logPerformanceTrackingStart('Dependency Installation');
const projectCacheDirMap = cacheInstallDependencies(dependencyGraph, sourceRoot, codeqlExePath);
logPerformanceTrackingStop('Dependency Installation');

if (projectCacheDirMap.size === 0) {
  cdsExtractorLog(
    'error',
    'No project cache directory mappings were created. This indicates that dependency installation failed for all discovered projects.',
  );

  if (dependencyGraph.projects.size > 0) {
    const errorMessage = `Found ${dependencyGraph.projects.size} CDS projects but failed to install dependencies for any of them. Cannot proceed with compilation.`;
    cdsExtractorLog('error', errorMessage);

    if (codeqlExePath) {
      addDependencyInstallationDiagnostic(sourceRoot, errorMessage, codeqlExePath);
    }

    logExtractorStop(
      false,
      'Warning: Dependency installation failed for all projects, continuing with limited functionality',
    );
  }

  cdsExtractorLog(
    'warn',
    'No projects and no cache mappings - this should have been detected earlier.',
  );
}

// Collect all CDS files to process
const cdsFilePathsToProcess: string[] = [];
for (const project of dependencyGraph.projects.values()) {
  cdsFilePathsToProcess.push(...project.cdsFiles);
}

cdsExtractorLog(
  'info',
  `Found ${cdsFilePathsToProcess.length} total CDS files, ${dependencyGraph.statusSummary.totalCdsFiles} CDS files in dependency graph`,
);

// Compile CDS files
logPerformanceTrackingStart('CDS Compilation');
try {
  orchestrateCompilation(dependencyGraph, projectCacheDirMap, codeqlExePath);

  if (!dependencyGraph.statusSummary.overallSuccess) {
    cdsExtractorLog(
      'error',
      `Compilation completed with failures: ${dependencyGraph.statusSummary.failedCompilations} failed out of ${dependencyGraph.statusSummary.totalCompilationTasks} total tasks`,
    );

    for (const error of dependencyGraph.errors.critical) {
      cdsExtractorLog('error', `Critical error in ${error.phase}: ${error.message}`);
    }
  }

  logPerformanceTrackingStop('CDS Compilation');
  logPerformanceMilestone('CDS compilation completed');
} catch (error) {
  logPerformanceTrackingStop('CDS Compilation');
  cdsExtractorLog('error', `Compilation orchestration failed: ${String(error)}`);

  if (cdsFilePathsToProcess.length > 0) {
    addCompilationDiagnostic(
      cdsFilePathsToProcess[0],
      `Compilation orchestration failed: ${String(error)}`,
      codeqlExePath,
      sourceRoot,
    );
  }
}

// Run JavaScript extraction with marker file handling
const extractionSuccess = runJavaScriptExtractionWithMarker(
  sourceRoot,
  autobuildScriptPath,
  codeqlExePath,
  dependencyGraph,
);

logExtractorStop(
  extractionSuccess,
  extractionSuccess ? 'CDS extraction completed successfully' : 'JavaScript extractor failed',
);

cdsExtractorLog(
  'info',
  'CDS Extractor Status Report : Final...\n' + generateStatusReport(dependencyGraph),
);

console.log(`Completed run of the cds-extractor.js script for the CDS extractor.`);
