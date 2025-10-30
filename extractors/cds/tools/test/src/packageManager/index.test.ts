import * as packageManager from '../../../src/packageManager';

describe('packageManager index', () => {
  describe('exports', () => {
    it('should export functions required for installing dependencies in cache', () => {
      expect(typeof packageManager.cacheInstallDependencies).toBe('function');
    });

    it('should export functions required for installing dependencies in project', () => {
      expect(typeof packageManager.needsFullDependencyInstallation).toBe('function');
      expect(typeof packageManager.projectInstallDependencies).toBe('function');
    });

    it('should export version resolver functions', () => {
      expect(typeof packageManager.checkVersionCompatibility).toBe('function');
      expect(typeof packageManager.compareVersions).toBe('function');
      expect(typeof packageManager.findBestAvailableVersion).toBe('function');
      expect(typeof packageManager.getAvailableVersions).toBe('function');
      expect(typeof packageManager.getCacheStatistics).toBe('function');
      expect(typeof packageManager.parseSemanticVersion).toBe('function');
      expect(typeof packageManager.resolveCdsVersions).toBe('function');
      expect(typeof packageManager.satisfiesRange).toBe('function');
    });

    it('should provide all expected exports', () => {
      const expectedExports = [
        'cacheInstallDependencies',
        'checkVersionCompatibility',
        'compareVersions',
        'findBestAvailableVersion',
        'getAvailableVersions',
        'getCacheStatistics',
        'needsFullDependencyInstallation',
        'parseSemanticVersion',
        'projectInstallDependencies',
        'resolveCdsVersions',
        'satisfiesRange',
      ];

      for (const exportName of expectedExports) {
        expect(packageManager).toHaveProperty(exportName);
      }

      // Verify specific types directly
      expect(typeof packageManager.cacheInstallDependencies).toBe('function');
      expect(typeof packageManager.checkVersionCompatibility).toBe('function');
      expect(typeof packageManager.parseSemanticVersion).toBe('function');
    });

    it('should export types correctly', () => {
      // Type exports are compile-time only, but we can verify the module structure
      expect(packageManager).toBeDefined();
    });
  });

  describe('integration', () => {
    it('should allow all functions to be called without errors', () => {
      // Test basic function calls don't throw (without mocking dependencies)
      expect(() => packageManager.getCacheStatistics()).not.toThrow();

      // Test parsing functions with basic inputs
      const parsedVersion = packageManager.parseSemanticVersion('6.1.3');
      expect(parsedVersion).toBeDefined();
      expect(parsedVersion?.major).toBe(6);

      const parsedVersion2 = packageManager.parseSemanticVersion('6.2.0');
      expect(parsedVersion2).toBeDefined();
      expect(parsedVersion2?.major).toBe(6);

      // Test compatibility check
      const compatibility = packageManager.checkVersionCompatibility('6.1.3', '6.0.0');
      expect(compatibility).toBeDefined();
      expect(typeof compatibility.isCompatible).toBe('boolean');
    });

    it('should have working version comparison functions', () => {
      const version1 = packageManager.parseSemanticVersion('6.1.3');
      const version2 = packageManager.parseSemanticVersion('6.2.0');

      // These are guaranteed to be defined for valid versions
      expect(version1).not.toBeNull();
      expect(version2).not.toBeNull();

      // Use non-null assertion since we've verified they exist
      const comparison = packageManager.compareVersions(version1!, version2!);
      expect(typeof comparison).toBe('number');

      const satisfies = packageManager.satisfiesRange(version1!, '6.1.3');
      expect(typeof satisfies).toBe('boolean');
      expect(satisfies).toBe(true);
    });
  });
});
