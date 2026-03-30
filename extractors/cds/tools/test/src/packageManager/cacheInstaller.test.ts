import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { CdsDependencyGraph, CdsProject } from '../../../src/cds/parser/types';
import {
  cacheInstallDependencies,
  copyNpmrcToCache,
  findNearestNpmrc,
} from '../../../src/packageManager';

// Mock dependencies
jest.mock('fs', () => ({
  copyFileSync: jest.fn(),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  dirname: jest.fn(),
  join: jest.fn((...paths) => paths.join('/')),
  resolve: jest.fn((...paths) => paths.join('/')),
}));

jest.mock('child_process', () => ({
  execFileSync: jest.fn(),
  execSync: jest.fn(),
}));

jest.mock('../../../src/diagnostics', () => ({
  addDependencyDiagnostic: jest.fn(),
  addPackageJsonParsingDiagnostic: jest.fn(),
  DiagnosticSeverity: {
    Warning: 'warning',
    Error: 'error',
  },
}));

jest.mock('../../../src/logging', () => ({
  cdsExtractorLog: jest.fn(),
}));

// Mock the version resolver
jest.mock('../../../src/packageManager/versionResolver', () => ({
  resolveCdsVersions: jest.fn(),
  logCacheStatistics: jest.fn(),
}));

describe('installer', () => {
  // Helper function to create a minimal mock dependency graph
  const createMockDependencyGraph = (
    projects: Array<{
      projectDir: string;
      packageJson?: {
        name?: string;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
    }>,
  ): CdsDependencyGraph => {
    const projectsMap = new Map<string, CdsProject>();

    projects.forEach(({ projectDir, packageJson }) => {
      const cdsProject: CdsProject = {
        id: `project-${projectDir}`,
        projectDir,
        cdsFiles: [`${projectDir}/src/file.cds`],
        compilationTargets: [`${projectDir}/src/file.cds`],
        expectedOutputFile: 'model.cds.json',
        packageJson,
        status: 'discovered',
        compilationTasks: [],
        timestamps: {
          discovered: new Date(),
        },
      };
      projectsMap.set(projectDir, cdsProject);
    });

    return {
      id: 'test-graph',
      sourceRootDir: '/source',
      projects: projectsMap,
      config: {
        maxRetryAttempts: 3,
        enableDetailedLogging: false,
        generateDebugOutput: false,
        compilationTimeoutMs: 30000,
      },
      debugInfo: {} as CdsDependencyGraph['debugInfo'],
      statusSummary: {
        totalProjects: projects.length,
        totalCdsFiles: projects.length,
        totalCompilationTasks: 0,
        successfulCompilations: 0,
        failedCompilations: 0,
        skippedCompilations: 0,
        jsonFilesGenerated: 0,
        overallSuccess: true,
        criticalErrors: [],
        warnings: [],
        performance: {
          totalDurationMs: 0,
          parsingDurationMs: 100,
          compilationDurationMs: 0,
          extractionDurationMs: 0,
        },
      },
      errors: {
        critical: [],
        warnings: [],
      },
      retryStatus: {
        totalTasksRequiringRetry: 0,
        totalTasksSuccessfullyRetried: 0,
        totalRetryAttempts: 0,
        projectsRequiringFullDependencies: new Set<string>(),
        projectsWithFullDependencies: new Set<string>(),
      },
      currentPhase: 'parsing',
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    (path.join as jest.Mock).mockImplementation((...paths: string[]) => paths.join('/'));
    (path.resolve as jest.Mock).mockImplementation((...paths: string[]) => paths.join('/'));
  });

  describe('installDependencies', () => {
    beforeEach(() => {
      // Mock file system operations
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
      (childProcess.execFileSync as jest.Mock).mockReturnValue('');

      // Mock version resolver
      const mockResolveCdsVersions = jest.mocked(
        jest.requireMock('../../../src/packageManager/versionResolver').resolveCdsVersions,
      );
      mockResolveCdsVersions.mockReturnValue({
        resolvedCdsVersion: '6.1.3',
        resolvedCdsDkVersion: '6.0.0',
        cdsExactMatch: true,
        cdsDkExactMatch: true,
      });
    });

    it('should install dependencies successfully', () => {
      const dependencyGraph = createMockDependencyGraph([
        {
          projectDir: '/project1',
          packageJson: {
            name: 'project1',
            dependencies: { '@sap/cds': '6.1.3' },
            devDependencies: { '@sap/cds-dk': '6.0.0' },
          },
        },
      ]);

      const result = cacheInstallDependencies(dependencyGraph, '/source', '/codeql');

      expect(fs.mkdirSync).toHaveBeenCalledWith('/source/.cds-extractor-cache', {
        recursive: true,
      });
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(childProcess.execFileSync).toHaveBeenCalledWith(
        'npm',
        ['install', '--quiet', '--no-audit', '--no-fund'],
        expect.objectContaining({ cwd: expect.stringContaining('cds-') }),
      );
      expect(result.size).toBe(1);
    });

    it('should handle cache directory creation failure', () => {
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const dependencyGraph = createMockDependencyGraph([
        {
          projectDir: '/project1',
          packageJson: { name: 'project1', dependencies: { '@sap/cds': '6.1.3' } },
        },
      ]);

      const result = cacheInstallDependencies(dependencyGraph, '/source', '/codeql');

      // Should return empty map since cache creation failed
      expect(result.size).toBe(0);
    });

    it('should use existing cached dependencies', () => {
      // Mock that node_modules already exists - need to handle cache dir structure
      (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
        // Return true for cache root directory
        if (path === '/source/.cds-extractor-cache') {
          return true;
        }
        // Return true for the specific cache directory (cds-<hash>)
        if (path.includes('.cds-extractor-cache/cds-') && !path.includes('node_modules')) {
          return true;
        }
        // Return true for the specific node_modules paths that the code checks
        if (path.includes('.cds-extractor-cache/cds-') && path.endsWith('node_modules/@sap/cds')) {
          return true;
        }
        if (
          path.includes('.cds-extractor-cache/cds-') &&
          path.endsWith('node_modules/@sap/cds-dk')
        ) {
          return true;
        }
        return false;
      });

      const dependencyGraph = createMockDependencyGraph([
        {
          projectDir: '/project1',
          packageJson: {
            name: 'project1',
            dependencies: { '@sap/cds': '6.1.3' },
            devDependencies: { '@sap/cds-dk': '6.0.0' },
          },
        },
      ]);

      const result = cacheInstallDependencies(dependencyGraph, '/source', '/codeql');

      // Should not call npm install since cache exists
      expect(childProcess.execFileSync).not.toHaveBeenCalledWith(
        'npm',
        ['install', '--quiet', '--no-audit', '--no-fund'],
        expect.any(Object),
      );
      expect(result.size).toBe(1);
    });

    it('should handle npm install failures gracefully', () => {
      (childProcess.execFileSync as jest.Mock).mockImplementation((command: string) => {
        if (command === 'npm') {
          throw new Error('npm install failed');
        }
        return '';
      });

      const dependencyGraph = createMockDependencyGraph([
        {
          projectDir: '/project1',
          packageJson: {
            name: 'project1',
            dependencies: { '@sap/cds': '6.1.3' },
            devDependencies: { '@sap/cds-dk': '6.0.0' },
          },
        },
      ]);

      const result = cacheInstallDependencies(dependencyGraph, '/source', '/codeql');

      // Should skip failed combinations
      expect(result.size).toBe(0);
    });

    it('should handle empty dependency graph', () => {
      const dependencyGraph = createMockDependencyGraph([]);
      const result = cacheInstallDependencies(dependencyGraph, '/source', '/codeql');

      expect(result.size).toBe(0);
    });

    it('should reuse cache for projects with different version specs but same resolved versions', () => {
      // Mock version resolver to return the same resolved versions for different specs
      const mockResolveCdsVersions = jest.mocked(
        jest.requireMock('../../../src/packageManager/versionResolver').resolveCdsVersions,
      );
      mockResolveCdsVersions.mockReturnValue({
        resolvedCdsVersion: '6.1.3',
        resolvedCdsDkVersion: '6.0.0',
        cdsExactMatch: false,
        cdsDkExactMatch: false,
      });

      const dependencyGraph = createMockDependencyGraph([
        {
          projectDir: '/project1',
          packageJson: {
            name: 'project1',
            dependencies: { '@sap/cds': '^6.1.0' },
            devDependencies: { '@sap/cds-dk': '^6.0.0' },
          },
        },
        {
          projectDir: '/project2',
          packageJson: {
            name: 'project2',
            dependencies: { '@sap/cds': '~6.1.0' },
            devDependencies: { '@sap/cds-dk': '~6.0.0' },
          },
        },
        {
          projectDir: '/project3',
          packageJson: {
            name: 'project3',
            dependencies: { '@sap/cds': 'latest' },
            devDependencies: { '@sap/cds-dk': 'latest' },
          },
        },
      ]);

      const result = cacheInstallDependencies(dependencyGraph, '/source', '/codeql');

      // Should create only one cache directory since all resolve to the same versions
      expect(fs.mkdirSync).toHaveBeenCalledWith('/source/.cds-extractor-cache', {
        recursive: true,
      });

      // Should only write one package.json (since only one cache dir is created)
      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);

      // Should only run npm install once
      expect(childProcess.execFileSync).toHaveBeenCalledTimes(1);
      expect(childProcess.execFileSync).toHaveBeenCalledWith(
        'npm',
        ['install', '--quiet', '--no-audit', '--no-fund'],
        expect.objectContaining({ cwd: expect.stringContaining('cds-') }),
      );

      // All three projects should be mapped to cache directories
      expect(result.size).toBe(3);

      // All projects should use the same cache directory
      const cacheDirs = Array.from(result.values());
      expect(new Set(cacheDirs).size).toBe(1); // Only one unique cache directory
    });

    it('should create separate caches for projects with different resolved versions', () => {
      const mockResolveCdsVersions = jest.mocked(
        jest.requireMock('../../../src/packageManager/versionResolver').resolveCdsVersions,
      );

      // Mock different return values based on input
      mockResolveCdsVersions.mockImplementation((cdsVersion: string, _cdsDkVersion: string) => {
        if (cdsVersion === '6.1.3') {
          return {
            resolvedCdsVersion: '6.1.3',
            resolvedCdsDkVersion: '6.0.0',
            cdsExactMatch: true,
            cdsDkExactMatch: true,
          };
        } else {
          return {
            resolvedCdsVersion: '7.0.0',
            resolvedCdsDkVersion: '7.0.0',
            cdsExactMatch: true,
            cdsDkExactMatch: true,
          };
        }
      });

      const dependencyGraph = createMockDependencyGraph([
        {
          projectDir: '/project1',
          packageJson: {
            name: 'project1',
            dependencies: { '@sap/cds': '6.1.3' },
            devDependencies: { '@sap/cds-dk': '6.0.0' },
          },
        },
        {
          projectDir: '/project2',
          packageJson: {
            name: 'project2',
            dependencies: { '@sap/cds': '7.0.0' },
            devDependencies: { '@sap/cds-dk': '7.0.0' },
          },
        },
      ]);

      const result = cacheInstallDependencies(dependencyGraph, '/source', '/codeql');

      // Should create two separate cache directories
      expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
      expect(childProcess.execFileSync).toHaveBeenCalledTimes(2);

      // Both projects should be mapped
      expect(result.size).toBe(2);

      // Projects should use different cache directories
      const cacheDirs = Array.from(result.values());
      expect(new Set(cacheDirs).size).toBe(2); // Two unique cache directories
    });

    it('should handle projects with no @sap/cds dependencies and return empty map', () => {
      // Reset the mock to not return any CDS dependencies
      const mockResolveCdsVersions = jest.mocked(
        jest.requireMock('../../../src/packageManager/versionResolver').resolveCdsVersions,
      );
      mockResolveCdsVersions.mockReturnValue({
        resolvedCdsVersion: null,
        resolvedCdsDkVersion: null,
        cdsExactMatch: false,
        cdsDkExactMatch: false,
      });

      const dependencyGraph = createMockDependencyGraph([
        {
          projectDir: '/project1',
          packageJson: {
            name: 'project1',
            dependencies: { 'some-other-package': '1.0.0' },
          },
        },
      ]);

      const result = cacheInstallDependencies(dependencyGraph, '/source', '/codeql');

      expect(result.size).toBe(0);
    });

    it('should add diagnostic warning when using fallback versions', () => {
      // Mock version resolver to return fallback versions
      const mockResolveCdsVersions = jest.mocked(
        jest.requireMock('../../../src/packageManager/versionResolver').resolveCdsVersions,
      );
      mockResolveCdsVersions.mockReturnValue({
        resolvedCdsVersion: '6.1.3',
        resolvedCdsDkVersion: '6.0.0',
        cdsExactMatch: false,
        cdsDkExactMatch: false,
        isFallback: true,
        warning: 'Using fallback versions due to compatibility issues',
      });

      // Mock existing cached dependencies
      (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('.cds-extractor-cache') && !path.includes('node_modules')) {
          return true;
        }
        if (path.includes('.cds-extractor-cache/cds-') && path.endsWith('node_modules/@sap/cds')) {
          return true;
        }
        if (
          path.includes('.cds-extractor-cache/cds-') &&
          path.endsWith('node_modules/@sap/cds-dk')
        ) {
          return true;
        }
        return false;
      });

      const dependencyGraph = createMockDependencyGraph([
        {
          projectDir: '/project1',
          packageJson: {
            name: 'project1',
            dependencies: { '@sap/cds': '^6.0.0' },
            devDependencies: { '@sap/cds-dk': '^6.0.0' },
          },
        },
      ]);

      const result = cacheInstallDependencies(dependencyGraph, '/source', '/codeql');

      // Should add diagnostic warning for fallback versions
      expect(childProcess.execFileSync).toHaveBeenCalledWith(
        '/codeql',
        expect.arrayContaining([
          'database',
          'add-diagnostic',
          '--extractor-name=cds',
          '--source-id=cds/dependency-version-fallback',
          expect.stringContaining('Using fallback versions due to compatibility issues'),
        ]),
      );
      expect(result.size).toBe(1);
    });

    it('should handle diagnostic creation failure gracefully', () => {
      // Mock version resolver to return fallback versions
      const mockResolveCdsVersions = jest.mocked(
        jest.requireMock('../../../src/packageManager/versionResolver').resolveCdsVersions,
      );
      mockResolveCdsVersions.mockReturnValue({
        resolvedCdsVersion: '6.1.3',
        resolvedCdsDkVersion: '6.0.0',
        cdsExactMatch: false,
        cdsDkExactMatch: false,
        isFallback: true,
        warning: 'Using fallback versions',
      });

      // Mock existing cached dependencies
      (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('.cds-extractor-cache') && !path.includes('node_modules')) {
          return true;
        }
        if (path.includes('.cds-extractor-cache/cds-') && path.endsWith('node_modules/@sap/cds')) {
          return true;
        }
        if (
          path.includes('.cds-extractor-cache/cds-') &&
          path.endsWith('node_modules/@sap/cds-dk')
        ) {
          return true;
        }
        return false;
      });

      // Mock execFileSync to fail for diagnostic commands
      (childProcess.execFileSync as jest.Mock).mockImplementation(
        (command: string, args: string[]) => {
          if (command === '/codeql' && args.includes('add-diagnostic')) {
            throw new Error('Failed to add diagnostic');
          }
          return '';
        },
      );

      const dependencyGraph = createMockDependencyGraph([
        {
          projectDir: '/project1',
          packageJson: {
            name: 'project1',
            dependencies: { '@sap/cds': '^6.0.0' },
            devDependencies: { '@sap/cds-dk': '^6.0.0' },
          },
        },
      ]);

      const result = cacheInstallDependencies(dependencyGraph, '/source', '/codeql');

      // Should still succeed even if diagnostic fails
      expect(result.size).toBe(1);
    });

    it('should handle projects with no resolved versions', () => {
      const mockResolveCdsVersions = jest.mocked(
        jest.requireMock('../../../src/packageManager/versionResolver').resolveCdsVersions,
      );
      mockResolveCdsVersions.mockReturnValue({
        resolvedCdsVersion: null,
        resolvedCdsDkVersion: null,
        cdsExactMatch: false,
        cdsDkExactMatch: false,
      });

      const dependencyGraph = createMockDependencyGraph([
        {
          projectDir: '/project1',
          packageJson: {
            name: 'project1',
            dependencies: { '@sap/cds': 'invalid-version' },
            devDependencies: { '@sap/cds-dk': 'invalid-version' },
          },
        },
      ]);

      const result = cacheInstallDependencies(dependencyGraph, '/source', '/codeql');

      expect(result.size).toBe(0);
    });

    it('should handle projects with incomplete package.json', () => {
      // Reset the mock to not return any CDS dependencies
      const mockResolveCdsVersions = jest.mocked(
        jest.requireMock('../../../src/packageManager/versionResolver').resolveCdsVersions,
      );
      mockResolveCdsVersions.mockReturnValue({
        resolvedCdsVersion: null,
        resolvedCdsDkVersion: null,
        cdsExactMatch: false,
        cdsDkExactMatch: false,
      });

      const dependencyGraph = createMockDependencyGraph([
        {
          projectDir: '/project1',
          packageJson: {
            name: 'project1',
            // Missing dependencies and devDependencies
          },
        },
      ]);

      const result = cacheInstallDependencies(dependencyGraph, '/source', '/codeql');

      expect(result.size).toBe(0);
    });

    it('should handle projects with undefined package.json', () => {
      const dependencyGraph = createMockDependencyGraph([
        {
          projectDir: '/project1',
          // packageJson is undefined
        },
      ]);

      const result = cacheInstallDependencies(dependencyGraph, '/source', '/codeql');

      expect(result.size).toBe(0);
    });

    it('should handle failure when no package.json path can be determined', () => {
      const mockResolveCdsVersions = jest.mocked(
        jest.requireMock('../../../src/packageManager/versionResolver').resolveCdsVersions,
      );
      mockResolveCdsVersions.mockReturnValue({
        resolvedCdsVersion: '6.1.3',
        resolvedCdsDkVersion: '6.0.0',
        cdsExactMatch: true,
        cdsDkExactMatch: true,
      });

      const dependencyGraph = createMockDependencyGraph([]);
      // Add a project map entry manually without package.json
      const projectsMap = new Map();
      projectsMap.set('/project1', {
        id: 'project-/project1',
        projectDir: '/project1',
        cdsFiles: ['/project1/src/file.cds'],
        compilationTargets: ['/project1/src/file.cds'],
        expectedOutputFile: 'model.cds.json',
        packageJson: undefined, // No package.json
        status: 'discovered',
        compilationTasks: [],
        timestamps: { discovered: new Date() },
      });
      dependencyGraph.projects = projectsMap;

      // Mock the fs operations to force an install attempt even without package.json
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);

      const result = cacheInstallDependencies(dependencyGraph, '/source', '/codeql');

      expect(result.size).toBe(0);
    });
  });

  describe('findNearestNpmrc', () => {
    beforeEach(() => {
      // Use actual path.dirname so the directory-walking loop works correctly
      (path.dirname as jest.Mock).mockImplementation(jest.requireActual('path').dirname);
      (fs.existsSync as jest.Mock).mockReturnValue(false);
    });

    it('should return the .npmrc path when it exists in the start directory', () => {
      (path.resolve as jest.Mock).mockReturnValue('/project/src');
      (fs.existsSync as jest.Mock).mockImplementation((p: string) => p === '/project/src/.npmrc');

      const result = findNearestNpmrc('/project/src');

      expect(result).toBe('/project/src/.npmrc');
    });

    it('should return the .npmrc path when it exists in a parent directory', () => {
      (path.resolve as jest.Mock).mockReturnValue('/project/src');
      (fs.existsSync as jest.Mock).mockImplementation((p: string) => p === '/project/.npmrc');

      const result = findNearestNpmrc('/project/src');

      expect(result).toBe('/project/.npmrc');
    });

    it('should return undefined when no .npmrc exists in the directory tree', () => {
      (path.resolve as jest.Mock).mockReturnValue('/project/src');
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = findNearestNpmrc('/project/src');

      expect(result).toBeUndefined();
    });
  });

  describe('copyNpmrcToCache', () => {
    beforeEach(() => {
      (path.dirname as jest.Mock).mockImplementation(jest.requireActual('path').dirname);
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.copyFileSync as jest.Mock).mockReturnValue(undefined);
    });

    it('should copy .npmrc to the cache directory when found', () => {
      (path.resolve as jest.Mock).mockReturnValue('/project');
      (fs.existsSync as jest.Mock).mockImplementation((p: string) => p === '/project/.npmrc');

      copyNpmrcToCache('/cache/dir', '/project');

      expect(fs.copyFileSync).toHaveBeenCalledWith('/project/.npmrc', '/cache/dir/.npmrc');
    });

    it('should do nothing when no .npmrc is found', () => {
      (path.resolve as jest.Mock).mockReturnValue('/project');
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      copyNpmrcToCache('/cache/dir', '/project');

      expect(fs.copyFileSync).not.toHaveBeenCalled();
    });

    it('should log a warning and not throw when copyFileSync fails', () => {
      (path.resolve as jest.Mock).mockReturnValue('/project');
      (fs.existsSync as jest.Mock).mockImplementation((p: string) => p === '/project/.npmrc');
      (fs.copyFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => copyNpmrcToCache('/cache/dir', '/project')).not.toThrow();
    });
  });

  describe('cacheInstallDependencies .npmrc propagation', () => {
    beforeEach(() => {
      (path.dirname as jest.Mock).mockImplementation(jest.requireActual('path').dirname);
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
      (fs.copyFileSync as jest.Mock).mockReturnValue(undefined);
      (childProcess.execFileSync as jest.Mock).mockReturnValue('');

      const mockResolveCdsVersions = jest.mocked(
        jest.requireMock('../../../src/packageManager/versionResolver').resolveCdsVersions,
      );
      mockResolveCdsVersions.mockReturnValue({
        resolvedCdsVersion: '6.1.3',
        resolvedCdsDkVersion: '6.0.0',
        cdsExactMatch: true,
        cdsDkExactMatch: true,
      });
    });

    it('should copy .npmrc to the cache directory before running npm install', () => {
      // Simulate an .npmrc in the project directory
      (fs.existsSync as jest.Mock).mockImplementation(
        (p: string) => p === '/source/project1/.npmrc',
      );

      const dependencyGraph = createMockDependencyGraph([
        {
          projectDir: 'project1',
          packageJson: {
            name: 'project1',
            dependencies: { '@sap/cds': '6.1.3' },
            devDependencies: { '@sap/cds-dk': '6.0.0' },
          },
        },
      ]);

      cacheInstallDependencies(dependencyGraph, '/source', '/codeql');

      expect(fs.copyFileSync).toHaveBeenCalledWith(
        '/source/project1/.npmrc',
        expect.stringContaining('.npmrc'),
      );
    });

    it('should succeed even when .npmrc copy fails', () => {
      // Simulate an .npmrc in the project directory
      (fs.existsSync as jest.Mock).mockImplementation(
        (p: string) => p === '/source/project1/.npmrc',
      );
      (fs.copyFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const dependencyGraph = createMockDependencyGraph([
        {
          projectDir: 'project1',
          packageJson: {
            name: 'project1',
            dependencies: { '@sap/cds': '6.1.3' },
            devDependencies: { '@sap/cds-dk': '6.0.0' },
          },
        },
      ]);

      // Should not throw and should still attempt npm install
      const result = cacheInstallDependencies(dependencyGraph, '/source', '/codeql');

      expect(childProcess.execFileSync).toHaveBeenCalledWith(
        'npm',
        ['install', '--quiet', '--no-audit', '--no-fund'],
        expect.any(Object),
      );
      expect(result.size).toBe(1);
    });

    it('should not copy .npmrc when no .npmrc file is found', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const dependencyGraph = createMockDependencyGraph([
        {
          projectDir: 'project1',
          packageJson: {
            name: 'project1',
            dependencies: { '@sap/cds': '6.1.3' },
            devDependencies: { '@sap/cds-dk': '6.0.0' },
          },
        },
      ]);

      cacheInstallDependencies(dependencyGraph, '/source', '/codeql');

      expect(fs.copyFileSync).not.toHaveBeenCalled();
    });

    it('should find .npmrc from the project that has one, not just the first project', () => {
      // Only project2 has an .npmrc; project1 does not
      (fs.existsSync as jest.Mock).mockImplementation(
        (p: string) => p === '/source/project2/.npmrc',
      );

      const dependencyGraph = createMockDependencyGraph([
        {
          projectDir: 'project1',
          packageJson: {
            name: 'project1',
            dependencies: { '@sap/cds': '6.1.3' },
            devDependencies: { '@sap/cds-dk': '6.0.0' },
          },
        },
        {
          projectDir: 'project2',
          packageJson: {
            name: 'project2',
            dependencies: { '@sap/cds': '6.1.3' },
            devDependencies: { '@sap/cds-dk': '6.0.0' },
          },
        },
      ]);

      cacheInstallDependencies(dependencyGraph, '/source', '/codeql');

      expect(fs.copyFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.npmrc'),
        expect.stringContaining('.npmrc'),
      );
    });

    it('should copy .npmrc even when the cache directory already exists', () => {
      // Simulate cache directory already existing but .npmrc present
      (fs.existsSync as jest.Mock).mockImplementation((p: string) => {
        if (p === '/source/project1/.npmrc') return true;
        // Cache root exists
        if (
          p.includes('.cds-extractor-cache') &&
          !p.includes('node_modules') &&
          !p.includes('.npmrc')
        )
          return true;
        return false;
      });

      const dependencyGraph = createMockDependencyGraph([
        {
          projectDir: 'project1',
          packageJson: {
            name: 'project1',
            dependencies: { '@sap/cds': '6.1.3' },
            devDependencies: { '@sap/cds-dk': '6.0.0' },
          },
        },
      ]);

      cacheInstallDependencies(dependencyGraph, '/source', '/codeql');

      // .npmrc should still be copied even though cache dir already exists
      expect(fs.copyFileSync).toHaveBeenCalledWith(
        '/source/project1/.npmrc',
        expect.stringContaining('.npmrc'),
      );
    });
  });
});
