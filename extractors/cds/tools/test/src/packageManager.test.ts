import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { addPackageJsonParsingDiagnostic } from '../../src/diagnostics';
import {
  findPackageJsonDirs,
  installDependencies,
  extractUniqueDependencyCombinations,
} from '../../src/packageManager';

// Mock dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  dirname: jest.fn(),
  join: jest.fn((dir, file) => `${dir}/${file}`),
  resolve: jest.fn((...paths) => paths.join('/')),
}));

jest.mock('child_process', () => ({
  execFileSync: jest.fn(),
}));

jest.mock('../../src/diagnostics', () => ({
  addDependencyDiagnostic: jest.fn(),
  addPackageJsonParsingDiagnostic: jest.fn(),
}));

describe('packageManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findPackageJsonDirs', () => {
    // Helper functions to create cleaner tests
    const setupMockDirectoryStructure = (dirStructure: Record<string, string>) => {
      // Mock implementation for dirname to simulate specific directory structure
      (path.dirname as jest.Mock).mockImplementation((p: string) => {
        return dirStructure[p] || p; // Return mapped parent or same path
      });

      // Mock join to concatenate paths
      (path.join as jest.Mock).mockImplementation((dir: string, file: string) => `${dir}/${file}`);

      // Default resolve implementation
      (path.resolve as jest.Mock).mockImplementation((p: string) => p);
    };

    const setupMockPackageJson = (pathsAndContents: Record<string, unknown>) => {
      // Mock existsSync to check specific paths
      (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
        return Object.prototype.hasOwnProperty.call(pathsAndContents, path);
      });

      // Mock readFileSync to return specified content
      (fs.readFileSync as jest.Mock).mockImplementation((path: string) => {
        if (pathsAndContents[path] === 'invalid-json') {
          return 'invalid-json';
        }
        return JSON.stringify(pathsAndContents[path]);
      });
    };

    beforeEach(() => {
      // Mock join to concatenate paths by default
      (path.join as jest.Mock).mockImplementation((dir: string, file: string) => `${dir}/${file}`);
    });

    it('should find directories with package.json containing @sap/cds dependency', () => {
      // Setup directory structure
      const dirStructure = {
        '/project/src/file1.cds': '/project/src',
        '/project/src': '/project',
        '/project/src/file2.cds': '/project/src',
        '/project': '/',
      };
      setupMockDirectoryStructure(dirStructure);

      // Setup package.json files
      const packageJsonFiles = {
        '/project/package.json': {
          name: 'test-project',
          dependencies: {
            '@sap/cds': '4.0.0',
          },
        },
      };
      setupMockPackageJson(packageJsonFiles);

      const filePaths = ['/project/src/file1.cds', '/project/src/file2.cds'];
      const result = findPackageJsonDirs(filePaths, '/mock/codeql');

      expect(result.size).toBe(1);
      expect(Array.from(result)[0]).toBe('/project');
    });

    it('should not include directories without @sap/cds dependency', () => {
      // Setup directory structure for various non-CDS package.json scenarios
      const dirStructure = {
        '/project-no-deps/file.cds': '/project-no-deps',
        '/project-empty-deps/file.cds': '/project-empty-deps',
        '/project-other-deps/file.cds': '/project-other-deps',
        '/project-dev-deps/file.cds': '/project-dev-deps',
        '/project-no-deps': '/',
        '/project-empty-deps': '/',
        '/project-other-deps': '/',
        '/project-dev-deps': '/',
      };
      setupMockDirectoryStructure(dirStructure);

      // Different package.json files without @sap/cds dependency
      const packageJsonFiles = {
        '/project-no-deps/package.json': {
          name: 'test-project-no-deps',
          // No dependencies at all
        },
        '/project-empty-deps/package.json': {
          name: 'test-project-empty-deps',
          dependencies: {},
        },
        '/project-other-deps/package.json': {
          name: 'test-project-other-deps',
          dependencies: {
            'other-package': '1.0.0',
          },
        },
        '/project-dev-deps/package.json': {
          name: 'test-project-dev-deps',
          // @sap/cds in devDependencies shouldn't count
          devDependencies: {
            '@sap/cds': '4.0.0',
          },
        },
      };
      setupMockPackageJson(packageJsonFiles);

      const filePaths = [
        '/project-no-deps/file.cds',
        '/project-empty-deps/file.cds',
        '/project-other-deps/file.cds',
        '/project-dev-deps/file.cds',
      ];
      const result = findPackageJsonDirs(filePaths, '/mock/codeql');

      expect(result.size).toBe(0);
    });

    it('should handle JSON parse errors gracefully', () => {
      const dirStructure = {
        '/project/file.cds': '/project',
        '/project': '/',
      };
      setupMockDirectoryStructure(dirStructure);

      const packageJsonFiles = {
        '/project/package.json': 'invalid-json',
      };
      setupMockPackageJson(packageJsonFiles);

      // Mock console.warn
      const originalConsoleWarn = console.warn;
      console.warn = jest.fn();

      const filePaths = ['/project/file.cds'];
      const mockCodeqlPath = '/mock/codeql';
      const result = findPackageJsonDirs(filePaths, mockCodeqlPath);

      expect(result.size).toBe(0);
      expect(console.warn).toHaveBeenCalled();
      expect(addPackageJsonParsingDiagnostic).toHaveBeenCalledWith(
        '/project/package.json',
        expect.any(String),
        mockCodeqlPath,
      );

      // Restore console.warn
      console.warn = originalConsoleWarn;
    });

    it('should detect package.json in the source root directory', () => {
      // Setup directory structure with file in source root
      const dirStructure = {
        '/source-root/file.cds': '/source-root',
        '/source-root': '/',
      };
      setupMockDirectoryStructure(dirStructure);

      const packageJsonFiles = {
        '/source-root/package.json': {
          name: 'root-project',
          dependencies: {
            '@sap/cds': '5.0.0',
          },
        },
      };
      setupMockPackageJson(packageJsonFiles);

      const filePaths = ['/source-root/file.cds'];
      const result = findPackageJsonDirs(filePaths, '/mock/codeql');

      expect(result.size).toBe(1);
      expect(Array.from(result)[0]).toBe('/source-root');
    });

    it('should not look for package.json above the source root directory', () => {
      // Setup directory structure with parent above source root
      const dirStructure = {
        '/source-root/subdir/file.cds': '/source-root/subdir',
        '/source-root/subdir': '/source-root',
        '/source-root': '/',
      };
      setupMockDirectoryStructure(dirStructure);

      // Package.json in source root and above it
      const packageJsonFiles = {
        '/source-root/package.json': {
          name: 'root-project',
          dependencies: {
            '@sap/cds': '5.0.0',
          },
        },
        '/package.json': {
          name: 'parent-project',
          dependencies: {
            '@sap/cds': '5.0.0',
          },
        },
      };
      setupMockPackageJson(packageJsonFiles);

      const filePaths = ['/source-root/subdir/file.cds'];
      const sourceRoot = '/source-root';
      const result = findPackageJsonDirs(filePaths, '/mock/codeql', sourceRoot);

      // Should only find the package.json in source root, not the one above it
      expect(result.size).toBe(1);
      expect(Array.from(result)[0]).toBe('/source-root');
    });

    it('should find multiple sub-projects under a common source root', () => {
      // Setup complex directory structure with multiple projects
      const dirStructure = {
        '/source-root/project1/src/file1.cds': '/source-root/project1/src',
        '/source-root/project1/src': '/source-root/project1',
        '/source-root/project1': '/source-root',

        '/source-root/project2/src/file2.cds': '/source-root/project2/src',
        '/source-root/project2/src': '/source-root/project2',
        '/source-root/project2': '/source-root',

        '/source-root/non-cds-project/file3.cds': '/source-root/non-cds-project',
        '/source-root/non-cds-project': '/source-root',

        '/source-root': '/',
      };
      setupMockDirectoryStructure(dirStructure);

      // Multiple package.json files with different contents
      const packageJsonFiles = {
        // Root project with @sap/cds
        '/source-root/package.json': {
          name: 'root-project',
          dependencies: {
            '@sap/cds': '5.0.0',
          },
        },
        // Subproject 1 with @sap/cds
        '/source-root/project1/package.json': {
          name: 'project1',
          dependencies: {
            '@sap/cds': '4.5.0',
          },
        },
        // Subproject 2 with @sap/cds
        '/source-root/project2/package.json': {
          name: 'project2',
          dependencies: {
            '@sap/cds': '4.7.0',
          },
        },
        // Non-CDS project
        '/source-root/non-cds-project/package.json': {
          name: 'non-cds-project',
          dependencies: {
            'other-dep': '1.0.0',
          },
        },
      };
      setupMockPackageJson(packageJsonFiles);

      // Test with files from all projects
      const filePaths = [
        '/source-root/project1/src/file1.cds',
        '/source-root/project2/src/file2.cds',
        '/source-root/non-cds-project/file3.cds',
      ];
      const sourceRoot = '/source-root';
      const result = findPackageJsonDirs(filePaths, '/mock/codeql', sourceRoot);

      // Should find three CDS projects (root + two subprojects)
      expect(result.size).toBe(3);
      expect(Array.from(result).sort()).toEqual(
        ['/source-root', '/source-root/project1', '/source-root/project2'].sort(),
      );
    });

    it('should detect a source root that is not a CDS project itself', () => {
      // Setup directory structure where source root doesn't have @sap/cds
      const dirStructure = {
        '/source-root/project1/src/file1.cds': '/source-root/project1/src',
        '/source-root/project1/src': '/source-root/project1',
        '/source-root/project1': '/source-root',
        '/source-root': '/',
      };
      setupMockDirectoryStructure(dirStructure);

      const packageJsonFiles = {
        // Root project WITHOUT @sap/cds
        '/source-root/package.json': {
          name: 'root-project',
          dependencies: {
            'other-dep': '1.0.0',
          },
        },
        // Subproject with @sap/cds
        '/source-root/project1/package.json': {
          name: 'project1',
          dependencies: {
            '@sap/cds': '4.5.0',
          },
        },
      };
      setupMockPackageJson(packageJsonFiles);

      const filePaths = ['/source-root/project1/src/file1.cds'];
      const sourceRoot = '/source-root';
      const result = findPackageJsonDirs(filePaths, '/mock/codeql', sourceRoot);

      // Should only find the subproject, not the root
      expect(result.size).toBe(1);
      expect(Array.from(result)[0]).toBe('/source-root/project1');
    });

    it('should handle edge case with no existing package.json files', () => {
      // Setup directory structure with no package.json
      const dirStructure = {
        '/source-root/file.cds': '/source-root',
        '/source-root': '/',
      };
      setupMockDirectoryStructure(dirStructure);

      // No package.json files exist
      setupMockPackageJson({});

      const filePaths = ['/source-root/file.cds'];
      const sourceRoot = '/source-root';
      const result = findPackageJsonDirs(filePaths, '/mock/codeql', sourceRoot);

      // Should find no projects
      expect(result.size).toBe(0);
    });
  });

  describe('extractUniqueDependencyCombinations', () => {
    it('should extract unique dependency combinations from projects', () => {
      // Setup mock projects with different dependency combinations
      const projectMap = new Map();
      projectMap.set('project1', {
        packageJson: {
          dependencies: {
            '@sap/cds': '1.0.0',
            '@sap/cds-dk': '1.0.0',
          },
        },
      });

      projectMap.set('project2', {
        packageJson: {
          dependencies: {
            '@sap/cds': '1.0.0',
            '@sap/cds-dk': '1.0.0',
          },
        },
      });

      projectMap.set('project3', {
        packageJson: {
          dependencies: {
            '@sap/cds': '2.0.0',
            '@sap/cds-dk': '2.0.0',
          },
        },
      });

      projectMap.set('project-no-deps', {
        packageJson: {
          dependencies: {},
        },
      });

      projectMap.set('project-no-package', {});

      const result = extractUniqueDependencyCombinations(projectMap);

      // Should extract 3 unique combinations - the two explicit ones plus one for 'latest'
      expect(result.length).toBe(3);

      // First combination should be for CDS 1.0.0
      expect(result.find(c => c.cdsVersion === '1.0.0')).toBeDefined();

      // Second combination should be for CDS 2.0.0
      expect(result.find(c => c.cdsVersion === '2.0.0')).toBeDefined();

      // Third combination should be for CDS latest
      expect(result.find(c => c.cdsVersion === 'latest')).toBeDefined();
    });

    it('should handle devDependencies as well as dependencies', () => {
      // Setup mock projects with dependencies in different locations
      const projectMap = new Map();
      projectMap.set('project-dev-deps', {
        packageJson: {
          devDependencies: {
            '@sap/cds': '3.0.0',
            '@sap/cds-dk': '3.0.0',
          },
        },
      });

      projectMap.set('project-mixed-deps', {
        packageJson: {
          dependencies: {
            '@sap/cds': '4.0.0',
          },
          devDependencies: {
            '@sap/cds-dk': '4.0.0',
          },
        },
      });

      const result = extractUniqueDependencyCombinations(projectMap);

      // Should extract 2 unique combinations
      expect(result.length).toBe(2);

      // Should find the devDependencies version
      expect(result.find(c => c.cdsVersion === '3.0.0')).toBeDefined();

      // Should find the mixed dependencies version
      expect(result.find(c => c.cdsVersion === '4.0.0')).toBeDefined();
    });

    it('should return default latest combination when no projects have dependencies', () => {
      // Setup mock projects with no CDS dependencies
      const projectMap = new Map();
      projectMap.set('project-empty', {
        packageJson: {
          dependencies: {},
        },
      });

      projectMap.set('project-other-deps', {
        packageJson: {
          dependencies: {
            'some-other-package': '1.0.0',
          },
        },
      });

      const result = extractUniqueDependencyCombinations(projectMap);

      // Should return one default combination
      expect(result.length).toBe(1);
      expect(result[0].cdsVersion).toBe('latest');
      expect(result[0].cdsDkVersion).toBe('latest');
      expect(result[0].hash).toBeDefined();
    });

    it('should return default latest combination when projectMap is empty', () => {
      const projectMap = new Map();
      const result = extractUniqueDependencyCombinations(projectMap);

      // Should return one default combination
      expect(result.length).toBe(1);
      expect(result[0].cdsVersion).toBe('latest');
      expect(result[0].cdsDkVersion).toBe('latest');
    });
  });

  describe('installDependencies', () => {
    it('should install dependencies using the cache strategy', () => {
      // Setup mock filesystem with package.json files
      const projectMap = new Map();
      projectMap.set('project1', {
        projectDir: 'project1',
        packageJson: {
          name: 'project1',
          dependencies: {
            '@sap/cds': '1.0.0',
            '@sap/cds-dk': '1.0.0',
          },
        },
      });

      projectMap.set('project2', {
        projectDir: 'project2',
        packageJson: {
          name: 'project2',
          dependencies: {
            '@sap/cds': '1.0.0',
            '@sap/cds-dk': '1.0.0',
          },
        },
      });

      const sourceRoot = '/source-root';
      const mockCodeqlPath = '/mock/codeql';

      // Mock filesystem functions
      (fs.existsSync as jest.Mock).mockImplementation(path => {
        // Check for cache directory
        if (path === '/source-root/.cds-extractor-cache') return false;
        // Return false for node_modules to force npm install
        if (path.includes('node_modules')) return false;
        return true;
      });

      // Mock the cache directory creation
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});

      // Mock filesystem write
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      // Call the function
      const result = installDependencies(projectMap, sourceRoot, mockCodeqlPath);

      // Should return a map with the project to cache directory mapping
      expect(result).toBeDefined();
      expect(result instanceof Map).toBe(true);

      // Verify mkdir was called for the cache directory
      expect(fs.mkdirSync).toHaveBeenCalled();

      // Verify npm install was called for the cache
      expect(childProcess.execFileSync).toHaveBeenCalledWith(
        'npm',
        ['install', '--quiet', '--no-audit', '--no-fund'],
        expect.anything(),
      );
    });

    it('should log warning when no projects are found', () => {
      const projectMap = new Map();
      const sourceRoot = '/source-root';

      // Mock console.warn
      const originalConsoleWarn = console.warn;
      console.warn = jest.fn();

      installDependencies(projectMap, sourceRoot);

      expect(childProcess.execFileSync).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith(
        'WARN: failed to detect any CDS projects for dependency installation.',
      );

      // Restore console.warn
      console.warn = originalConsoleWarn;
    });

    it('should handle cache reuse for existing dependencies', () => {
      // Setup mock project map
      const projectMap = new Map();
      projectMap.set('project1', {
        projectDir: 'project1',
        packageJson: {
          name: 'project1',
          dependencies: {
            '@sap/cds': '1.0.0',
            '@sap/cds-dk': '1.0.0',
          },
        },
      });

      const sourceRoot = '/source-root';

      // Mock that the cache directory and node_modules already exist
      (fs.existsSync as jest.Mock).mockImplementation(() => {
        return true;
      });

      // Call the function
      const result = installDependencies(projectMap, sourceRoot);

      // Should return a map with the project to cache directory mapping
      expect(result).toBeDefined();
      expect(result instanceof Map).toBe(true);

      // Verify npm install was not called since cache exists
      expect(childProcess.execFileSync).not.toHaveBeenCalled();
    });

    it('should handle projects with no CDS dependencies', () => {
      // Setup mock project map with no explicit CDS dependencies
      const projectMap = new Map();
      projectMap.set('project-no-deps', {
        projectDir: 'project-no-deps',
        packageJson: {
          name: 'project-no-deps',
          dependencies: {
            'some-other-dep': '1.0.0',
          },
        },
      });

      const sourceRoot = '/source-root';

      // Mock existsSync to allow cache dir creation but reject node_modules
      (fs.existsSync as jest.Mock).mockImplementation(path => {
        if (!path) return false;
        // The cache directory doesn't exist yet
        if (path === '/source-root/.cds-extractor-cache') return false;
        // Any cache subdirectory doesn't exist yet
        if (typeof path === 'string' && path.startsWith('/source-root/.cds-extractor-cache/'))
          return false;
        // Node modules don't exist to force npm install
        if (typeof path === 'string' && path.includes('node_modules')) return false;
        // Everything else exists
        return true;
      });

      // Mock console.log and console.warn to avoid test noise
      const originalConsoleLog = console.log;
      const originalConsoleWarn = console.warn;
      console.log = jest.fn();
      console.warn = jest.fn();

      // Call the function
      const result = installDependencies(projectMap, sourceRoot);

      // Should return a map with the project mapped to cache directory with 'latest' versions
      expect(result.size).toBe(1);

      // Verify fs.mkdirSync was called
      expect(fs.mkdirSync).toHaveBeenCalled();

      // Verify writeFileSync was called with a package.json containing latest versions
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"@sap/cds": "latest"'),
      );

      // Verify npm install was called
      expect(childProcess.execFileSync).toHaveBeenCalledWith(
        'npm',
        ['install', '--quiet', '--no-audit', '--no-fund'],
        expect.anything(),
      );

      // Restore console.log and console.warn
      console.log = originalConsoleLog;
      console.warn = originalConsoleWarn;
    });
  });
});
