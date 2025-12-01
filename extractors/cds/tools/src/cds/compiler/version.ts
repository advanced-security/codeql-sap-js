import { spawnSync, SpawnSyncOptions } from 'child_process';
import { join, delimiter } from 'path';

/**
 * Get the CDS compiler version from a specific command or cache directory.
 * @param cdsCommand The CDS command to use.
 * @param cacheDir Optional path to a directory containing installed dependencies.
 * @returns The CDS compiler version string, or undefined if it couldn't be determined.
 */
export function getCdsVersion(cdsCommand: string, cacheDir?: string): string | undefined {
  try {
    // Set up environment vars if using a cache directory
    const spawnOptions: SpawnSyncOptions = {
      shell: true,
      stdio: 'pipe',
      env: { ...process.env },
    };

    // If a cache directory is provided, set NODE_PATH to use that cache
    if (cacheDir) {
      const nodePath = join(cacheDir, 'node_modules');

      // Set up environment to use the cached dependencies
      spawnOptions.env = {
        ...process.env,
        NODE_PATH: `${nodePath}${delimiter}${process.env.NODE_PATH ?? ''}`,
        PATH: `${join(nodePath, '.bin')}${delimiter}${process.env.PATH}`,
        npm_config_prefix: cacheDir,
      };
    }

    // Execute the CDS command with the --version flag
    // When shell: true is used, concatenate command and args to avoid DEP0190 deprecation warning
    const result = spawnSync(`${cdsCommand} --version`, spawnOptions);
    if (result.status === 0 && result.stdout) {
      const versionOutput = result.stdout.toString().trim();
      // Extract version number, which is typically in formats like "@sap/cds: 6.1.3" or similar
      const match = versionOutput.match(/@sap\/cds[^0-9]*([0-9]+\.[0-9]+\.[0-9]+)/);
      if (match?.[1]) {
        return match[1]; // Return just the version number
      }
      return versionOutput; // Return full output if we couldn't parse it
    }
    return undefined;
  } catch {
    return undefined;
  }
}
