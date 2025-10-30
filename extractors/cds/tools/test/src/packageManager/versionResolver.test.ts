import { cdsExtractorLog } from '../../../src/logging';
import {
  parseSemanticVersion,
  compareVersions,
  satisfiesRange,
  findBestAvailableVersion,
  resolveCdsVersions,
  checkVersionCompatibility,
  getAvailableVersions,
  getCacheStatistics,
  __testOnly__,
} from '../../../src/packageManager/versionResolver';

// Mock the execSync function and logging
jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

jest.mock('../../../src/logging', () => ({
  cdsExtractorLog: jest.fn(),
}));

/**
 * Clear the version cache (test-only function)
 */
function clearVersionCache(): void {
  __testOnly__.availableVersionsCache.clear();
  __testOnly__.cacheStats.hits = 0;
  __testOnly__.cacheStats.misses = 0;
  cdsExtractorLog('info', 'Cleared package version cache and reset statistics');
}

describe('versionResolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the cache before each test to ensure clean state
    clearVersionCache();
  });

  describe('parseSemanticVersion', () => {
    it('should parse standard semantic versions', () => {
      const version = parseSemanticVersion('6.1.3');
      expect(version).toEqual({
        major: 6,
        minor: 1,
        patch: 3,
        original: '6.1.3',
      });
    });

    it('should parse versions with prerelease', () => {
      const version = parseSemanticVersion('6.1.3-beta.1');
      expect(version).toEqual({
        major: 6,
        minor: 1,
        patch: 3,
        prerelease: 'beta.1',
        original: '6.1.3-beta.1',
      });
    });

    it('should parse versions with build metadata', () => {
      const version = parseSemanticVersion('6.1.3+build.123');
      expect(version).toEqual({
        major: 6,
        minor: 1,
        patch: 3,
        build: 'build.123',
        original: '6.1.3+build.123',
      });
    });

    it('should handle version ranges by removing prefixes', () => {
      const version = parseSemanticVersion('^6.1.3');
      expect(version).toEqual({
        major: 6,
        minor: 1,
        patch: 3,
        original: '^6.1.3',
      });
    });

    it('should handle latest version', () => {
      const version = parseSemanticVersion('latest');
      expect(version).toEqual({
        major: 999,
        minor: 999,
        patch: 999,
        original: 'latest',
      });
    });

    it('should return null for invalid versions', () => {
      expect(parseSemanticVersion('invalid')).toBeNull();
      expect(parseSemanticVersion('')).toBeNull();
      expect(parseSemanticVersion('1.2')).toBeNull();
    });
  });

  describe('compareVersions', () => {
    it('should compare major versions correctly', () => {
      const v1 = parseSemanticVersion('6.0.0')!;
      const v2 = parseSemanticVersion('7.0.0')!;
      expect(compareVersions(v1, v2)).toBeLessThan(0);
      expect(compareVersions(v2, v1)).toBeGreaterThan(0);
    });

    it('should compare minor versions correctly', () => {
      const v1 = parseSemanticVersion('6.1.0')!;
      const v2 = parseSemanticVersion('6.2.0')!;
      expect(compareVersions(v1, v2)).toBeLessThan(0);
      expect(compareVersions(v2, v1)).toBeGreaterThan(0);
    });

    it('should compare patch versions correctly', () => {
      const v1 = parseSemanticVersion('6.1.1')!;
      const v2 = parseSemanticVersion('6.1.2')!;
      expect(compareVersions(v1, v2)).toBeLessThan(0);
      expect(compareVersions(v2, v1)).toBeGreaterThan(0);
    });

    it('should handle equal versions', () => {
      const v1 = parseSemanticVersion('6.1.3')!;
      const v2 = parseSemanticVersion('6.1.3')!;
      expect(compareVersions(v1, v2)).toBe(0);
    });

    it('should handle prerelease versions correctly', () => {
      const release = parseSemanticVersion('6.1.3')!;
      const prerelease = parseSemanticVersion('6.1.3-beta.1')!;
      expect(compareVersions(prerelease, release)).toBeLessThan(0);
      expect(compareVersions(release, prerelease)).toBeGreaterThan(0);
    });

    it('should handle prerelease version comparisons', () => {
      const version1 = parseSemanticVersion('1.0.0-alpha');
      const version2 = parseSemanticVersion('1.0.0-beta');

      expect(version1).not.toBeNull();
      expect(version2).not.toBeNull();

      const result = compareVersions(version1!, version2!);
      expect(result).toBeLessThan(0); // alpha < beta
    });
  });

  describe('satisfiesRange', () => {
    const version613 = parseSemanticVersion('6.1.3')!;
    const version620 = parseSemanticVersion('6.2.0')!;
    const version700 = parseSemanticVersion('7.0.0')!;

    it('should handle caret ranges correctly', () => {
      expect(satisfiesRange(version613, '^6.0.0')).toBe(true);
      expect(satisfiesRange(version620, '^6.0.0')).toBe(true);
      expect(satisfiesRange(version700, '^6.0.0')).toBe(false);
    });

    it('should handle tilde ranges correctly', () => {
      expect(satisfiesRange(version613, '~6.1.0')).toBe(true);
      expect(satisfiesRange(version620, '~6.1.0')).toBe(false);
    });

    it('should handle exact versions correctly', () => {
      expect(satisfiesRange(version613, '6.1.3')).toBe(true);
      expect(satisfiesRange(version620, '6.1.3')).toBe(false);
    });

    it('should handle greater than or equal ranges', () => {
      expect(satisfiesRange(version613, '>=6.1.0')).toBe(true);
      expect(satisfiesRange(version613, '>=6.2.0')).toBe(false);
    });

    it('should handle latest range', () => {
      expect(satisfiesRange(version613, 'latest')).toBe(true);
      expect(satisfiesRange(version700, 'latest')).toBe(true);
    });
  });

  describe('findBestAvailableVersion', () => {
    const availableVersions = ['6.0.0', '6.1.0', '6.1.3', '6.2.0', '7.0.0'];

    it('should find exact matches', () => {
      const result = findBestAvailableVersion(availableVersions, '6.1.3');
      expect(result).toBe('6.1.3');
    });

    it('should find best compatible version for caret ranges', () => {
      const result = findBestAvailableVersion(availableVersions, '^6.1.0');
      expect(result).toBe('6.2.0'); // Latest within major version 6
    });

    it('should find best compatible version for tilde ranges', () => {
      const result = findBestAvailableVersion(availableVersions, '~6.1.0');
      expect(result).toBe('6.1.3'); // Latest within minor version 6.1
    });

    it('should fallback to newest version when no compatible version found', () => {
      const result = findBestAvailableVersion(availableVersions, '^8.0.0');
      expect(result).toBe('7.0.0'); // Newest available version
    });

    it('should handle empty available versions', () => {
      const result = findBestAvailableVersion([], '6.1.3');
      expect(result).toBeNull();
    });

    it('should handle latest requirement', () => {
      const result = findBestAvailableVersion(availableVersions, 'latest');
      expect(result).toBe('7.0.0'); // Newest available
    });
  });

  describe('resolveCdsVersions', () => {
    beforeEach(() => {
      // Mock successful npm responses
      const mockExecSync = jest.requireMock('child_process').execSync;
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('@sap/cds versions')) {
          return JSON.stringify(['6.0.0', '6.1.0', '6.1.3', '6.2.0', '7.0.0']);
        }
        if (command.includes('@sap/cds-dk versions')) {
          return JSON.stringify(['5.0.0', '5.1.0', '6.0.0', '6.1.0']);
        }
        throw new Error('Unknown command');
      });
    });

    it('should resolve exact matches successfully', () => {
      const result = resolveCdsVersions('6.1.3', '6.0.0');

      expect(result.resolvedCdsVersion).toBe('6.1.3');
      expect(result.resolvedCdsDkVersion).toBe('6.0.0');
      expect(result.cdsExactMatch).toBe(true);
      expect(result.cdsDkExactMatch).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it('should resolve compatible versions with warnings', () => {
      const result = resolveCdsVersions('^6.1.0', '^6.0.0');

      expect(result.resolvedCdsVersion).toBe('6.2.0'); // Latest compatible
      expect(result.resolvedCdsDkVersion).toBe('6.1.0'); // Latest compatible
      expect(result.cdsExactMatch).toBe(false);
      expect(result.cdsDkExactMatch).toBe(false);
      // Should have a compatibility warning due to minor version difference
      expect(result.warning).toContain('Minor version difference');
    });

    it('should handle unavailable versions gracefully', () => {
      const result = resolveCdsVersions('8.0.0', '8.0.0');

      expect(result.resolvedCdsVersion).toBe('7.0.0'); // Fallback to newest
      expect(result.resolvedCdsDkVersion).toBe('6.1.0'); // Fallback to newest
      expect(result.cdsExactMatch).toBe(false);
      expect(result.cdsDkExactMatch).toBe(false);
      // Should have a compatibility warning due to major version mismatch
      expect(result.warning).toContain('Major version mismatch');
    });

    it('should handle latest versions correctly', () => {
      const result = resolveCdsVersions('latest', 'latest');

      expect(result.resolvedCdsVersion).toBe('7.0.0');
      expect(result.resolvedCdsDkVersion).toBe('6.1.0');
      expect(result.cdsExactMatch).toBe(true);
      expect(result.cdsDkExactMatch).toBe(true);
      // Should still have a warning about version mismatch between resolved versions
      expect(result.warning).toContain('Major version mismatch');
    });

    it('should handle npm command failures', () => {
      const mockExecSync = jest.requireMock('child_process').execSync;
      mockExecSync.mockImplementation(() => {
        throw new Error('npm command failed');
      });

      const result = resolveCdsVersions('6.1.3', '6.0.0');

      expect(result.resolvedCdsVersion).toBeNull();
      expect(result.resolvedCdsDkVersion).toBeNull();
      expect(result.cdsExactMatch).toBe(false);
      expect(result.cdsDkExactMatch).toBe(false);
      // No warning should be present when resolution fails completely
      expect(result.warning).toBeUndefined();
    });

    it('should handle single version string from npm view', () => {
      const mockExecSync = jest.requireMock('child_process').execSync;
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('@sap/cds versions')) {
          return JSON.stringify('6.1.3'); // Single version as string
        }
        throw new Error('Unknown command');
      });

      const result = resolveCdsVersions('6.1.3', '6.1.3');
      expect(result.resolvedCdsVersion).toBe('6.1.3');
    });

    it('should handle empty versions array from npm', () => {
      const mockExecSync = jest.requireMock('child_process').execSync;
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('@sap/cds versions')) {
          return JSON.stringify([]); // Empty array
        }
        if (command.includes('@sap/cds-dk versions')) {
          return JSON.stringify([]);
        }
        throw new Error('Unknown command');
      });

      const result = resolveCdsVersions('6.1.3', '6.0.0');
      expect(result.resolvedCdsVersion).toBeNull();
      expect(result.resolvedCdsDkVersion).toBeNull();
    });

    it('should handle timeout and malformed JSON from npm', () => {
      const mockExecSync = jest.requireMock('child_process').execSync;
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('@sap/cds versions')) {
          return 'invalid json';
        }
        throw new Error('Unknown command');
      });

      const result = resolveCdsVersions('6.1.3', '6.0.0');
      expect(result.resolvedCdsVersion).toBeNull();
    });
  });

  describe('checkVersionCompatibility', () => {
    it('should handle cases where versions cannot be parsed', () => {
      const result = checkVersionCompatibility('invalid-version', '6.0.0');
      expect(result.isCompatible).toBe(false);
      expect(result.warning).toContain('Unable to parse version numbers');
    });

    it('should handle major version mismatches', () => {
      const result = checkVersionCompatibility('5.1.0', '6.0.0');
      expect(result.isCompatible).toBe(false);
      expect(result.warning).toContain('Major version mismatch');
    });

    it('should handle minor version differences with warning', () => {
      const result = checkVersionCompatibility('6.1.0', '6.2.0');
      expect(result.isCompatible).toBe(true);
      expect(result.warning).toContain('Minor version difference');
    });

    it('should handle compatible versions without warnings', () => {
      const result = checkVersionCompatibility('6.1.3', '6.1.3');
      expect(result.isCompatible).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it('should handle latest versions', () => {
      const result = checkVersionCompatibility('latest', '6.0.0');
      expect(result.isCompatible).toBe(true);
      expect(result.warning).toBeUndefined();
    });
  });

  describe('getAvailableVersions', () => {
    beforeEach(() => {
      // Clear cache before each test
      clearVersionCache();
    });

    it('should handle npm timeout errors', () => {
      const mockExecSync = jest.requireMock('child_process').execSync;
      mockExecSync.mockImplementation(() => {
        throw new Error('Command timeout');
      });

      const result = getAvailableVersions('@sap/cds');
      expect(result).toEqual([]);
    });

    it('should handle single version string response', () => {
      const mockExecSync = jest.requireMock('child_process').execSync;
      mockExecSync.mockImplementation(() => {
        return JSON.stringify('6.1.3'); // Single version
      });

      const result = getAvailableVersions('@sap/cds');
      expect(result).toEqual(['6.1.3']);
    });

    it('should filter out non-string versions', () => {
      const mockExecSync = jest.requireMock('child_process').execSync;
      mockExecSync.mockImplementation(() => {
        return JSON.stringify(['6.1.3', 123, null, '6.2.0']); // Mixed types
      });

      const result = getAvailableVersions('@sap/cds');
      expect(result).toEqual(['6.1.3', '6.2.0']);
    });

    it('should use cached results on subsequent calls', () => {
      const mockExecSync = jest.requireMock('child_process').execSync;
      mockExecSync.mockImplementation(() => {
        return JSON.stringify(['6.1.3', '6.2.0']);
      });

      // First call should fetch from npm
      const result1 = getAvailableVersions('@sap/cds');
      expect(result1).toEqual(['6.1.3', '6.2.0']);

      // Reset mock to ensure cache is used
      mockExecSync.mockReset();

      // Second call should use cache
      const result2 = getAvailableVersions('@sap/cds');
      expect(result2).toEqual(['6.1.3', '6.2.0']);

      // Mock should not have been called again
      expect(mockExecSync).not.toHaveBeenCalled();
    });
  });

  describe('satisfiesRange - additional edge cases', () => {
    it('should handle greater than ranges', () => {
      const version = parseSemanticVersion('6.2.0')!;
      expect(satisfiesRange(version, '>6.1.0')).toBe(true);
      expect(satisfiesRange(version, '>6.2.0')).toBe(false);
    });

    it('should handle less than or equal ranges', () => {
      const version = parseSemanticVersion('6.1.0')!;
      expect(satisfiesRange(version, '<=6.1.0')).toBe(true);
      expect(satisfiesRange(version, '<=6.0.0')).toBe(false);
    });

    it('should handle less than ranges', () => {
      const version = parseSemanticVersion('6.1.0')!;
      expect(satisfiesRange(version, '<6.2.0')).toBe(true);
      expect(satisfiesRange(version, '<6.1.0')).toBe(false);
    });

    it('should handle invalid range patterns', () => {
      const version = parseSemanticVersion('6.1.0')!;
      expect(satisfiesRange(version, 'invalid-range')).toBe(false);
    });
  });

  describe('findBestAvailableVersion - edge cases', () => {
    it('should handle versions with different patterns', () => {
      const availableVersions = ['6.0.0', '6.1.0-beta.1', '6.1.0', '6.2.0-alpha.1'];

      // Should get the latest compatible version within range
      const result = findBestAvailableVersion(availableVersions, '^6.1.0');
      // The function returns the newest compatible version, which could be a prerelease
      expect(result).toBeDefined();
      expect(['6.1.0', '6.2.0-alpha.1'].includes(result!)).toBe(true);
    });

    it('should handle complex version ranges', () => {
      const availableVersions = ['5.0.0', '6.0.0', '6.1.0', '7.0.0'];

      // Should find best match within range
      const result = findBestAvailableVersion(availableVersions, '~6.0.0');
      expect(result).toBe('6.0.0');
    });
  });

  describe('cache statistics and management', () => {
    beforeEach(() => {
      clearVersionCache();
    });

    it('should track cache statistics correctly', () => {
      const mockExecSync = jest.requireMock('child_process').execSync;
      mockExecSync.mockImplementation(() => {
        return JSON.stringify(['6.1.3', '6.2.0']);
      });

      // Initial stats should be zero
      let stats = getCacheStatistics();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);

      // First call creates cache miss
      getAvailableVersions('@sap/cds');
      stats = getCacheStatistics();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(1);

      // Second call creates cache hit
      getAvailableVersions('@sap/cds');
      stats = getCacheStatistics();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe('50.0');
      expect(stats.cachedPackages).toEqual(['@sap/cds']);
    });

    it('should clear cache correctly', () => {
      const mockExecSync = jest.requireMock('child_process').execSync;
      mockExecSync.mockImplementation(() => {
        return JSON.stringify(['6.1.3']);
      });

      // Add some cache entries
      getAvailableVersions('@sap/cds');
      let stats = getCacheStatistics();
      expect(stats.cachedPackages.length).toBe(1);

      // Clear cache
      clearVersionCache();
      stats = getCacheStatistics();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.cachedPackages.length).toBe(0);
    });
  });
});
