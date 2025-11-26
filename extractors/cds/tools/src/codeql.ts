import { spawnSync, SpawnSyncReturns } from 'child_process';

import type { CdsDependencyGraph } from './cds/parser';
import { addJavaScriptExtractorDiagnostic } from './diagnostics';
import { configureLgtmIndexFilters } from './environment';
import { createMarkerFile, removeMarkerFile } from './filesystem';
import {
  cdsExtractorLog,
  logExtractorStop,
  logPerformanceTrackingStart,
  logPerformanceTrackingStop,
} from './logging';

/**
 * Run the JavaScript extractor autobuild script
 * @param sourceRoot The source root directory
 * @param autobuildScriptPath Path to the autobuild script
 * @param codeqlExePath Path to the CodeQL executable (optional)
 * @returns Success status and any error message
 */
export function runJavaScriptExtractor(
  sourceRoot: string,
  autobuildScriptPath: string,
  codeqlExePath?: string,
): { success: boolean; error?: string } {
  cdsExtractorLog(
    'info',
    `Extracting the .cds.json files by running the 'javascript' extractor autobuild script:
        ${autobuildScriptPath}`,
  );

  /**
   * Invoke the javascript autobuilder to index the .cds.json files only.
   *
   * Environment variables must be passed from this script's process to the
   * process that invokes the autobuild script, otherwise the CDS autobuild.sh
   * script will not be invoked by the autobuild script built into the
   * 'javascript' extractor.
   *
   * IMPORTANT: The JavaScript extractor autobuild script must be invoked with
   * the current working directory set to the project (source) root directory
   * because it assumes it is running from there.
   */
  const result: SpawnSyncReturns<Buffer> = spawnSync(autobuildScriptPath, [], {
    cwd: sourceRoot,
    env: process.env,
    shell: true,
    stdio: 'inherit',
  });

  if (result.error) {
    const errorMessage = `Error running JavaScript extractor: ${result.error.message}`;
    if (codeqlExePath) {
      addJavaScriptExtractorDiagnostic(sourceRoot, errorMessage, codeqlExePath, sourceRoot);
    }
    return {
      success: false,
      error: errorMessage,
    };
  }

  if (result.status !== 0) {
    const errorMessage = `JavaScript extractor failed with exit code ${String(result.status)}`;
    if (codeqlExePath) {
      addJavaScriptExtractorDiagnostic(sourceRoot, errorMessage, codeqlExePath, sourceRoot);
    }
    return {
      success: false,
      error: errorMessage,
    };
  }

  return { success: true };
}

/**
 * Runs JavaScript extraction with marker file handling and optional dependency graph updates.
 * Encapsulates the common pattern used in multiple places throughout the extractor.
 *
 * @param sourceRoot - The root directory of the source code
 * @param autobuildScriptPath - Path to the autobuild script
 * @param codeqlExePath - Path to the CodeQL executable
 * @param dependencyGraph - Optional dependency graph to update with performance metrics
 * @returns True if extraction was successful, false otherwise
 */
export function runJavaScriptExtractionWithMarker(
  sourceRoot: string,
  autobuildScriptPath: string,
  codeqlExePath: string,
  dependencyGraph?: CdsDependencyGraph,
): boolean {
  // Configure LGTM index filters
  configureLgtmIndexFilters();

  // Create marker file
  const markerFilePath = createMarkerFile(sourceRoot);

  try {
    logPerformanceTrackingStart('JavaScript Extraction');
    const extractionStartTime = Date.now();
    const extractorResult = runJavaScriptExtractor(sourceRoot, autobuildScriptPath, codeqlExePath);
    const extractionEndTime = Date.now();
    logPerformanceTrackingStop('JavaScript Extraction');

    // Update dependency graph metrics if provided
    if (dependencyGraph) {
      dependencyGraph.statusSummary.performance.extractionDurationMs =
        extractionEndTime - extractionStartTime;
      dependencyGraph.statusSummary.performance.totalDurationMs =
        dependencyGraph.statusSummary.performance.parsingDurationMs +
        dependencyGraph.statusSummary.performance.compilationDurationMs +
        dependencyGraph.statusSummary.performance.extractionDurationMs;
    }

    // Handle extraction failure
    if (!extractorResult.success && extractorResult.error) {
      cdsExtractorLog('error', `Error running JavaScript extractor: ${extractorResult.error}`);

      if (codeqlExePath) {
        let representativeFile = sourceRoot;
        if (dependencyGraph && dependencyGraph.projects.size > 0) {
          const firstProject = Array.from(dependencyGraph.projects.values())[0];
          representativeFile = firstProject.cdsFiles[0] ?? sourceRoot;
        }
        addJavaScriptExtractorDiagnostic(
          representativeFile,
          extractorResult.error,
          codeqlExePath,
          sourceRoot,
        );
      }
      return false;
    }

    return true;
  } finally {
    // Always clean up marker file
    removeMarkerFile(markerFilePath);
  }
}

/**
 * Handles early exit scenarios by running JavaScript extraction and exiting gracefully.
 * This function never returns - it always exits the process with code 0.
 *
 * @param sourceRoot - The root directory of the source code
 * @param autobuildScriptPath - Path to the autobuild script
 * @param codeqlExePath - Path to the CodeQL executable
 * @param skipMessage - Message to log when exiting early
 */
export function handleEarlyExit(
  sourceRoot: string,
  autobuildScriptPath: string,
  codeqlExePath: string,
  skipMessage: string,
): never {
  const success = runJavaScriptExtractionWithMarker(sourceRoot, autobuildScriptPath, codeqlExePath);
  logExtractorStop(success, success ? skipMessage : 'JavaScript extractor failed');
  console.log(`Completed run of the cds-extractor.js script for the CDS extractor.`);
  process.exit(0);
}
