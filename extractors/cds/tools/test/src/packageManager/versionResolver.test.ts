import {
  parseSemanticVersion,
  compareVersions,
  satisfiesRange,
  findBestAvailableVersion,
  resolveCdsVersions,
} from '../../../src/packageManager';

// Mock the execSync function and logging
jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

jest.mock('../../../src/logging', () => ({
  cdsExtractorLog: jest.fn(),
}));

describe('versionResolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      expect(result.warning).toContain('CDS dependency issues:');
    });

    it('should handle unavailable versions gracefully', () => {
      const result = resolveCdsVersions('8.0.0', '8.0.0');

      expect(result.resolvedCdsVersion).toBe('7.0.0'); // Fallback to newest
      expect(result.resolvedCdsDkVersion).toBe('6.1.0'); // Fallback to newest
      expect(result.cdsExactMatch).toBe(false);
      expect(result.cdsDkExactMatch).toBe(false);
      expect(result.warning).toContain('CDS dependency issues:');
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
      expect(result.warning).toContain('CDS dependency issues:');
    });
  });
});
