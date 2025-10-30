import { execSync } from 'child_process';

import type { SemanticVersion } from './types';
import { cdsExtractorLog } from '../logging';

/**
 * Cache for storing available versions for npm packages to avoid duplicate
 * `npm view` calls.
 */
const availableVersionsCache = new Map<string, string[]>();

// Define the set of allowed npm packages for which we cache versions.
type CachedPackageName = '@sap/cds' | '@sap/cds-dk';

/**
 * Cache statistics for debugging purposes
 */
const cacheStats = {
  hits: 0,
  misses: 0,
  get hitRate() {
    const total = this.hits + this.misses;
    return total > 0 ? ((this.hits / total) * 100).toFixed(1) : '0.0';
  },
};

/**
 * Check if @sap/cds and @sap/cds-dk versions are likely compatible.
 * @param cdsVersion The @sap/cds version
 * @param cdsDkVersion The @sap/cds-dk version
 * @returns Object with compatibility information and warnings
 */
export function checkVersionCompatibility(
  cdsVersion: string,
  cdsDkVersion: string,
): {
  isCompatible: boolean;
  warning?: string;
} {
  // If either version is 'latest', assume they are compatible
  if (cdsVersion === 'latest' || cdsDkVersion === 'latest') {
    return { isCompatible: true };
  }

  const parsedCds = parseSemanticVersion(cdsVersion);
  const parsedCdsDk = parseSemanticVersion(cdsDkVersion);

  if (!parsedCds || !parsedCdsDk) {
    return {
      isCompatible: false,
      warning: 'Unable to parse version numbers for compatibility check',
    };
  }

  // Generally, @sap/cds and @sap/cds-dk should have the same major version
  // and ideally the same minor version for best compatibility
  const majorVersionsMatch = parsedCds.major === parsedCdsDk.major;
  const minorVersionsMatch = parsedCds.minor === parsedCdsDk.minor;

  if (!majorVersionsMatch) {
    return {
      isCompatible: false,
      warning: `Major version mismatch: @sap/cds ${cdsVersion} and @sap/cds-dk ${cdsDkVersion} may not be compatible`,
    };
  }

  if (!minorVersionsMatch) {
    return {
      isCompatible: true,
      warning: `Minor version difference: @sap/cds ${cdsVersion} and @sap/cds-dk ${cdsDkVersion} - consider aligning versions for best compatibility`,
    };
  }

  return { isCompatible: true };
}

/**
 * Compare two semantic versions
 * @param a First version
 * @param b Second version
 * @returns Negative if a < b, 0 if equal, positive if a > b
 */
export function compareVersions(a: SemanticVersion, b: SemanticVersion): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;

  // Handle prerelease versions (prerelease < release)
  if (a.prerelease && !b.prerelease) return -1;
  if (!a.prerelease && b.prerelease) return 1;
  if (a.prerelease && b.prerelease) {
    return a.prerelease.localeCompare(b.prerelease);
  }

  return 0;
}

/**
 * Find the best available version from a list of versions for a given requirement
 * @param availableVersions List of available version strings
 * @param requiredVersion Required version string
 * @returns Best matching version or null if no compatible version found
 */
export function findBestAvailableVersion(
  availableVersions: string[],
  requiredVersion: string,
): string | null {
  const parsedVersions = availableVersions
    .map(v => parseSemanticVersion(v))
    .filter((v): v is SemanticVersion => v !== null);

  if (parsedVersions.length === 0) {
    return null;
  }

  // First, try to find versions that satisfy the range
  const satisfyingVersions = parsedVersions.filter(v => satisfiesRange(v, requiredVersion));

  if (satisfyingVersions.length > 0) {
    // Sort in descending order (newest first) and return the best match
    satisfyingVersions.sort((a, b) => compareVersions(b, a));
    return satisfyingVersions[0].original;
  }

  // If no exact match, prefer newer versions over older ones
  // Sort all versions in descending order and return the newest
  parsedVersions.sort((a, b) => compareVersions(b, a));
  return parsedVersions[0].original;
}

/**
 * Get available versions for an npm package with caching to avoid duplicate
 * calls of the `npm view` command.
 * @param packageName The {@link CachedPackageName} for which to get versions
 * @returns Array of available version strings
 */
export function getAvailableVersions(packageName: CachedPackageName): string[] {
  // Check cache first
  if (availableVersionsCache.has(packageName)) {
    cacheStats.hits++;
    return availableVersionsCache.get(packageName)!;
  }

  // Cache miss - fetch from npm
  cacheStats.misses++;
  try {
    const output = execSync(`npm view ${packageName} versions --json`, {
      encoding: 'utf8',
      timeout: 30000, // 30 second timeout
    });

    const versions: unknown = JSON.parse(output);
    let versionArray: string[] = [];

    if (Array.isArray(versions)) {
      versionArray = versions.filter((v): v is string => typeof v === 'string');
    } else if (typeof versions === 'string') {
      versionArray = [versions];
    }

    // Cache the result
    availableVersionsCache.set(packageName, versionArray);

    return versionArray;
  } catch (error) {
    cdsExtractorLog('warn', `Failed to fetch versions for ${packageName}: ${String(error)}`);
    // Cache empty array to avoid repeated failures
    availableVersionsCache.set(packageName, []);
    return [];
  }
}

/**
 * Get cache statistics for debugging purposes
 * @returns Object with cache hit/miss statistics
 */
export function getCacheStatistics(): {
  hits: number;
  misses: number;
  hitRate: string;
  cachedPackages: string[];
} {
  return {
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    hitRate: cacheStats.hitRate,
    cachedPackages: Array.from(availableVersionsCache.keys()),
  };
}

/**
 * Parse a semantic version string
 * @param version Version string to parse (e.g., "6.1.3", "^6.0.0", "~6.1.0", "latest")
 * @returns Parsed semantic version or null if invalid
 */
export function parseSemanticVersion(version: string): SemanticVersion | null {
  if (version === 'latest') {
    // Return a very high version number for 'latest' to ensure it's preferred
    return {
      major: 999,
      minor: 999,
      patch: 999,
      original: version,
    };
  }

  // Remove common version prefixes
  const cleanVersion = version.replace(/^[\^~>=<]+/, '');

  // Basic semver regex
  const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/;
  const match = cleanVersion.match(semverRegex);

  if (!match) {
    return null;
  }

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4],
    build: match[5],
    original: version,
  };
}

/**
 * Check if a resolved version satisfies the originally requested version.
 * @param resolvedVersion The version that was resolved
 * @param requestedVersion The originally requested version
 * @returns true if the resolved version satisfies the requested version range
 */
function isSatisfyingVersion(resolvedVersion: string, requestedVersion: string): boolean {
  // Exact string match or 'latest' case
  if (resolvedVersion === requestedVersion || requestedVersion === 'latest') {
    return true;
  }

  const parsedResolved = parseSemanticVersion(resolvedVersion);
  if (!parsedResolved) {
    return false;
  }

  return satisfiesRange(parsedResolved, requestedVersion);
}

/**
 * Resolve the best available version for CDS dependencies
 * @param cdsVersion Required @sap/cds version
 * @param cdsDkVersion Required @sap/cds-dk version
 * @returns Object with resolved versions and compatibility info
 */
export function resolveCdsVersions(
  cdsVersion: string,
  cdsDkVersion: string,
): {
  resolvedCdsVersion: string | null;
  resolvedCdsDkVersion: string | null;
  cdsExactMatch: boolean;
  cdsDkExactMatch: boolean;
  warning?: string;
  isFallback?: boolean;
} {
  const cdsVersions = getAvailableVersions('@sap/cds');
  const cdsDkVersions = getAvailableVersions('@sap/cds-dk');

  const resolvedCdsVersion = findBestAvailableVersion(cdsVersions, cdsVersion);
  const resolvedCdsDkVersion = findBestAvailableVersion(cdsDkVersions, cdsDkVersion);

  // Check if resolved versions are exact matches (string equality or 'latest' case).
  const cdsExactMatch =
    resolvedCdsVersion === cdsVersion || (cdsVersion === 'latest' && resolvedCdsVersion !== null);
  const cdsDkExactMatch =
    resolvedCdsDkVersion === cdsDkVersion ||
    (cdsDkVersion === 'latest' && resolvedCdsDkVersion !== null);

  // Check if resolved versions satisfy the requested ranges (including exact matches).
  const cdsSatisfiesRange = resolvedCdsVersion
    ? isSatisfyingVersion(resolvedCdsVersion, cdsVersion)
    : false;
  const cdsDkSatisfiesRange = resolvedCdsDkVersion
    ? isSatisfyingVersion(resolvedCdsDkVersion, cdsDkVersion)
    : false;

  // Only consider it a fallback if we couldn't find a satisfying version.
  const isFallback = !cdsSatisfiesRange || !cdsDkSatisfiesRange;

  let warning: string | undefined;

  // Check compatibility between resolved versions (only if both were resolved).
  // Show warnings when:
  // 1. We're using fallback versions (couldn't find compatible versions), OR
  // 2. At least one version isn't an exact match (version range was used), OR
  // 3. Resolved versions have actual compatibility issues (e.g., major version mismatch).
  if (resolvedCdsVersion && resolvedCdsDkVersion) {
    const compatibility = checkVersionCompatibility(resolvedCdsVersion, resolvedCdsDkVersion);

    const shouldShowWarning =
      isFallback ||
      !cdsExactMatch ||
      !cdsDkExactMatch ||
      (compatibility.warning && !compatibility.isCompatible);

    if (compatibility.warning && shouldShowWarning) {
      warning = compatibility.warning;
    }
  }

  return {
    resolvedCdsVersion,
    resolvedCdsDkVersion,
    cdsExactMatch,
    cdsDkExactMatch,
    warning,
    isFallback,
  };
}

/**
 * Check if version satisfies a version range.
 * @param version Version to check
 * @param range Version range (e.g., "^6.0.0", "~6.1.0", ">=6.0.0")
 * @returns true if version satisfies the range
 */
export function satisfiesRange(version: SemanticVersion, range: string): boolean {
  if (range === 'latest') {
    return true;
  }

  const rangeVersion = parseSemanticVersion(range);
  if (!rangeVersion) {
    return false;
  }

  if (range.startsWith('^')) {
    // Caret range: compatible within same major version
    return version.major === rangeVersion.major && compareVersions(version, rangeVersion) >= 0;
  } else if (range.startsWith('~')) {
    // Tilde range: compatible within same minor version
    return (
      version.major === rangeVersion.major &&
      version.minor === rangeVersion.minor &&
      compareVersions(version, rangeVersion) >= 0
    );
  } else if (range.startsWith('>=')) {
    // Greater than or equal
    return compareVersions(version, rangeVersion) >= 0;
  } else if (range.startsWith('>')) {
    // Greater than
    return compareVersions(version, rangeVersion) > 0;
  } else if (range.startsWith('<=')) {
    // Less than or equal
    return compareVersions(version, rangeVersion) <= 0;
  } else if (range.startsWith('<')) {
    // Less than
    return compareVersions(version, rangeVersion) < 0;
  } else {
    // Exact match
    return compareVersions(version, rangeVersion) === 0;
  }
}

/**
 * Test-only exports - DO NOT USE IN PRODUCTION CODE
 * These are exported only for testing purposes
 */
export const __testOnly__ = {
  availableVersionsCache,
  cacheStats,
};
