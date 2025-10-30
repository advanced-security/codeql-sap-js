import { execFileSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

import type { ValidatedCdsCommand } from './types';
import { fileExists } from '../../filesystem';
import { cdsExtractorLog } from '../../logging';
import type { CdsDependencyGraph } from '../parser/types';

/** Default timeout for command execution in milliseconds. **/
export const DEFAULT_COMMAND_TIMEOUT_MS = 10000;

/**
 * Cache for CDS command test results to avoid running the same CLI commands repeatedly.
 */
interface CdsCommandCache {
  /** Map of command strings to their test results */
  commandResults: Map<string, { works: boolean; version?: string; error?: string }>;
  /** Available cache directories discovered during testing */
  availableCacheDirs: string[];
  /** Global command test results */
  globalCommand?: string;
  /** Whether cache has been initialized */
  initialized: boolean;
}

// Global cache instance to share results across all calls
const cdsCommandCache: CdsCommandCache = {
  commandResults: new Map(),
  availableCacheDirs: [],
  initialized: false,
};

/**
 * Information about CDS version dependencies from a project's package.json
 */
interface CdsVersionInfo {
  /** Semver range for @sap/cds */
  cdsVersion?: string;
  /** Semver range for @sap/cds-dk */
  cdsDkVersion?: string;
  /** Computed compatible @sap/cds-dk version */
  preferredDkVersion?: string;
}

/**
 * Factory functions to create {@link ValidatedCdsCommand} instances.
 */
const createCdsCommands = {
  // Global CDS command
  cds: (): ValidatedCdsCommand => ({
    executable: 'cds',
    args: [],
    originalCommand: 'cds',
  }),
  // NPX with @sap/cds package
  npxCds: (): ValidatedCdsCommand => ({
    executable: 'npx',
    args: ['--yes', '--package', '@sap/cds', 'cds'],
    originalCommand: 'npx --yes --package @sap/cds cds',
  }),
  // NPX with @sap/cds-dk package
  npxCdsDk: (): ValidatedCdsCommand => ({
    executable: 'npx',
    args: ['--yes', '--package', '@sap/cds-dk', 'cds'],
    originalCommand: 'npx --yes --package @sap/cds-dk cds',
  }),
  // NPX with @sap/cds-dk package (alternative flag)
  npxCdsDkAlt: (): ValidatedCdsCommand => ({
    executable: 'npx',
    args: ['--yes', '@sap/cds-dk', 'cds'],
    originalCommand: 'npx --yes @sap/cds-dk cds',
  }),
  // NPX with versioned @sap/cds-dk package
  npxCdsDkWithVersion: (version: string): ValidatedCdsCommand => ({
    executable: 'npx',
    args: ['--yes', '--package', `@sap/cds-dk@${version}`, 'cds'],
    originalCommand: `npx --yes --package @sap/cds-dk@${version} cds`,
  }),
  // NPX with versioned @sap/cds package
  npxCdsWithVersion: (version: string): ValidatedCdsCommand => ({
    executable: 'npx',
    args: ['--yes', '--package', `@sap/cds@${version}`, 'cds'],
    originalCommand: `npx --yes --package @sap/cds@${version} cds`,
  }),
};

/**
 * Converts a command string to a ValidatedCdsCommand object
 * @param commandString The command string to convert
 * @returns A ValidatedCdsCommand object
 */
function parseCommandString(commandString: string): ValidatedCdsCommand {
  const parts = commandString.trim().split(/\s+/);
  if (parts.length === 0) {
    throw new Error('Empty command string');
  }

  const executable = parts[0];
  const args = parts.slice(1);

  return {
    executable,
    args,
    originalCommand: commandString,
  };
}

/**
 * Determines version-aware CDS commands for both primary and retry scenarios
 * @param cacheDir Optional cache directory
 * @param sourceRoot Source root directory
 * @param projectPath Project path for version resolution
 * @param dependencyGraph Dependency graph for version information
 * @returns Object containing both primary and retry commands
 */
export function determineVersionAwareCdsCommands(
  cacheDir: string | undefined,
  sourceRoot: string,
  projectPath?: string,
  dependencyGraph?: CdsDependencyGraph,
): { primaryCommand: ValidatedCdsCommand; retryCommand: ValidatedCdsCommand } {
  try {
    // Get the best command string using existing logic
    const commandString = getBestCdsCommand(cacheDir, sourceRoot, projectPath, dependencyGraph);

    // Convert to ValidatedCdsCommand for primary use
    const primaryCommand = parseCommandString(commandString);

    // For retry command, always try to use a version-aware npx command if project context is available
    let retryCommand: ValidatedCdsCommand;

    if (projectPath && dependencyGraph) {
      try {
        const versionInfo = resolveCdsVersions(projectPath, dependencyGraph);
        if (versionInfo?.preferredDkVersion) {
          // Use version-specific command for retry
          retryCommand = createCdsCommands.npxCdsDkWithVersion(versionInfo.preferredDkVersion);
        } else if (versionInfo?.cdsDkVersion) {
          // Use explicit cds-dk version
          retryCommand = createCdsCommands.npxCdsDkWithVersion(versionInfo.cdsDkVersion);
        } else {
          // Fall back to generic npx cds-dk
          retryCommand = createCdsCommands.npxCdsDk();
        }
      } catch (error) {
        // If version resolution fails, fall back to generic npx
        cdsExtractorLog(
          'warn',
          `Failed to resolve version info for ${projectPath}: ${String(error)}`,
        );
        retryCommand = createCdsCommands.npxCdsDk();
      }
    } else {
      // No project context - use generic npx as fallback
      retryCommand = createCdsCommands.npxCdsDk();
    }

    return { primaryCommand, retryCommand };
  } catch (error) {
    // If anything fails, fall back to simple commands
    cdsExtractorLog('error', `Failed to determine version-aware commands: ${String(error)}`);
    const fallbackCommand = parseCommandString('cds');
    return {
      primaryCommand: fallbackCommand,
      retryCommand: createCdsCommands.npxCdsDk(),
    };
  }
} /**
 * Creates a validated CDS command for an absolute path to a CDS executable.
 * @param absolutePath The absolute path to the CDS executable
 * @returns A {@link ValidatedCdsCommand} if the path exists and is valid, null otherwise
 */
function createCdsCommandForPath(absolutePath: string): ValidatedCdsCommand | null {
  try {
    const resolvedPath = resolve(absolutePath);
    if (resolvedPath && fileExists(resolvedPath)) {
      return {
        executable: resolvedPath,
        args: [],
        originalCommand: absolutePath,
      };
    }
  } catch {
    // Ignore path resolution errors
  }
  return null;
}

/**
 * Resolve CDS version information from a project's package.json via dependency graph
 * @param projectPath The path to the project
 * @param dependencyGraph The CDS dependency graph containing project information
 * @returns CDS version information or undefined if not available
 */
function resolveCdsVersions(
  projectPath: string,
  dependencyGraph: CdsDependencyGraph,
): CdsVersionInfo | undefined {
  const project = dependencyGraph.projects.get(projectPath);
  if (!project?.packageJson) {
    return undefined;
  }

  const { dependencies = {}, devDependencies = {} } = project.packageJson;
  const allDependencies = { ...dependencies, ...devDependencies };

  const cdsVersion = allDependencies['@sap/cds'];
  const cdsDkVersion = allDependencies['@sap/cds-dk'];

  if (!cdsVersion && !cdsDkVersion) {
    return undefined;
  }

  let preferredDkVersion: string | undefined;
  if (cdsDkVersion) {
    // Use explicit @sap/cds-dk version if available, but enforce minimum
    preferredDkVersion = enforceMinimumCdsDkVersion(cdsDkVersion);
  } else if (cdsVersion) {
    // Derive compatible @sap/cds-dk version from @sap/cds version
    preferredDkVersion = deriveCompatibleCdsDkVersion(cdsVersion);
  }

  return {
    cdsVersion,
    cdsDkVersion,
    preferredDkVersion,
  };
}

/**
 * Enforce minimum @sap/cds-dk version requirement
 * @param version The version string to check
 * @returns The version string with minimum version enforcement applied
 */
function enforceMinimumCdsDkVersion(version: string): string {
  const minimumVersion = 8;
  const majorVersionMatch = version.match(/\^?(\d+)/);

  if (majorVersionMatch) {
    const majorVersion = parseInt(majorVersionMatch[1], 10);
    if (majorVersion < minimumVersion) {
      // Use the minimum version if derived version is too low
      return `^${minimumVersion}`;
    }
  }

  // Return original version if it meets minimum requirement or can't be parsed
  return version;
}

/**
 * Derive a compatible @sap/cds-dk version from an @sap/cds version
 * @param cdsVersion The @sap/cds version semver range
 * @returns A compatible @sap/cds-dk version range with minimum version enforcement
 */
function deriveCompatibleCdsDkVersion(cdsVersion: string): string {
  // For simplicity, we'll use the same major version range
  // This can be enhanced with more sophisticated logic as needed
  const majorVersionMatch = cdsVersion.match(/\^?(\d+)/);
  let derivedVersion: string;

  if (majorVersionMatch) {
    const majorVersion = majorVersionMatch[1];
    derivedVersion = `^${majorVersion}`;
  } else {
    // Fallback to the original version if we can't parse it
    derivedVersion = cdsVersion;
  }

  // Apply minimum version enforcement
  return enforceMinimumCdsDkVersion(derivedVersion);
}

/**
 * Create a version-aware CDS command based on project information
 * @param projectPath The path to the project
 * @param dependencyGraph The CDS dependency graph containing project information
 * @returns A ValidatedCdsCommand if version information is available, null otherwise
 */
function createVersionAwareCdsCommand(
  projectPath: string,
  dependencyGraph: CdsDependencyGraph,
): ValidatedCdsCommand | null {
  const versionInfo = resolveCdsVersions(projectPath, dependencyGraph);

  if (!versionInfo?.preferredDkVersion) {
    return null;
  }

  return createCdsCommands.npxCdsDkWithVersion(versionInfo.preferredDkVersion);
}

/**
 * Determine the `cds` command to use based on the environment and cache directory.
 *
 * This function uses a caching strategy to minimize repeated CLI command testing:
 * - Initializes a global cache on first call
 * - Tests global commands once and caches results
 * - Discovers all available cache directories upfront
 * - Reuses test results across multiple calls
 * - Supports project-specific version-aware command generation
 */
export function determineCdsCommand(
  cacheDir: string | undefined,
  sourceRoot: string,
  projectPath?: string,
  dependencyGraph?: CdsDependencyGraph,
): string {
  try {
    // Always use the efficient path - debug information is collected separately
    return getBestCdsCommand(cacheDir, sourceRoot, projectPath, dependencyGraph);
  } catch (error) {
    const errorMessage = `Failed to determine CDS command: ${String(error)}`;
    cdsExtractorLog('error', errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Discover all available cache directories in the source tree
 * @param sourceRoot The source root directory
 * @returns Array of cache directory paths
 */
function discoverAvailableCacheDirs(sourceRoot: string): string[] {
  if (cdsCommandCache.availableCacheDirs.length > 0) {
    return cdsCommandCache.availableCacheDirs;
  }

  const cacheRootDir = join(sourceRoot, '.cds-extractor-cache');
  const availableDirs: string[] = [];

  try {
    if (existsSync(cacheRootDir)) {
      const entries = readdirSync(cacheRootDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('cds-')) {
          const cacheDir = join(cacheRootDir, entry.name);
          const cdsBin = join(cacheDir, 'node_modules', '.bin', 'cds');
          if (fileExists(cdsBin)) {
            availableDirs.push(cacheDir);
          }
        }
      }
    }
  } catch (error) {
    cdsExtractorLog('debug', `Failed to discover cache directories: ${String(error)}`);
  }

  cdsCommandCache.availableCacheDirs = availableDirs;
  return availableDirs;
}

/**
 * Get the best CDS command for a specific cache directory
 * @param cacheDir Optional specific cache directory
 * @param sourceRoot The source root directory
 * @param projectPath Optional project path for version-aware commands
 * @param dependencyGraph Optional dependency graph for version information
 * @returns The best CDS command to use
 */
function getBestCdsCommand(
  cacheDir: string | undefined,
  sourceRoot: string,
  projectPath?: string,
  dependencyGraph?: CdsDependencyGraph,
): string {
  // Initialize cache if needed
  initializeCdsCommandCache(sourceRoot);

  // If a specific cache directory is provided and valid, prefer it
  if (cacheDir) {
    const localCdsBin = join(cacheDir, 'node_modules', '.bin', 'cds');
    const command = createCdsCommandForPath(localCdsBin);
    if (command) {
      const result = testCdsCommand(command, sourceRoot, true);
      if (result.works) {
        return localCdsBin;
      }
    }
  }

  // Try any available cache directories
  for (const availableCacheDir of cdsCommandCache.availableCacheDirs) {
    const localCdsBin = join(availableCacheDir, 'node_modules', '.bin', 'cds');
    const command = createCdsCommandForPath(localCdsBin);
    if (command) {
      const result = testCdsCommand(command, sourceRoot, true);
      if (result.works) {
        return localCdsBin;
      }
    }
  }

  // Try project-specific version-aware commands if information is available
  if (projectPath && dependencyGraph) {
    const versionAwareCommand = createVersionAwareCdsCommand(projectPath, dependencyGraph);
    if (versionAwareCommand) {
      const result = testCdsCommand(versionAwareCommand, sourceRoot, true);
      if (result.works) {
        return versionAwareCommand.originalCommand;
      }
    }
  }

  // Fall back to global command
  if (cdsCommandCache.globalCommand) {
    return cdsCommandCache.globalCommand;
  }

  // Final fallback: test remaining npx options
  const fallbackCommands = [createCdsCommands.npxCds(), createCdsCommands.npxCdsDk()];

  for (const command of fallbackCommands) {
    const result = testCdsCommand(command, sourceRoot, true);
    if (result.works) {
      return command.originalCommand;
    }
  }

  // Return the default fallback even if it doesn't work, as tests expect this behavior
  return createCdsCommands.npxCdsDk().originalCommand;
}

/**
 * Initialize the CDS command cache by testing global commands
 * @param sourceRoot The source root directory
 */
function initializeCdsCommandCache(sourceRoot: string): void {
  if (cdsCommandCache.initialized) {
    return;
  }

  cdsExtractorLog('info', 'Initializing CDS command cache...');

  // Test global commands first (most commonly used)
  const globalCommands = [createCdsCommands.cds(), createCdsCommands.npxCdsDk()];

  for (const command of globalCommands) {
    const result = testCdsCommand(command, sourceRoot, true); // Silent testing
    if (result.works) {
      cdsCommandCache.globalCommand = command.originalCommand;
      cdsExtractorLog(
        'info',
        `Found working global CDS command: ${command.originalCommand} (v${result.version ?? 'unknown'})`,
      );
      break;
    }
  }

  // Discover available cache directories
  const cacheDirs = discoverAvailableCacheDirs(sourceRoot);
  if (cacheDirs.length > 0) {
    cdsExtractorLog(
      'info',
      `Discovered ${cacheDirs.length} CDS cache director${cacheDirs.length === 1 ? 'y' : 'ies'}`,
    );
  }

  cdsCommandCache.initialized = true;
}

/**
 * Reset the command cache - primarily for testing
 */
export function resetCdsCommandCache(): void {
  cdsCommandCache.commandResults.clear();
  cdsCommandCache.availableCacheDirs = [];
  cdsCommandCache.globalCommand = undefined;
  cdsCommandCache.initialized = false;
}

/**
 * Check if a CDS command is available and working.
 * @param validatedCommand The {@link ValidatedCdsCommand} instance for the command to test
 * @param sourceRoot The source root directory to use as cwd when testing the command
 * @param silent Whether to suppress logging of test failures
 * @returns Object with test result and version information
 */
function testCdsCommand(
  validatedCommand: ValidatedCdsCommand,
  sourceRoot: string,
  silent: boolean = false,
): { works: boolean; version?: string; error?: string } {
  const cacheKey = validatedCommand.originalCommand;

  // Check cache first
  const cachedResult = cdsCommandCache.commandResults.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  try {
    // Run the validated `cds` command with `--version` to test if it works.
    const cleanEnv = {
      ...process.env,
      // Remove any CodeQL-specific environment variables that might interfere.
      CODEQL_EXTRACTOR_CDS_WIP_DATABASE: undefined,
      CODEQL_RUNNER: undefined,
    };

    const result = execFileSync(
      validatedCommand.executable,
      [...validatedCommand.args, '--version'],
      {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: DEFAULT_COMMAND_TIMEOUT_MS, // timeout after 10 seconds
        cwd: sourceRoot,
        env: cleanEnv,
      },
    ).toString();

    // Extract version from output (typically in format "@sap/cds-dk: 6.1.3" or just "6.1.3")
    const versionMatch = result.match(/(\d+\.\d+\.\d+)/);
    const version = versionMatch ? versionMatch[1] : undefined;

    const testResult = { works: true, version };
    cdsCommandCache.commandResults.set(cacheKey, testResult);
    return testResult;
  } catch (error) {
    const errorMessage = String(error);
    if (!silent) {
      cdsExtractorLog('debug', `CDS command test failed for '${cacheKey}': ${errorMessage}`);
    }

    const testResult = { works: false, error: errorMessage };
    cdsCommandCache.commandResults.set(cacheKey, testResult);
    return testResult;
  }
}
