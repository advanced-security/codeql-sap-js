import { execFileSync } from 'child_process';
import { join } from 'path';

import { fileExists } from '../../filesystem';

/**
 * Determine the `cds` command to use based on the environment and cache directory.
 * @param cacheDir Optional path to a directory containing installed dependencies
 * @returns A string representing the CLI command to run to invoke the
 * CDS compiler.
 */
export function determineCdsCommand(cacheDir?: string): string {
  // If we have a cache directory, use the cds binary from there
  if (cacheDir) {
    const localCdsBin = join(cacheDir, 'node_modules', '.bin', 'cds');

    // Check if the local cds binary exists in the cache directory
    if (fileExists(localCdsBin)) {
      // We need to use node to execute the local bin directly to ensure correct resolution
      return `node "${localCdsBin}"`;
    }

    // If there's a cache directory but no local binary, use npx with NODE_PATH
    return `npx --no-install cds`;
  }

  // Default behavior when no cache directory is provided
  let cdsCommand = 'cds';
  try {
    execFileSync('cds', ['--version'], { stdio: 'ignore' });
  } catch {
    // If 'cds' command is not available, use npx to run it
    cdsCommand = 'npx -y --package @sap/cds-dk cds';
  }
  return cdsCommand;
}
