import { spawnSync, SpawnSyncReturns } from 'child_process';

import { addJavaScriptExtractorDiagnostic } from './diagnostics';
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
