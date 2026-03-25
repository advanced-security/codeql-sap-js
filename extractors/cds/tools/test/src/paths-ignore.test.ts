import { existsSync, readFileSync } from 'fs';

import { load as yamlLoad } from 'js-yaml';

import {
  clearPathsIgnoreCache,
  filterIgnoredPaths,
  findCodeqlConfigFile,
  getPathsIgnorePatterns,
  shouldIgnorePath,
} from '../../src/paths-ignore';

// Mock modules
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));
jest.mock('js-yaml');

describe('paths-ignore', () => {
  const savedCodeqlConfigPath = process.env.CODEQL_CONFIG_PATH;

  beforeEach(() => {
    jest.resetAllMocks();
    clearPathsIgnoreCache();
    delete process.env.CODEQL_CONFIG_PATH;
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (savedCodeqlConfigPath !== undefined) {
      process.env.CODEQL_CONFIG_PATH = savedCodeqlConfigPath;
    } else {
      delete process.env.CODEQL_CONFIG_PATH;
    }
  });

  describe('findCodeqlConfigFile', () => {
    it('should find .github/codeql/codeql-config.yml', () => {
      (existsSync as jest.Mock).mockImplementation(
        (p: string) => p === '/source/.github/codeql/codeql-config.yml',
      );

      const result = findCodeqlConfigFile('/source');
      expect(result).toBe('/source/.github/codeql/codeql-config.yml');
    });

    it('should find .github/codeql/codeql-config.yaml', () => {
      (existsSync as jest.Mock).mockImplementation(
        (p: string) => p === '/source/.github/codeql/codeql-config.yaml',
      );

      const result = findCodeqlConfigFile('/source');
      expect(result).toBe('/source/.github/codeql/codeql-config.yaml');
    });

    it('should prefer .yml over .yaml when both exist', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      const result = findCodeqlConfigFile('/source');
      expect(result).toBe('/source/.github/codeql/codeql-config.yml');
    });

    it('should return undefined when no config file exists', () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      const result = findCodeqlConfigFile('/source');
      expect(result).toBeUndefined();
    });

    it('should use CODEQL_CONFIG_PATH when set and file exists', () => {
      process.env.CODEQL_CONFIG_PATH = 'default-codeql-config.yml';
      (existsSync as jest.Mock).mockImplementation(
        (p: string) => p === '/source/default-codeql-config.yml',
      );

      const result = findCodeqlConfigFile('/source');
      expect(result).toBe('/source/default-codeql-config.yml');
    });

    it('should use CODEQL_CONFIG_PATH for nested paths under source root', () => {
      process.env.CODEQL_CONFIG_PATH = 'config/my-codeql-config.yml';
      (existsSync as jest.Mock).mockImplementation(
        (p: string) => p === '/source/config/my-codeql-config.yml',
      );

      const result = findCodeqlConfigFile('/source');
      expect(result).toBe('/source/config/my-codeql-config.yml');
    });

    it('should return undefined when CODEQL_CONFIG_PATH file does not exist', () => {
      process.env.CODEQL_CONFIG_PATH = 'nonexistent-config.yml';
      (existsSync as jest.Mock).mockReturnValue(false);

      const result = findCodeqlConfigFile('/source');
      expect(result).toBeUndefined();
    });

    it('should reject CODEQL_CONFIG_PATH that resolves outside source root', () => {
      process.env.CODEQL_CONFIG_PATH = '../../etc/passwd';
      (existsSync as jest.Mock).mockReturnValue(true);

      const result = findCodeqlConfigFile('/source');
      expect(result).toBeUndefined();
    });

    it('should not fall back to default paths when CODEQL_CONFIG_PATH is set but missing', () => {
      process.env.CODEQL_CONFIG_PATH = 'missing-config.yml';
      (existsSync as jest.Mock).mockImplementation(
        (p: string) => p === '/source/.github/codeql/codeql-config.yml',
      );

      const result = findCodeqlConfigFile('/source');
      // Should NOT find the default config when CODEQL_CONFIG_PATH is explicitly set
      expect(result).toBeUndefined();
    });

    it('should take precedence over default paths when CODEQL_CONFIG_PATH is set', () => {
      process.env.CODEQL_CONFIG_PATH = 'custom-config.yml';
      (existsSync as jest.Mock).mockReturnValue(true);

      const result = findCodeqlConfigFile('/source');
      expect(result).toBe('/source/custom-config.yml');
    });
  });

  describe('getPathsIgnorePatterns', () => {
    it('should return patterns from a config file with paths-ignore list', () => {
      (existsSync as jest.Mock).mockImplementation(
        (p: string) => p === '/source/.github/codeql/codeql-config.yml',
      );
      (readFileSync as jest.Mock).mockReturnValue('yaml-content');
      (yamlLoad as jest.Mock).mockReturnValue({
        name: 'My CodeQL config',
        'paths-ignore': ['src/node_modules', '**/*.test.js'],
        queries: [{ uses: 'security-extended' }],
      });

      const result = getPathsIgnorePatterns('/source');
      expect(result).toEqual(['src/node_modules', '**/*.test.js']);
    });

    it('should return empty array when no config file exists', () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      const result = getPathsIgnorePatterns('/source');
      expect(result).toEqual([]);
    });

    it('should return empty array when config has no paths-ignore', () => {
      (existsSync as jest.Mock).mockImplementation(
        (p: string) => p === '/source/.github/codeql/codeql-config.yml',
      );
      (readFileSync as jest.Mock).mockReturnValue('yaml-content');
      (yamlLoad as jest.Mock).mockReturnValue({
        name: 'My CodeQL config',
        queries: [{ uses: 'security-extended' }],
      });

      const result = getPathsIgnorePatterns('/source');
      expect(result).toEqual([]);
    });

    it('should handle paths-ignore with various string formats', () => {
      (existsSync as jest.Mock).mockImplementation(
        (p: string) => p === '/source/.github/codeql/codeql-config.yml',
      );
      (readFileSync as jest.Mock).mockReturnValue('yaml-content');
      (yamlLoad as jest.Mock).mockReturnValue({
        'paths-ignore': ['vendor/**', 'test/data'],
      });

      const result = getPathsIgnorePatterns('/source');
      expect(result).toEqual(['vendor/**', 'test/data']);
    });

    it('should cache results for the same source root', () => {
      (existsSync as jest.Mock).mockImplementation(
        (p: string) => p === '/source/.github/codeql/codeql-config.yml',
      );
      (readFileSync as jest.Mock).mockReturnValue('yaml-content');
      (yamlLoad as jest.Mock).mockReturnValue({
        'paths-ignore': ['vendor'],
      });

      const result1 = getPathsIgnorePatterns('/source');
      const result2 = getPathsIgnorePatterns('/source');
      expect(result1).toEqual(['vendor']);
      expect(result2).toEqual(['vendor']);
      // readFileSync should only be called once due to caching
      expect(readFileSync).toHaveBeenCalledTimes(1);
    });

    it('should handle malformed YAML gracefully', () => {
      (existsSync as jest.Mock).mockImplementation(
        (p: string) => p === '/source/.github/codeql/codeql-config.yml',
      );
      (readFileSync as jest.Mock).mockReturnValue('{{invalid');
      (yamlLoad as jest.Mock).mockImplementation(() => {
        throw new Error('YAML parse error');
      });

      const result = getPathsIgnorePatterns('/source');
      expect(result).toEqual([]);
    });

    it('should handle read errors gracefully', () => {
      (existsSync as jest.Mock).mockImplementation(
        (p: string) => p === '/source/.github/codeql/codeql-config.yml',
      );
      (readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = getPathsIgnorePatterns('/source');
      expect(result).toEqual([]);
    });

    it('should filter out non-string and empty entries', () => {
      (existsSync as jest.Mock).mockImplementation(
        (p: string) => p === '/source/.github/codeql/codeql-config.yml',
      );
      (readFileSync as jest.Mock).mockReturnValue('yaml-content');
      (yamlLoad as jest.Mock).mockReturnValue({
        'paths-ignore': ['vendor', '', null, 42, 'test'],
      });

      const result = getPathsIgnorePatterns('/source');
      expect(result).toEqual(['vendor', 'test']);
    });

    it('should return empty array when config is null', () => {
      (existsSync as jest.Mock).mockImplementation(
        (p: string) => p === '/source/.github/codeql/codeql-config.yml',
      );
      (readFileSync as jest.Mock).mockReturnValue('');
      (yamlLoad as jest.Mock).mockReturnValue(null);

      const result = getPathsIgnorePatterns('/source');
      expect(result).toEqual([]);
    });

    it('should return empty array when paths-ignore is not an array', () => {
      (existsSync as jest.Mock).mockImplementation(
        (p: string) => p === '/source/.github/codeql/codeql-config.yml',
      );
      (readFileSync as jest.Mock).mockReturnValue('yaml-content');
      (yamlLoad as jest.Mock).mockReturnValue({
        'paths-ignore': 'not-an-array',
      });

      const result = getPathsIgnorePatterns('/source');
      expect(result).toEqual([]);
    });

    it('should read patterns from custom config via CODEQL_CONFIG_PATH', () => {
      process.env.CODEQL_CONFIG_PATH = 'default-codeql-config.yml';
      (existsSync as jest.Mock).mockImplementation(
        (p: string) => p === '/source/default-codeql-config.yml',
      );
      (readFileSync as jest.Mock).mockReturnValue('yaml-content');
      (yamlLoad as jest.Mock).mockReturnValue({
        'paths-ignore': ['third_party', 'generated/**'],
      });

      const result = getPathsIgnorePatterns('/source');
      expect(result).toEqual(['third_party', 'generated/**']);
    });
  });

  describe('shouldIgnorePath', () => {
    it('should match exact directory path', () => {
      expect(shouldIgnorePath('vendor/lib/foo.cds', ['vendor'])).toBe(true);
    });

    it('should match file directly under ignored directory', () => {
      expect(shouldIgnorePath('src/node_modules/pkg/index.cds', ['src/node_modules'])).toBe(true);
    });

    it('should match ** glob at start', () => {
      expect(shouldIgnorePath('deep/nested/file.test.js', ['**/*.test.js'])).toBe(true);
    });

    it('should match ** glob at both ends', () => {
      expect(shouldIgnorePath('path/to/vendor/lib/file.cds', ['**/vendor/**'])).toBe(true);
    });

    it('should match directory pattern with trailing /**', () => {
      expect(shouldIgnorePath('test/data/sample.cds', ['test/**'])).toBe(true);
    });

    it('should not match non-matching paths', () => {
      expect(shouldIgnorePath('src/main.cds', ['vendor'])).toBe(false);
    });

    it('should not match partial directory names', () => {
      expect(shouldIgnorePath('src/vendor-custom/file.cds', ['vendor'])).toBe(false);
    });

    it('should return false when no patterns are given', () => {
      expect(shouldIgnorePath('anything.cds', [])).toBe(false);
    });

    it('should match multiple patterns (any match returns true)', () => {
      expect(shouldIgnorePath('test/sample.cds', ['vendor', 'test'])).toBe(true);
    });

    it('should match dotfile directories', () => {
      expect(shouldIgnorePath('.github/workflows/ci.yml', ['.github'])).toBe(true);
    });

    it('should match patterns from real-world codeql-config.yml', () => {
      const patterns = ['**/frameworks/*/test/models'];
      expect(shouldIgnorePath('javascript/frameworks/cap/test/models/sink.js', patterns)).toBe(
        true,
      );
      expect(shouldIgnorePath('javascript/frameworks/ui5/test/models/source.js', patterns)).toBe(
        true,
      );
      expect(shouldIgnorePath('javascript/frameworks/cap/src/query.ql', patterns)).toBe(false);
    });

    it('should match single * wildcard for one path segment', () => {
      expect(shouldIgnorePath('bookshop/srv/cat-service.cds', ['*/srv'])).toBe(true);
      expect(shouldIgnorePath('orders/srv/orders-service.cds', ['*/srv'])).toBe(true);
      // Should NOT match two segments deep
      expect(shouldIgnorePath('a/b/srv/file.cds', ['*/srv'])).toBe(false);
    });

    it('should match globstar in the middle of a pattern', () => {
      expect(shouldIgnorePath('src/deep/nested/test/file.cds', ['src/**/test'])).toBe(true);
      expect(shouldIgnorePath('src/test/file.cds', ['src/**/test'])).toBe(true);
      expect(shouldIgnorePath('other/test/file.cds', ['src/**/test'])).toBe(false);
    });

    it('should match exact file path', () => {
      expect(
        shouldIgnorePath('orders/srv/orders-service.cds', ['orders/srv/orders-service.cds']),
      ).toBe(true);
      expect(shouldIgnorePath('orders/srv/other.cds', ['orders/srv/orders-service.cds'])).toBe(
        false,
      );
    });

    it('should match extension glob that ignores all CDS files', () => {
      expect(shouldIgnorePath('bookshop/db/schema.cds', ['**/*.cds'])).toBe(true);
      expect(shouldIgnorePath('deep/nested/file.cds', ['**/*.cds'])).toBe(true);
      expect(shouldIgnorePath('bookshop/model.cds.json', ['**/*.cds'])).toBe(false);
    });

    it('should match subdirectory within a project', () => {
      expect(shouldIgnorePath('bookshop/db/schema.cds', ['bookshop/db'])).toBe(true);
      expect(shouldIgnorePath('bookshop/srv/service.cds', ['bookshop/db'])).toBe(false);
    });

    it('should not match when pattern has no matches', () => {
      expect(shouldIgnorePath('bookshop/srv/service.cds', ['nonexistent-dir'])).toBe(false);
      expect(shouldIgnorePath('orders/db/schema.cds', ['zzz-does-not-exist'])).toBe(false);
    });

    it('should not match bare dot pattern against nested paths', () => {
      // '.' is not a useful paths-ignore pattern — it doesn't match nested paths
      expect(shouldIgnorePath('any/path/file.cds', ['.'])).toBe(false);
    });
  });

  describe('filterIgnoredPaths', () => {
    it('should filter matching files from the list', () => {
      const files = [
        'src/main.cds',
        'vendor/lib/dep.cds',
        'src/models/user.cds',
        'vendor/other/thing.cds',
      ];
      const result = filterIgnoredPaths(files, ['vendor']);
      expect(result).toEqual(['src/main.cds', 'src/models/user.cds']);
    });

    it('should return all files when no patterns are given', () => {
      const files = ['a.cds', 'b.cds'];
      const result = filterIgnoredPaths(files, []);
      expect(result).toEqual(['a.cds', 'b.cds']);
    });

    it('should return empty array when all files match', () => {
      const files = ['vendor/a.cds', 'vendor/b.cds'];
      const result = filterIgnoredPaths(files, ['vendor']);
      expect(result).toEqual([]);
    });

    it('should handle glob patterns correctly', () => {
      const files = [
        'src/app.cds',
        'src/app.test.cds',
        'test/integration.cds',
        'test/unit.test.cds',
      ];
      const result = filterIgnoredPaths(files, ['**/*.test.cds', 'test']);
      expect(result).toEqual(['src/app.cds']);
    });

    it('should handle multiple directory-style patterns', () => {
      const files = [
        'bookshop/db/schema.cds',
        'bookshop/srv/cat-service.cds',
        'bookstore/srv/service.cds',
        'orders/srv/orders.cds',
      ];
      const result = filterIgnoredPaths(files, ['bookshop', 'bookstore']);
      expect(result).toEqual(['orders/srv/orders.cds']);
    });

    it('should handle trailing slashes in patterns gracefully', () => {
      const files = ['vendor/lib/foo.cds', 'src/main.cds'];
      const result = filterIgnoredPaths(files, ['vendor/']);
      expect(result).toEqual(['src/main.cds']);
    });
  });
});
