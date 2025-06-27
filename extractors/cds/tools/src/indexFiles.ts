import { join } from 'path';

import { CdsProject } from './cds/parser/types';
import { getCdsFilePathsToProcess } from './filesystem';
import { cdsExtractorLog } from './logging';

export interface IndexFilesValidationResult {
  success: boolean;
  warnings: string[];
  errorMessage?: string;
  discoveredCount: number;
  responseFileCount: number;
}

/**
 * Validates discovered CDS files against the response file for INDEX_FILES mode.
 * This function performs backwards compatibility validation to ensure that the
 * project-aware discovery is consistent with the legacy response file approach.
 *
 * @param cdsFilePathsToProcess Array of CDS file paths discovered through project-aware discovery
 * @param sourceRoot The source root directory
 * @param responseFile Path to the response file
 * @param platformInfo Platform information object with isWindows property
 * @returns Validation result with warnings and statistics
 */
export function validateIndexFilesMode(
  cdsFilePathsToProcess: string[],
  sourceRoot: string,
  responseFile: string,
  platformInfo: { isWindows: boolean },
): IndexFilesValidationResult {
  const warnings: string[] = [];

  // Validate response file and get the full paths of CDS files from response file
  const responseFileResult = getCdsFilePathsToProcess(responseFile, platformInfo);
  if (!responseFileResult.success) {
    return {
      success: false,
      warnings: [],
      errorMessage: responseFileResult.errorMessage,
      discoveredCount: cdsFilePathsToProcess.length,
      responseFileCount: 0,
    };
  }

  const responseFilePaths = responseFileResult.cdsFilePaths;

  // Convert discovered files to absolute paths for comparison
  const discoveredAbsolutePaths = cdsFilePathsToProcess.map(relativePath =>
    relativePath.startsWith(sourceRoot) ? relativePath : join(sourceRoot, relativePath),
  );

  // Validate that discovered files are consistent with response file
  const responseFileBasenames = responseFilePaths.map(path => path.replace(/^.*[/\\]/, ''));
  const discoveredBasenames = discoveredAbsolutePaths.map(path => path.replace(/^.*[/\\]/, ''));

  const unexpectedFiles = discoveredBasenames.filter(
    basename => !responseFileBasenames.includes(basename),
  );
  const missingFiles = responseFileBasenames.filter(
    basename => !discoveredBasenames.includes(basename),
  );

  if (unexpectedFiles.length > 0) {
    warnings.push(`Discovered CDS files not in response file: ${unexpectedFiles.join(', ')}`);
  }

  if (missingFiles.length > 0) {
    warnings.push(`Response file contains CDS files not discovered: ${missingFiles.join(', ')}`);
  }

  return {
    success: true,
    warnings,
    discoveredCount: cdsFilePathsToProcess.length,
    responseFileCount: responseFilePaths.length,
  };
}

/**
 * Handles the INDEX_FILES run mode processing.
 * This function performs project-aware CDS file discovery and validates the results
 * against the response file for backwards compatibility.
 *
 * @param projectMap Map of CDS projects discovered through project-aware parsing
 * @param sourceRoot The source root directory
 * @param responseFile Path to the response file
 * @param platformInfo Platform information object with isWindows property
 * @returns Object containing the CDS file paths to process and validation result
 */
export function handleIndexFilesMode(
  projectMap: Map<string, CdsProject>,
  sourceRoot: string,
  responseFile: string,
  platformInfo: { isWindows: boolean },
): {
  cdsFilePathsToProcess: string[];
  validationResult: IndexFilesValidationResult;
} {
  cdsExtractorLog('info', 'Extracting CDS files from discovered projects...');

  // Extract all CDS files from the discovered projects
  const cdsFilePathsToProcess: string[] = [];
  for (const [, project] of projectMap.entries()) {
    cdsFilePathsToProcess.push(...project.cdsFiles);
  }

  cdsExtractorLog(
    'info',
    'Validating discovered CDS files against response file for backwards compatibility...',
  );

  // Validate discovered files against response file
  const validationResult = validateIndexFilesMode(
    cdsFilePathsToProcess,
    sourceRoot,
    responseFile,
    platformInfo,
  );

  if (!validationResult.success) {
    return {
      cdsFilePathsToProcess: [],
      validationResult,
    };
  }

  // Log warnings if any
  validationResult.warnings.forEach(warning => {
    cdsExtractorLog('warn', warning);
  });

  cdsExtractorLog(
    'info',
    `Discovered ${validationResult.discoveredCount} CDS files from project analysis`,
  );
  cdsExtractorLog(
    'info',
    `Response file specified ${validationResult.responseFileCount} CDS files`,
  );

  return {
    cdsFilePathsToProcess,
    validationResult,
  };
}
