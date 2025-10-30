import { CdsDependencyCombination, SemanticVersion } from '../../../src/packageManager/types';

describe('packageManager types', () => {
  describe('CdsDependencyCombination', () => {
    it('should allow valid dependency combination', () => {
      const combination: CdsDependencyCombination = {
        cdsVersion: '6.1.3',
        cdsDkVersion: '6.0.0',
        hash: 'abc123',
        resolvedCdsVersion: '6.1.3',
        resolvedCdsDkVersion: '6.0.0',
        isFallback: false,
        warning: undefined,
      };

      expect(combination.cdsVersion).toBe('6.1.3');
      expect(combination.cdsDkVersion).toBe('6.0.0');
      expect(combination.hash).toBe('abc123');
      expect(combination.resolvedCdsVersion).toBe('6.1.3');
      expect(combination.resolvedCdsDkVersion).toBe('6.0.0');
      expect(combination.isFallback).toBe(false);
      expect(combination.warning).toBeUndefined();
    });

    it('should allow minimal dependency combination', () => {
      const combination: CdsDependencyCombination = {
        cdsVersion: 'latest',
        cdsDkVersion: 'latest',
        hash: 'def456',
      };

      expect(combination.cdsVersion).toBe('latest');
      expect(combination.cdsDkVersion).toBe('latest');
      expect(combination.hash).toBe('def456');
      expect(combination.resolvedCdsVersion).toBeUndefined();
      expect(combination.resolvedCdsDkVersion).toBeUndefined();
      expect(combination.isFallback).toBeUndefined();
      expect(combination.warning).toBeUndefined();
    });

    it('should allow fallback dependency combination with warning', () => {
      const combination: CdsDependencyCombination = {
        cdsVersion: '^6.0.0',
        cdsDkVersion: '^6.0.0',
        hash: 'ghi789',
        resolvedCdsVersion: '6.1.3',
        resolvedCdsDkVersion: '6.0.5',
        isFallback: true,
        warning: 'Using fallback versions due to compatibility issues',
      };

      expect(combination.isFallback).toBe(true);
      expect(combination.warning).toContain('fallback versions');
    });
  });

  describe('SemanticVersion', () => {
    it('should allow complete semantic version', () => {
      const version: SemanticVersion = {
        major: 6,
        minor: 1,
        patch: 3,
        prerelease: 'beta.1',
        build: 'build.123',
        original: '6.1.3-beta.1+build.123',
      };

      expect(version.major).toBe(6);
      expect(version.minor).toBe(1);
      expect(version.patch).toBe(3);
      expect(version.prerelease).toBe('beta.1');
      expect(version.build).toBe('build.123');
      expect(version.original).toBe('6.1.3-beta.1+build.123');
    });

    it('should allow minimal semantic version', () => {
      const version: SemanticVersion = {
        major: 6,
        minor: 1,
        patch: 3,
        original: '6.1.3',
      };

      expect(version.major).toBe(6);
      expect(version.minor).toBe(1);
      expect(version.patch).toBe(3);
      expect(version.prerelease).toBeUndefined();
      expect(version.build).toBeUndefined();
      expect(version.original).toBe('6.1.3');
    });

    it('should allow prerelease version without build', () => {
      const version: SemanticVersion = {
        major: 7,
        minor: 0,
        patch: 0,
        prerelease: 'alpha.2',
        original: '7.0.0-alpha.2',
      };

      expect(version.major).toBe(7);
      expect(version.minor).toBe(0);
      expect(version.patch).toBe(0);
      expect(version.prerelease).toBe('alpha.2');
      expect(version.build).toBeUndefined();
      expect(version.original).toBe('7.0.0-alpha.2');
    });

    it('should allow build version without prerelease', () => {
      const version: SemanticVersion = {
        major: 6,
        minor: 2,
        patch: 1,
        build: 'nightly.20231201',
        original: '6.2.1+nightly.20231201',
      };

      expect(version.major).toBe(6);
      expect(version.minor).toBe(2);
      expect(version.patch).toBe(1);
      expect(version.prerelease).toBeUndefined();
      expect(version.build).toBe('nightly.20231201');
      expect(version.original).toBe('6.2.1+nightly.20231201');
    });
  });
});
