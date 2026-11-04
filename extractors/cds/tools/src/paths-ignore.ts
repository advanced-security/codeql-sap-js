import { existsSync, readFileSync } from 'fs';
import { join, relative, resolve } from 'path';

import { load as yamlLoad } from 'js-yaml';
import { minimatch } from 'minimatch';

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
const patternsCache = new Map<string, string[]>();

/**
 * Shape of the subset of a CodeQL configuration file that we care about.
 */
interface CodeqlConfig {
  'paths-ignore'?: string[];
}

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
 * configuration file. Include patterns use a `!` prefix.
 *
 * @param sourceRoot - The source root directory
 * @returns Array of path filter patterns, or empty array if none
 */
export function getPathsIgnorePatterns(sourceRoot: string): string[] {
  const cached = patternsCache.get(sourceRoot);
  if (cached !== undefined) {
    return cached;
  }

  if (process.env.LGTM_INDEX_FILTERS) {
    const envPatterns = process.env.LGTM_INDEX_FILTERS.split(/\r?\n/).flatMap(line => {
      const filter = /^(include|exclude):\s*(.*?)\s*$/.exec(line);
      return filter?.[2] ? [filter[1] === 'include' ? `!${filter[2]}` : filter[2]] : [];
    });
    // Extension-only opt-ins (e.g. `include:**/*.json`) must not bypass the
    // configuration's paths-ignore; config patterns come last so they win.
    const onlyExtensionOptIns =
      envPatterns.length > 0 &&
      envPatterns.every(p => p.startsWith('!') && /^(?:\*\*\/)?\*\.[^/]+$/.test(p.slice(1)));
    if (!onlyExtensionOptIns) {
      patternsCache.set(sourceRoot, envPatterns);
      return envPatterns;
    }
    const patterns = [...envPatterns, ...readConfigPatterns(sourceRoot)];
    patternsCache.set(sourceRoot, patterns);
    return patterns;
  }

  const patterns = readConfigPatterns(sourceRoot);
  patternsCache.set(sourceRoot, patterns);
  return patterns;
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
 * @param patterns     - Array of paths-ignore glob patterns
 * @param isDirectory - Whether to retain ancestors of included paths
 * @param includedSourcePaths - Sources whose re-inclusion also retains this generated file
 * @returns true if the path should be ignored
 */
export function shouldIgnorePath(
  relativePath: string,
  patterns: string[],
  isDirectory = false,
  includedSourcePaths: readonly string[] = [],
): boolean {
  const matchOptions = { dot: true, windowsPathsNoEscape: true };
  const normalizedPath = relativePath.replace(/\\/g, '/');
  const includePaths = [
    normalizedPath,
    ...includedSourcePaths.map(source => source.replace(/\\/g, '/')),
  ];
  const matches = (raw: string, include = false): boolean => {
    // Strip trailing slashes so `vendor/` is treated the same as `vendor`
    const pattern = raw.replace(/\/+$/, '');
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
    .filter(p => p.startsWith('!'))
    .map(p => p.slice(1))
    .filter(p => !/^(?:\*\*\/)?\*\.[^/]+$/.test(p));
  if (sourceIncludes.length > 0 && !sourceIncludes.some(p => matches(p, true))) {
    return true;
  }

  let ignored = false;
  for (const raw of patterns) {
    const include = raw.startsWith('!');
    if (matches(include ? raw.slice(1) : raw, include)) {
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
