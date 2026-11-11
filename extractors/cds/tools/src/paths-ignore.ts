import { existsSync, readFileSync } from 'fs';
import { join, relative, resolve, sep } from 'path';

import { load as yamlLoad } from 'js-yaml';
import { minimatch, type MinimatchOptions } from 'minimatch';

import { cdsExtractorLog } from './logging';

/**
 * Well-known paths where a CodeQL configuration file may be located,
 * relative to the source root directory. Checked in order of priority.
 */
const DEFAULT_CONFIG_RELATIVE_PATHS = [
  '.github/codeql/codeql-config.yml',
  '.github/codeql/codeql-config.yaml',
];

/**
 * Cache for parsed paths-ignore patterns, keyed by source root.
 * Avoids re-reading and re-parsing the config file on every call.
 */
const patternsCache = new Map<string, PathFilter[]>();

/**
 * Shape of the subset of a CodeQL configuration file that we care about.
 */
interface CodeqlConfig {
  'paths-ignore'?: string[];
}

/** An exclusion glob, or an explicitly tagged inclusion glob. */
export type PathFilter = string | { include: string };

/**
 * Finds the CodeQL configuration file in the source root directory.
 *
 * When the `CODEQL_CONFIG_PATH` environment variable is set, its value
 * is treated as a path (relative to `sourceRoot`) to the config file.
 * The resolved path must reside under `sourceRoot`; otherwise it is
 * rejected to prevent path-traversal issues.
 *
 * When the environment variable is not set, the well-known default
 * paths are checked in order.
 *
 * @param sourceRoot - The source root directory
 * @returns The absolute path to the config file, or undefined if not found
 */
export function findCodeqlConfigFile(sourceRoot: string): string | undefined {
  const envConfigPath = process.env.CODEQL_CONFIG_PATH;
  if (envConfigPath) {
    const resolvedRoot = resolve(sourceRoot);
    const fullPath = resolve(resolvedRoot, envConfigPath);
    const rel = relative(resolvedRoot, fullPath);
    if (rel.startsWith('..') || resolve(resolvedRoot, rel) !== fullPath) {
      cdsExtractorLog(
        'warn',
        `CODEQL_CONFIG_PATH '${envConfigPath}' resolves outside the source root. Ignoring.`,
      );
      return undefined;
    }
    if (existsSync(fullPath)) {
      cdsExtractorLog('info', `Using CodeQL config file from CODEQL_CONFIG_PATH: ${fullPath}`);
      return fullPath;
    }
    cdsExtractorLog(
      'warn',
      `CODEQL_CONFIG_PATH is set to '${envConfigPath}', but no file exists at '${fullPath}'.`,
    );
    return undefined;
  }

  for (const configPath of DEFAULT_CONFIG_RELATIVE_PATHS) {
    const fullPath = join(sourceRoot, configPath);
    if (existsSync(fullPath)) {
      return fullPath;
    }
  }
  return undefined;
}

/**
 * Reads ordered CLI include/exclude filters, or `paths-ignore` from the CodeQL
 * configuration file. Inclusions are tagged separately from literal path characters.
 *
 * @param sourceRoot - The source root directory
 * @returns Array of path filter patterns, or empty array if none
 */
export function getPathsIgnorePatterns(sourceRoot: string): PathFilter[] {
  const cached = patternsCache.get(sourceRoot);
  if (cached !== undefined) {
    return cached;
  }

  const filters = process.env.LGTM_INDEX_FILTERS;
  const patterns = filters
    ? filters.split(/\r?\n/).flatMap<PathFilter>(line => {
        const filter = /^(include|exclude):\s*(.*?)\s*$/.exec(line);
        return filter?.[2] ? [filter[1] === 'include' ? { include: filter[2] } : filter[2]] : [];
      })
    : readConfigPatterns(sourceRoot);
  // Append config exclusions after extension-only opt-ins so exclusions still win.
  if (
    filters &&
    patterns.length > 0 &&
    patterns.every(p => typeof p !== 'string' && !isSourcePathInclude(p))
  ) {
    patterns.push(...readConfigPatterns(sourceRoot));
  }
  patternsCache.set(sourceRoot, patterns);
  return patterns;
}

/** Distinguishes source-path selections from extension-only opt-ins. */
export function isSourcePathInclude(pattern: PathFilter): boolean {
  return (
    typeof pattern !== 'string' &&
    !/^(?:\*\*\/)?\*\.[^/]+$/.test(normalizePathSeparators(pattern.include))
  );
}

/** Converts native separators without rewriting literal Unix backslashes. */
export function normalizePathSeparators(filePath: string): string {
  return filePath.split(sep).join('/');
}

function readConfigPatterns(sourceRoot: string): string[] {
  const configPath = findCodeqlConfigFile(sourceRoot);
  if (!configPath) {
    return [];
  }

  try {
    const content = readFileSync(configPath, 'utf8');
    const config = yamlLoad(content) as CodeqlConfig | null;

    if (!config || !Array.isArray(config['paths-ignore'])) {
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

    return patterns;
  } catch (error) {
    cdsExtractorLog('warn', `Failed to read CodeQL config file at ${configPath}: ${String(error)}`);
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
 * Source-path includes restrict the search scope; extension-only opt-ins do
 * not. Within that scope, the last matching directive wins.
 * Directories may partially match includes so their descendants can be checked.
 *
 * @param relativePath - File path relative to the source root
 * @param patterns     - Ordered exclusion globs and tagged inclusion globs
 * @param isDirectory - Whether to retain ancestors of included paths
 * @param includedSourcePaths - Sources whose re-inclusion also retains this generated file
 * @returns true if the path should be ignored
 */
export function shouldIgnorePath(
  relativePath: string,
  patterns: readonly PathFilter[],
  isDirectory = false,
  includedSourcePaths: readonly string[] = [],
): boolean {
  const matchOptions: MinimatchOptions = {
    dot: true,
    nocomment: true,
    nonegate: true,
    platform: sep === '\\' ? 'win32' : 'linux',
    windowsPathsNoEscape: sep === '\\',
  };
  const normalizedPath = normalizePathSeparators(relativePath);
  const includePaths = [normalizedPath, ...includedSourcePaths.map(normalizePathSeparators)];
  const matches = (raw: string, include = false): boolean => {
    // Escape literal Unix backslashes before minimatch parses the glob.
    const pattern = normalizePathSeparators(raw).replace(/\\/g, '\\\\').replace(/\/+$/, '');
    return (
      (include && isDirectory && normalizedPath === '.') ||
      (include ? includePaths : [normalizedPath]).some(
        candidate =>
          minimatch(candidate, pattern, { ...matchOptions, partial: include && isDirectory }) ||
          minimatch(candidate, `${pattern}/**`, matchOptions),
      )
    );
  };

  const sourceIncludes = patterns
    .filter(p => typeof p !== 'string')
    .filter(isSourcePathInclude)
    .map(p => p.include);
  if (sourceIncludes.length > 0 && !sourceIncludes.some(p => matches(p, true))) {
    return true;
  }

  let ignored = false;
  for (const raw of patterns) {
    const include = typeof raw !== 'string';
    if (matches(include ? raw.include : raw, include)) {
      ignored = !include;
    }
  }
  return ignored;
}

/**
 * Filters a list of relative file paths, removing any that match the
 * given paths-ignore patterns.
 *
 * @param relativePaths - File paths relative to the source root
 * @param patterns      - Ordered exclusion globs and tagged inclusion globs
 * @returns Filtered list of paths that do NOT match any ignore pattern
 */
export function filterIgnoredPaths(
  relativePaths: string[],
  patterns: readonly PathFilter[],
): string[] {
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
