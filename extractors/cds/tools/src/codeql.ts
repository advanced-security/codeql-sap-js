import { spawnSync, SpawnSyncReturns } from 'child_process';
import { existsSync } from 'fs';

import { addJavaScriptExtractorDiagnostic } from './diagnostics';
import { getPlatformInfo } from './environment';
import { cdsExtractorLog } from './logging';

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
      addJavaScriptExtractorDiagnostic(sourceRoot, errorMessage, codeqlExePath);
    }
    return {
      success: false,
      error: errorMessage,
    };
  }

  if (result.status !== 0) {
    const errorMessage = `JavaScript extractor failed with exit code ${String(result.status)}`;
    if (codeqlExePath) {
      addJavaScriptExtractorDiagnostic(sourceRoot, errorMessage, codeqlExePath);
    }
    return {
      success: false,
      error: errorMessage,
    };
  }

  return { success: true };
}

/**
 * Validate the required environment variables and paths
 * @param sourceRoot The source root directory
 * @param codeqlExePath Path to the CodeQL executable
 * @param responseFile Path to the response file
 * @param autobuildScriptPath Path to the autobuild script
 * @param jsExtractorRoot JavaScript extractor root path
 * @returns true if all validations pass, false otherwise
 */
export function validateRequirements(
  sourceRoot: string,
  codeqlExePath: string,
  responseFile: string,
  autobuildScriptPath: string,
  jsExtractorRoot: string,
): boolean {
  const errorMessages: string[] = [];
  const { platform: osPlatform } = getPlatformInfo();
  const codeqlExe = osPlatform === 'win32' ? 'codeql.exe' : 'codeql';

  // Check if the JavaScript extractor autobuild script exists
  if (!existsSync(autobuildScriptPath)) {
    errorMessages.push(`autobuild script '${autobuildScriptPath}' does not exist`);
  }

  // Check if the CodeQL executable exists
  if (!existsSync(codeqlExePath)) {
    errorMessages.push(`codeql executable '${codeqlExePath}' does not exist`);
  }

  // Check if the response file exists
  if (!existsSync(responseFile)) {
    errorMessages.push(
      `response file '${responseFile}' does not exist. This is because no CDS files were selected or found`,
    );
  }

  // Check if the JavaScript extractor root is set
  if (!jsExtractorRoot) {
    errorMessages.push(`CODEQL_EXTRACTOR_JAVASCRIPT_ROOT environment variable is not set`);
  }

  // Check if the source root exists
  if (!existsSync(sourceRoot)) {
    errorMessages.push(`project root directory '${sourceRoot}' does not exist`);
  }

  if (errorMessages.length > 0) {
    cdsExtractorLog(
      'warn',
      `'${codeqlExe} database index-files --language cds' terminated early due to: ${errorMessages.join(
        ', ',
      )}.`,
    );
    return false;
  }

  return true;
}
