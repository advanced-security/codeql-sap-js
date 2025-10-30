import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { arch, platform } from 'os';
import { join, resolve } from 'path';

import { dirExists } from './filesystem';
import { cdsExtractorLog } from './logging';

/**
 * Interface for platform information
 */
export interface PlatformInfo {
  platform: string;
  arch: string;
  isWindows: boolean;
  exeExtension: string;
}

/**
 * Interface for environment validation results
 */
export interface EnvironmentSetupResult {
  success: boolean;
  errorMessages: string[];
  codeqlExePath: string;
  jsExtractorRoot: string;
  autobuildScriptPath: string;
  platformInfo: PlatformInfo;
}

/**
 * Get platform information
 * @returns Platform information including OS platform, architecture, and whether it's Windows
 */
export function getPlatformInfo(): PlatformInfo {
  const osPlatform: string = platform();
  const osPlatformArch: string = arch();
  const isWindows = osPlatform === 'win32';
  const exeExtension = isWindows ? '.exe' : '';

  return {
    platform: osPlatform,
    arch: osPlatformArch,
    isWindows,
    exeExtension,
  };
}

/**
 * Get the path to the CodeQL executable.
 * Prioritizes CODEQL_DIST if set and valid. Otherwise, tries to find CodeQL via system PATH.
 * @returns The resolved path to the CodeQL executable, or an empty string if not found.
 */
export function getCodeQLExePath(): string {
  const platformInfo = getPlatformInfo();
  const codeqlExeName: string = platformInfo.isWindows ? 'codeql.exe' : 'codeql';

  // First, check if CODEQL_DIST is set and valid
  const codeqlDist = process.env.CODEQL_DIST;
  if (codeqlDist) {
    const codeqlPathFromDist = resolve(join(codeqlDist, codeqlExeName));
    if (existsSync(codeqlPathFromDist)) {
      cdsExtractorLog('info', `Using CodeQL executable from CODEQL_DIST: ${codeqlPathFromDist}`);
      return codeqlPathFromDist;
    } else {
      cdsExtractorLog(
        'error',
        `CODEQL_DIST is set to '${codeqlDist}', but CodeQL executable was not found at '${codeqlPathFromDist}'. Please ensure this path is correct. Falling back to PATH-based discovery.`,
      );
      // Fall through to PATH-based discovery
    }
  }

  // CODEQL_DIST is not set or was invalid, attempt to find CodeQL via system PATH using 'codeql version --format=json'
  cdsExtractorLog(
    'info',
    'CODEQL_DIST environment variable not set or invalid. Attempting to find CodeQL executable via system PATH using "codeql version --format=json".',
  );
  try {
    const versionOutput = execFileSync(codeqlExeName, ['version', '--format=json'], {
      encoding: 'utf8',
      timeout: 5000, // 5 seconds timeout
      stdio: 'pipe', // Suppress output to console
    });

    interface CodeQLVersionInfo {
      unpackedLocation?: string;
      cliVersion?: string; // For potential future use or richer logging
    }

    try {
      const versionInfo = JSON.parse(versionOutput) as CodeQLVersionInfo;

      if (
        versionInfo &&
        typeof versionInfo.unpackedLocation === 'string' &&
        versionInfo.unpackedLocation
      ) {
        const resolvedPathFromVersion = resolve(join(versionInfo.unpackedLocation, codeqlExeName));
        if (existsSync(resolvedPathFromVersion)) {
          cdsExtractorLog(
            'info',
            `CodeQL executable found via 'codeql version --format=json' at: ${resolvedPathFromVersion}`,
          );
          return resolvedPathFromVersion;
        }
        cdsExtractorLog(
          'warn',
          `'codeql version --format=json' provided unpackedLocation '${versionInfo.unpackedLocation}', but executable not found at '${resolvedPathFromVersion}'.`,
        );
      } else {
        cdsExtractorLog(
          'warn',
          "Could not determine CodeQL executable path from 'codeql version --format=json' output. 'unpackedLocation' field missing, empty, or invalid.",
        );
      }
    } catch (parseError) {
      cdsExtractorLog(
        'warn',
        `Failed to parse 'codeql version --format=json' output: ${String(parseError)}. Output was: ${versionOutput}`,
      );
    }
  } catch (error) {
    let errorMessage = `INFO: Failed to find CodeQL executable via 'codeql version --format=json'. Error: ${String(error)}`;
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      errorMessage += `\nINFO: The command '${codeqlExeName}' was not found in your system PATH.`;
    }
    cdsExtractorLog('info', errorMessage);
  }

  cdsExtractorLog(
    'error',
    'Failed to determine CodeQL executable path. Please ensure the CODEQL_DIST environment variable is set and points to a valid CodeQL distribution, or that the CodeQL CLI (codeql) is available in your system PATH and "codeql version --format=json" can provide its location.',
  );
  return ''; // Return empty string if all attempts fail
}

/**
 * Get the JavaScript extractor root path.
 * @param codeqlExePath The path to the CodeQL executable. If empty, resolution will be skipped.
 * @returns The JavaScript extractor root path, or an empty string if not found or if codeqlExePath is empty.
 */
export function getJavaScriptExtractorRoot(codeqlExePath: string): string {
  let jsExtractorRoot = process.env.CODEQL_EXTRACTOR_JAVASCRIPT_ROOT ?? '';

  if (jsExtractorRoot) {
    cdsExtractorLog(
      'info',
      `Using JavaScript extractor root from environment variable CODEQL_EXTRACTOR_JAVASCRIPT_ROOT: ${jsExtractorRoot}`,
    );
    return jsExtractorRoot;
  }

  if (!codeqlExePath) {
    cdsExtractorLog(
      'warn',
      'Cannot resolve JavaScript extractor root because the CodeQL executable path was not provided or found.',
    );
    return '';
  }

  try {
    jsExtractorRoot = execFileSync(
      codeqlExePath,
      ['resolve', 'extractor', '--language=javascript'],
      { stdio: 'pipe' }, // Suppress output from the command itself
    )
      .toString()
      .trim();
    if (jsExtractorRoot) {
      cdsExtractorLog('info', `JavaScript extractor root resolved to: ${jsExtractorRoot}`);
    } else {
      cdsExtractorLog(
        'warn',
        `'codeql resolve extractor --language=javascript' using '${codeqlExePath}' returned an empty path.`,
      );
    }
  } catch (error) {
    cdsExtractorLog(
      'error',
      `Error resolving JavaScript extractor root using '${codeqlExePath}': ${String(error)}`,
    );
    jsExtractorRoot = ''; // Ensure it's empty on error
  }
  return jsExtractorRoot;
}

/**
 * Set JavaScript extractor environment variables using CDS extractor variables
 */
export function setupJavaScriptExtractorEnv(): void {
  process.env.CODEQL_EXTRACTOR_JAVASCRIPT_WIP_DATABASE =
    process.env.CODEQL_EXTRACTOR_CDS_WIP_DATABASE;
  process.env.CODEQL_EXTRACTOR_JAVASCRIPT_DIAGNOSTIC_DIR =
    process.env.CODEQL_EXTRACTOR_CDS_DIAGNOSTIC_DIR;
  process.env.CODEQL_EXTRACTOR_JAVASCRIPT_LOG_DIR = process.env.CODEQL_EXTRACTOR_CDS_LOG_DIR;
  process.env.CODEQL_EXTRACTOR_JAVASCRIPT_SCRATCH_DIR =
    process.env.CODEQL_EXTRACTOR_CDS_SCRATCH_DIR;
  process.env.CODEQL_EXTRACTOR_JAVASCRIPT_TRAP_DIR = process.env.CODEQL_EXTRACTOR_CDS_TRAP_DIR;
  process.env.CODEQL_EXTRACTOR_JAVASCRIPT_SOURCE_ARCHIVE_DIR =
    process.env.CODEQL_EXTRACTOR_CDS_SOURCE_ARCHIVE_DIR;
}

/**
 * Get the path to the autobuild script
 * @param jsExtractorRoot The JavaScript extractor root path
 * @returns The path to the autobuild script, or an empty string if jsExtractorRoot is empty.
 */
export function getAutobuildScriptPath(jsExtractorRoot: string): string {
  if (!jsExtractorRoot) return '';
  const platformInfo = getPlatformInfo();
  const autobuildScriptName: string = platformInfo.isWindows ? 'autobuild.cmd' : 'autobuild.sh';
  return resolve(join(jsExtractorRoot, 'tools', autobuildScriptName));
}

/**
 * Configure LGTM index filters for CDS files
 */
export function configureLgtmIndexFilters(): void {
  let excludeFilters = '';

  if (process.env.LGTM_INDEX_FILTERS) {
    cdsExtractorLog(
      'info',
      `Found $LGTM_INDEX_FILTERS already set to:
${process.env.LGTM_INDEX_FILTERS}`,
    );
    const allowedExcludePatterns = [join('exclude:**', '*'), join('exclude:**', '*.*')];

    excludeFilters =
      '\n' +
      process.env.LGTM_INDEX_FILTERS.split('\n')
        .filter(
          line =>
            line.startsWith('exclude') &&
            !allowedExcludePatterns.some(pattern => line.includes(pattern)),
        )
        .join('\n');
  }

  // Enable extraction of the .cds.json files only.
  const lgtmIndexFiltersPatterns = [
    join('exclude:**', '*.*'),
    join('include:**', '*.cds.json'),
    join('include:**', '*.cds'),
    join('exclude:**', 'node_modules', '**', '*.*'),
  ].join('\n');

  process.env.LGTM_INDEX_FILTERS = lgtmIndexFiltersPatterns + excludeFilters;
  process.env.LGTM_INDEX_TYPESCRIPT = 'NONE';
  // Configure to copy over the .cds files as well, by pretending they are JSON.
  process.env.LGTM_INDEX_FILETYPES = '.cds:JSON';
}

/**
 * Sets up the environment and validates key components for running the CDS extractor.
 * This includes checking for the CodeQL executable, validating the source root directory,
 * and setting up environment variables for the JavaScript extractor.
 *
 * @param sourceRoot The source root directory.
 *
 * @returns The {@link EnvironmentSetupResult} containing success status, error messages,
 *          CodeQL executable path, JavaScript extractor root, autobuild script path,
 *          and platform information.
 *
 * @throws Will throw an error if the environment setup fails.
 */
export function setupAndValidateEnvironment(sourceRoot: string): EnvironmentSetupResult {
  const errorMessages: string[] = [];
  const platformInfo = getPlatformInfo();

  // Get the CodeQL executable path
  const codeqlExePath = getCodeQLExePath();
  if (!codeqlExePath) {
    errorMessages.push(
      'Failed to find CodeQL executable. Ensure CODEQL_DIST is set and valid, or CodeQL CLI is in PATH.',
    );
  }

  // Validate that the required source root directory exists
  if (!dirExists(sourceRoot)) {
    errorMessages.push(`Project root directory '${sourceRoot}' does not exist.`);
  }

  // Get JavaScript extractor root
  const jsExtractorRoot = getJavaScriptExtractorRoot(codeqlExePath);
  if (!jsExtractorRoot) {
    if (codeqlExePath) {
      // Only add this error if codeqlExePath was found but JS extractor root wasn't
      errorMessages.push(
        'Failed to determine JavaScript extractor root using the found CodeQL executable.',
      );
    } else {
      // If codeqlExePath is empty, the error from getCodeQLExePath is usually sufficient.
      // However, we can add a more specific one if needed.
      errorMessages.push(
        'Cannot determine JavaScript extractor root because CodeQL executable was not found.',
      );
    }
  }

  // Set environment variables for JavaScript extractor only if jsExtractorRoot is valid
  if (jsExtractorRoot) {
    process.env.CODEQL_EXTRACTOR_JAVASCRIPT_ROOT = jsExtractorRoot;
    setupJavaScriptExtractorEnv();
  }

  // Get autobuild script path
  const autobuildScriptPath = jsExtractorRoot ? getAutobuildScriptPath(jsExtractorRoot) : '';
  // Not having an autobuild script path might be an error depending on the run mode,
  // but for now, the function just returns what it found.

  return {
    success: errorMessages.length === 0,
    errorMessages,
    codeqlExePath, // Will be '' if not found
    jsExtractorRoot, // Will be '' if not found
    autobuildScriptPath,
    platformInfo,
  };
}
