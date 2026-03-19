import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { load as yamlLoad } from 'js-yaml';
import { minimatch } from 'minimatch';

import { cdsExtractorLog } from './logging';

/**
 * Well-known paths where a CodeQL configuration file may be located,
 * relative to the source root directory. Checked in order of priority.
 */
const CODEQL_CONFIG_PATHS = [
  '.github/codeql/codeql-config.yml',
  '.github/codeql/codeql-config.yaml',
];

/**
 * Cache for parsed paths-ignore patterns, keyed by source root.
 * Avoids re-reading and re-parsing the config file on every call.
 */
const patternsCache = new Map<string, string[]>();

/**
 * Shape of the subset of a CodeQL configuration file that we care about.
 */
interface CodeqlConfig {
  'paths-ignore'?: string[];
}

/**
 * Finds the CodeQL configuration file in the source root directory by
 * checking the well-known paths in order.
 *
 * @param sourceRoot - The source root directory
 * @returns The absolute path to the config file, or undefined if not found
 */
export function findCodeqlConfigFile(sourceRoot: string): string | undefined {
  for (const configPath of CODEQL_CONFIG_PATHS) {
    const fullPath = join(sourceRoot, configPath);
    if (existsSync(fullPath)) {
      return fullPath;
    }
  }
  return undefined;
}

/**
 * Reads the CodeQL configuration file and extracts the `paths-ignore`
 * patterns list.
 *
 * @param sourceRoot - The source root directory
 * @returns Array of paths-ignore glob patterns, or empty array if none
 */
export function getPathsIgnorePatterns(sourceRoot: string): string[] {
  const cached = patternsCache.get(sourceRoot);
  if (cached !== undefined) {
    return cached;
  }

  const configPath = findCodeqlConfigFile(sourceRoot);
  if (!configPath) {
    patternsCache.set(sourceRoot, []);
    return [];
  }

  try {
    const content = readFileSync(configPath, 'utf8');
    const config = yamlLoad(content) as CodeqlConfig | null;

    if (!config || !Array.isArray(config['paths-ignore'])) {
      patternsCache.set(sourceRoot, []);
      return [];
    }

    const patterns = config['paths-ignore'].filter(
      (p): p is string => typeof p === 'string' && p.length > 0,
    );

    if (patterns.length > 0) {
      cdsExtractorLog(
        'info',
        `Found ${patterns.length} paths-ignore pattern(s) in ${configPath}: ${patterns.join(', ')}`,
      );
    }

    patternsCache.set(sourceRoot, patterns);
    return patterns;
  } catch (error) {
    cdsExtractorLog('warn', `Failed to read CodeQL config file at ${configPath}: ${String(error)}`);
    patternsCache.set(sourceRoot, []);
    return [];
  }
}

/**
 * Tests whether a single relative file path matches any of the given
 * paths-ignore patterns.
 *
 * Pattern matching follows the CodeQL `paths-ignore` semantics:
 *  - A bare directory name `vendor` matches anything under `vendor/`
 *  - `**` matches across directory boundaries
 *  - `*` matches within a single path segment
 *
 * @param relativePath - File path relative to the source root
 * @param patterns     - Array of paths-ignore glob patterns
 * @returns true if the path should be ignored
 */
export function shouldIgnorePath(relativePath: string, patterns: string[]): boolean {
  const matchOptions = { dot: true, windowsPathsNoEscape: true };

  for (const raw of patterns) {
    // Strip trailing slashes so `vendor/` is treated the same as `vendor`
    const pattern = raw.replace(/\/+$/, '');

    // Direct minimatch check
    if (minimatch(relativePath, pattern, matchOptions)) {
      return true;
    }

    // Also match as a directory prefix: pattern `vendor` should
    // match `vendor/lib/foo.cds` (i.e. anything nested underneath).
    if (minimatch(relativePath, `${pattern}/**`, matchOptions)) {
      return true;
    }
  }
  return false;
}

/**
 * Filters a list of relative file paths, removing any that match the
 * given paths-ignore patterns.
 *
 * @param relativePaths - File paths relative to the source root
 * @param patterns      - Array of paths-ignore glob patterns
 * @returns Filtered list of paths that do NOT match any ignore pattern
 */
export function filterIgnoredPaths(relativePaths: string[], patterns: string[]): string[] {
  if (patterns.length === 0) {
    return relativePaths;
  }
  return relativePaths.filter(p => !shouldIgnorePath(p, patterns));
}

/**
 * Clears the internal patterns cache. Intended for testing only.
 */
export function clearPathsIgnoreCache(): void {
  patternsCache.clear();
}
