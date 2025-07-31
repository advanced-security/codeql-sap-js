import * as childProcess from 'child_process';
import * as path from 'path';

import { globSync } from 'glob';

import { compileCdsToJson } from '../../../../src/cds/compiler';
import { getCdsVersion } from '../../../../src/cds/compiler/version';
import { BasicCdsProject } from '../../../../src/cds/parser/types';
import * as filesystem from '../../../../src/filesystem';

// Mock dependencies
jest.mock('child_process', () => ({
  execFileSync: jest.fn(),
  spawnSync: jest.fn(),
}));

jest.mock('path', () => {
  const original = jest.requireActual('path');
  return {
    ...original,
    resolve: jest.fn(),
    join: jest.fn(),
    relative: jest.fn(),
    delimiter: original.delimiter,
  };
});

jest.mock('../../../../src/filesystem', () => ({
  fileExists: jest.fn(),
  dirExists: jest.fn(),
  recursivelyRenameJsonFiles: jest.fn(),
}));

jest.mock('../../../../src/cds/compiler/version', () => ({
  getCdsVersion: jest.fn(),
}));

jest.mock('glob', () => ({
  globSync: jest.fn(),
}));

describe('compile .cds to .cds.json', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('compileCdsToJson', () => {
    beforeEach(() => {
      // Mock path functions
      (path.resolve as jest.Mock).mockImplementation(p => `/resolved/${p}`);
      (path.join as jest.Mock).mockImplementation((...parts) => parts.join('/'));
      (path.relative as jest.Mock).mockImplementation((_from, _to) => 'project/file.cds');

      // Default mocks for filesystem functions
      (filesystem.fileExists as jest.Mock).mockReturnValue(true);
      (filesystem.dirExists as jest.Mock).mockReturnValue(false);

      // Mock getCdsVersion to return a version
      (getCdsVersion as jest.Mock).mockReturnValue('7.0.0');
    });

    it('should return failure when input CDS file does not exist', () => {
      // Setup
      (filesystem.fileExists as jest.Mock).mockReturnValueOnce(false);

      // Create a basic project map for the test
      const projectMap = new Map<string, BasicCdsProject>();
      const projectDir = 'test-project';

      // Execute
      const result = compileCdsToJson(
        'test.cds',
        '/source/root',
        'cds',
        undefined,
        projectMap,
        projectDir,
      );

      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toContain('does not exist');
      expect(filesystem.fileExists).toHaveBeenCalledWith('/resolved/test.cds');
    });

    it('should successfully compile CDS to JSON file', () => {
      // Setup
      const expectedOutputPath = '/source/root/test-project/model.cds.json'; // Always model.cds.json per spec
      const relativeCdsPath = 'project/file.cds'; // This comes from the mocked path.relative

      // Create a basic project map for the test
      const projectMap = new Map<string, BasicCdsProject>();
      const projectDir = 'test-project';
      const project: BasicCdsProject = {
        cdsFiles: ['project/file.cds'],
        compilationTargets: ['project/file.cds'],
        expectedOutputFile: 'model.cds.json',
        projectDir,
      };
      projectMap.set(projectDir, project);

      // Mock successful spawn process
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 0,
        stdout: Buffer.from('Compilation successful'),
        stderr: Buffer.from(''),
      });

      // Execute
      const result = compileCdsToJson(
        'test.cds',
        '/source/root',
        'cds',
        undefined,
        projectMap,
        projectDir,
      );

      // Verify
      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(expectedOutputPath);
      expect(result.compiledAsProject).toBe(true);
      expect(result.message).toBe('Project was compiled using project-aware compilation');

      // Check that getCdsVersion was called first
      expect(getCdsVersion).toHaveBeenCalledWith('cds', undefined);

      // Check the compilation command
      expect(childProcess.spawnSync).toHaveBeenCalledWith(
        'cds',
        [
          'compile',
          relativeCdsPath,
          '--to',
          'json',
          '--dest',
          'model.cds.json', // Always model.cds.json per ProjectCompilationOnly spec
          '--locations',
          '--log-level',
          'warn',
        ],
        expect.objectContaining({
          cwd: '/source/root/test-project', // CRITICAL: Verify cwd is project base directory
        }),
      );
    });

    it('should ensure cwd is always project base directory for spawned processes', () => {
      // Setup
      const sourceRoot = '/my/source/root';
      const cacheDir = '/cache/dir';

      // Create a basic project map for the test
      const projectMap = new Map<string, BasicCdsProject>();
      const projectDir = 'test-project';
      const project: BasicCdsProject = {
        cdsFiles: ['project/file.cds'],
        compilationTargets: ['project/file.cds'],
        expectedOutputFile: 'model.cds.json',
        projectDir,
      };
      projectMap.set(projectDir, project);

      // Mock successful spawn process
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 0,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      });

      // Execute
      compileCdsToJson('test.cds', sourceRoot, 'cds', cacheDir, projectMap, projectDir);

      // Verify that all spawnSync calls use project base directory as cwd
      expect(childProcess.spawnSync).toHaveBeenCalledWith(
        'cds',
        expect.any(Array),
        expect.objectContaining({
          cwd: '/my/source/root/test-project', // CRITICAL: Must be project base directory to ensure correct path generation
        }),
      );
    });

    it('should handle compilation errors', () => {
      // Setup
      // Create a basic project map for the test
      const projectMap = new Map<string, BasicCdsProject>();
      const projectDir = 'test-project';
      const project: BasicCdsProject = {
        cdsFiles: ['project/file.cds'],
        compilationTargets: ['project/file.cds'],
        expectedOutputFile: 'model.cds.json',
        projectDir,
      };
      projectMap.set(projectDir, project);

      // Mock failed spawn process
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 1,
        stdout: Buffer.from(''),
        stderr: Buffer.from('Compilation failed with error'),
      });

      // Execute
      const result = compileCdsToJson(
        'test.cds',
        '/source/root',
        'cds',
        undefined,
        projectMap,
        projectDir,
      );

      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toContain('Could not compile');
      expect(result.message).toContain('Compilation failed with error');
    });

    it('should handle directory output and rename files', () => {
      // Setup
      const sourceRoot = '/source/root';
      const projectDir = 'test-project';
      const expectedOutputPath = `${sourceRoot}/${projectDir}/model.cds.json`;

      // Create a basic project map for the test
      const projectMap = new Map<string, BasicCdsProject>();
      const project: BasicCdsProject = {
        cdsFiles: ['test-project/file.cds'],
        compilationTargets: ['file.cds'],
        expectedOutputFile: 'model.cds.json',
        projectDir,
      };
      projectMap.set(projectDir, project);

      // Mock successful spawn process
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 0,
        stdout: Buffer.from('Compilation successful'),
        stderr: Buffer.from(''),
      });

      // Mock directory output instead of file
      (filesystem.fileExists as jest.Mock).mockImplementation(path => {
        if (path.includes('test.cds')) return true; // Source file exists
        if (path === expectedOutputPath) return false; // Output file does not exist
        return false;
      });
      (filesystem.dirExists as jest.Mock).mockImplementation(path => {
        if (path === expectedOutputPath) return true; // Output is a directory
        return false;
      });

      // Execute
      const result = compileCdsToJson(
        'test.cds',
        sourceRoot,
        'cds',
        undefined,
        projectMap,
        projectDir,
      );

      // Verify
      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(expectedOutputPath);
      expect(result.compiledAsProject).toBe(true);
      expect(result.message).toBe('Project was compiled using project-aware compilation');
      expect(filesystem.recursivelyRenameJsonFiles).toHaveBeenCalledWith(expectedOutputPath);
    });

    it('should use cache directory when provided', () => {
      // Setup
      const cacheDir = '/cache/dir';
      const sourceRoot = '/source/root';
      const nodePath = '/cache/dir/node_modules';
      const binPath = '/cache/dir/node_modules/.bin';

      // Create a basic project map for the test
      const projectMap = new Map<string, BasicCdsProject>();
      const projectDir = 'test-project';
      const project: BasicCdsProject = {
        cdsFiles: ['project/file.cds'],
        compilationTargets: ['project/file.cds'],
        expectedOutputFile: 'model.cds.json',
        projectDir,
      };
      projectMap.set(projectDir, project);

      // Mock successful spawn process
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 0,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      });

      // Execute
      compileCdsToJson('test.cds', sourceRoot, 'cds', cacheDir, projectMap, projectDir);

      // Verify
      expect(childProcess.spawnSync).toHaveBeenCalledWith(
        'cds',
        expect.any(Array),
        expect.objectContaining({
          cwd: '/source/root/test-project', // CRITICAL: Must be project base directory
          env: expect.objectContaining({
            NODE_PATH: expect.stringContaining(nodePath),
            PATH: expect.stringContaining(binPath),
          }),
        }),
      );
    });

    it('should handle project-aware compilation for root files', () => {
      // Setup
      const sourceRoot = '/source/root';
      const projectDir = 'project';
      const expectedOutputPath = `${sourceRoot}/${projectDir}/model.cds.json`;

      // Create project dependency map with the test file as a root file
      const projectMap = new Map();
      const projectInfo = {
        directory: projectDir,
        cdsFiles: ['project/test.cds', 'project/other.cds'],
        compilationTargets: ['test.cds', 'other.cds'],
        packageJsonPath: 'project/package.json',
        dependencies: new Map([['@sap/cds', '^7.0.0']]),
        dependents: [],
        projectDir,
      };
      projectMap.set(projectDir, projectInfo);

      // Mock successful spawn process
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 0,
        stdout: Buffer.from('Compilation successful'),
        stderr: Buffer.from(''),
      });

      // Mock file exists for the expected output
      (filesystem.fileExists as jest.Mock).mockImplementation(path => {
        if (path.includes('test.cds')) return true; // Source file exists
        if (path === expectedOutputPath) return true; // Output file exists
        return false;
      });

      // Execute
      const result = compileCdsToJson(
        'test.cds',
        sourceRoot,
        'cds',
        undefined,
        projectMap,
        projectDir,
      );

      // Verify
      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(expectedOutputPath);
      expect(result.compiledAsProject).toBe(true);

      expect(childProcess.spawnSync).toHaveBeenCalledWith(
        'cds',
        expect.arrayContaining([
          'compile',
          'test.cds',
          'other.cds',
          '--to',
          'json',
          '--dest',
          'model.cds.json',
        ]),
        expect.any(Object),
      );
    });

    it('should skip compilation for files imported by other files in project', () => {
      // Clear all mocks to ensure we're starting with a clean slate
      jest.clearAllMocks();

      // Setup
      const sourceRoot = '/source/root';
      const projectDir = 'project';
      const expectedOutputPath = `${sourceRoot}/${projectDir}/model.cds.json`;

      // Create project dependency map with the test file as an imported file
      const projectMap = new Map();
      const projectInfo = {
        projectDir,
        cdsFiles: ['project/root.cds', 'project/lib.cds'],
        compilationTargets: ['root.cds', 'lib.cds'], // All files get compiled at project level
        imports: new Map([['project/root.cds', [{ resolvedPath: 'project/lib.cds' }]]]),
      };
      projectMap.set(projectDir, projectInfo);

      // Mock successful spawn process
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 0,
        stdout: Buffer.from('Compilation successful'),
        stderr: Buffer.from(''),
      });

      // Mock file exists for the expected output
      (filesystem.fileExists as jest.Mock).mockImplementation(path => {
        if (path.includes('test.cds')) return true; // Source file exists
        if (path === expectedOutputPath) return true; // Output file exists
        return false;
      });

      // Execute
      const result = compileCdsToJson(
        'test.cds',
        sourceRoot,
        'cds',
        undefined,
        projectMap,
        projectDir,
      );

      // Verify
      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(expectedOutputPath);
      expect(result.compiledAsProject).toBe(true);
      expect(result.message).toContain('Project was compiled using project-aware compilation');

      // Verify that spawnSync WAS called for the project-level compile step
      expect(childProcess.spawnSync).toHaveBeenCalledWith(
        'cds',
        expect.arrayContaining(['compile']),
        expect.any(Object),
      );
    });

    it('should use project base directory as cwd for project-level compilation', () => {
      // Setup
      const sourceRoot = '/source/root';
      const projectDir = 'test-project';

      // Set up the path.relative mock
      (path.relative as jest.Mock).mockImplementation(() => 'test-project/test.cds');

      // Mock globSync to return CDS files for project-level compilation
      (globSync as jest.Mock).mockImplementation((pattern: string) => {
        if (pattern.includes('**/*.cds')) {
          return ['test-project/srv/service.cds', 'test-project/db/schema.cds'];
        }
        if (pattern.includes('*.cds')) {
          return [];
        }
        return [];
      });

      // Create project dependency map with project-level compilation marker
      const projectMap = new Map();
      const projectInfo = {
        projectDir,
        cdsFiles: ['test-project/srv/service.cds', 'test-project/db/schema.cds'],
        compilationTargets: ['__PROJECT_LEVEL_COMPILATION__'],
        imports: new Map(),
      };
      projectMap.set(projectDir, projectInfo);

      // Mock filesystem checks
      (filesystem.dirExists as jest.Mock).mockImplementation(path => {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        return path.includes('/db') || path.includes('/srv');
      });

      // Mock successful spawn process
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 0,
        stdout: Buffer.from('Compilation successful'),
        stderr: Buffer.from(''),
      });

      // Execute
      const result = compileCdsToJson(
        'test.cds',
        sourceRoot,
        'cds',
        undefined,
        projectMap,
        projectDir,
      );

      // Verify
      expect(result.success).toBe(true);
      expect(result.compiledAsProject).toBe(true);

      // CRITICAL: Verify that project-level compilation uses project base directory as cwd
      expect(childProcess.spawnSync).toHaveBeenCalledWith(
        'cds',
        expect.arrayContaining(['compile', 'db', 'srv']), // No project prefix needed
        expect.objectContaining({
          cwd: '/source/root/test-project', // CRITICAL: Must be project base directory
        }),
      );
    });

    it('should throw error when projectDir is not found in projectMap', () => {
      // Setup
      const projectMap = new Map<string, BasicCdsProject>();
      const projectDir = 'nonexistent-project';

      // Execute
      const result = compileCdsToJson(
        'test.cds',
        '/source/root',
        'cds',
        undefined,
        projectMap,
        projectDir,
      );

      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toContain(
        "Project directory 'nonexistent-project' not found in projectMap",
      );
    });

    it('should throw error when projectMap is null', () => {
      // Setup
      const projectMap = null as unknown as Map<string, BasicCdsProject>;
      const projectDir = 'test-project';

      // Execute
      const result = compileCdsToJson(
        'test.cds',
        '/source/root',
        'cds',
        undefined,
        projectMap,
        projectDir,
      );

      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toContain("Project directory 'test-project' not found in projectMap");
    });

    it('should throw error when projectDir is empty', () => {
      // Setup
      const projectMap = new Map<string, BasicCdsProject>();
      const projectDir = '';

      // Execute
      const result = compileCdsToJson(
        'test.cds',
        '/source/root',
        'cds',
        undefined,
        projectMap,
        projectDir,
      );

      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toContain("Project directory '' not found in projectMap");
    });

    it('should handle project-level compilation when project directory contains no CDS files', () => {
      // Setup
      const projectMap = new Map<string, BasicCdsProject>();
      const projectDir = 'test-project';
      const project: BasicCdsProject = {
        cdsFiles: [],
        compilationTargets: ['__PROJECT_LEVEL_COMPILATION__'],
        expectedOutputFile: 'model.cds.json',
        projectDir,
      };
      projectMap.set(projectDir, project);

      // Mock globSync to return no CDS files
      (globSync as jest.Mock).mockReturnValue([]);

      // Execute
      const result = compileCdsToJson(
        'test.cds',
        '/source/root',
        'cds',
        undefined,
        projectMap,
        projectDir,
      );

      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toContain(
        "Project directory 'test-project' does not contain any CDS files and cannot be compiled",
      );
    });

    it('should handle spawn sync error in root file compilation', () => {
      // Setup
      const projectMap = new Map<string, BasicCdsProject>();
      const projectDir = 'test-project';
      const project: BasicCdsProject = {
        cdsFiles: ['test-project/file.cds'],
        compilationTargets: ['test-project/file.cds'], // This file should be compiled individually
        expectedOutputFile: 'model.cds.json',
        projectDir,
      };
      projectMap.set(projectDir, project);

      // Set up path.relative to match the expectation
      (path.relative as jest.Mock).mockReturnValue('test-project/file.cds');

      // Mock spawn sync with error
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        error: new Error('Command not found'),
        status: null,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      });

      // Execute
      const result = compileCdsToJson(
        'test.cds',
        '/source/root',
        'cds',
        undefined,
        projectMap,
        projectDir,
      );

      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toContain('Error executing CDS compiler: Command not found');
    });

    it('should handle non-zero exit status in project-level compilation', () => {
      // Setup
      const projectMap = new Map<string, BasicCdsProject>();
      const projectDir = 'test-project';
      const project: BasicCdsProject = {
        cdsFiles: ['test-project/srv/service.cds'],
        compilationTargets: ['__PROJECT_LEVEL_COMPILATION__'],
        expectedOutputFile: 'model.cds.json',
        projectDir,
      };
      projectMap.set(projectDir, project);

      // Mock globSync to return CDS files
      (globSync as jest.Mock).mockImplementation((pattern: string) => {
        if (pattern.includes('**/*.cds')) {
          return ['test-project/srv/service.cds'];
        }
        return [];
      });

      // Mock dirExists to return true for srv directory
      (filesystem.dirExists as jest.Mock).mockReturnValue(true);

      // Mock spawn sync with non-zero exit status
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 1,
        stdout: Buffer.from('Compilation output'),
        stderr: Buffer.from('Compilation error'),
      });

      // Execute
      const result = compileCdsToJson(
        'test.cds',
        '/source/root',
        'cds',
        undefined,
        projectMap,
        projectDir,
      );

      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toContain('Could not compile the CAP project test-project');
      expect(result.message).toContain('Compilation error');
    });

    it('should handle missing output after successful project-level compilation', () => {
      // Setup
      const projectMap = new Map<string, BasicCdsProject>();
      const projectDir = 'test-project';
      const project: BasicCdsProject = {
        cdsFiles: ['test-project/srv/service.cds'],
        compilationTargets: ['__PROJECT_LEVEL_COMPILATION__'],
        expectedOutputFile: 'model.cds.json',
        projectDir,
      };
      projectMap.set(projectDir, project);

      // Mock globSync to return CDS files
      (globSync as jest.Mock).mockImplementation((pattern: string) => {
        if (pattern.includes('**/*.cds')) {
          return ['test-project/srv/service.cds'];
        }
        return [];
      });

      // Mock dirExists to return true for srv directory
      (filesystem.dirExists as jest.Mock).mockReturnValue(true);

      // Mock successful spawn process
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 0,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      });

      // Mock fileExists and dirExists to return false for output
      (filesystem.fileExists as jest.Mock).mockImplementation(path => {
        if (path.includes('test.cds')) return true; // Source file exists
        return false; // Output file does not exist
      });
      (filesystem.dirExists as jest.Mock).mockImplementation(path => {
        if (path.includes('srv')) return true; // Source directory exists
        return false; // Output directory does not exist
      });

      // Execute
      const result = compileCdsToJson(
        'test.cds',
        '/source/root',
        'cds',
        undefined,
        projectMap,
        projectDir,
      );

      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toContain("CAP project 'test-project' was not compiled to JSON");
    });

    it('should handle directory output in project-level compilation', () => {
      // Setup
      const projectMap = new Map<string, BasicCdsProject>();
      const projectDir = 'test-project';
      const project: BasicCdsProject = {
        cdsFiles: ['test-project/srv/service.cds'],
        compilationTargets: ['__PROJECT_LEVEL_COMPILATION__'],
        expectedOutputFile: 'model.cds.json',
        projectDir,
      };
      projectMap.set(projectDir, project);

      // Mock globSync to return CDS files
      (globSync as jest.Mock).mockImplementation((pattern: string) => {
        if (pattern.includes('**/*.cds')) {
          return ['test-project/srv/service.cds'];
        }
        return [];
      });

      // Mock dirExists to return true for srv directory and output directory
      (filesystem.dirExists as jest.Mock).mockImplementation(_path => {
        return true; // All directories exist
      });

      // Mock successful spawn process
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 0,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      });

      // Mock fileExists to return false for output file
      (filesystem.fileExists as jest.Mock).mockImplementation(path => {
        if (path.includes('test.cds')) return true; // Source file exists
        return false; // Output file does not exist (directory was created instead)
      });

      // Execute
      const result = compileCdsToJson(
        'test.cds',
        '/source/root',
        'cds',
        undefined,
        projectMap,
        projectDir,
      );

      // Verify
      expect(result.success).toBe(true);
      expect(result.compiledAsProject).toBe(true);
      expect(filesystem.recursivelyRenameJsonFiles).toHaveBeenCalled();
    });

    it('should handle missing output after successful root file compilation', () => {
      // Setup
      const projectMap = new Map<string, BasicCdsProject>();
      const projectDir = 'test-project';
      const project: BasicCdsProject = {
        cdsFiles: ['test-project/file.cds'],
        compilationTargets: ['test-project/file.cds'], // This file should be compiled individually
        expectedOutputFile: 'model.cds.json',
        projectDir,
      };
      projectMap.set(projectDir, project);

      // Set up path.relative to match the expectation
      (path.relative as jest.Mock).mockReturnValue('test-project/file.cds');

      // Mock successful spawn process
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 0,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      });

      // Mock fileExists and dirExists to return false for output
      (filesystem.fileExists as jest.Mock).mockImplementation(path => {
        if (path.includes('test.cds') && !path.includes('.json')) return true; // Source file exists
        return false; // Output file does not exist
      });
      (filesystem.dirExists as jest.Mock).mockReturnValue(false);

      // Execute
      const result = compileCdsToJson(
        'test.cds',
        '/source/root',
        'cds',
        undefined,
        projectMap,
        projectDir,
      );

      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toContain("CAP project 'test-project' was not compiled to JSON");
    });

    it('should handle direct binary execution with environment cleanup', () => {
      // Setup
      const projectMap = new Map<string, BasicCdsProject>();
      const projectDir = 'test-project';
      const project: BasicCdsProject = {
        cdsFiles: ['test-project/file.cds'],
        compilationTargets: ['test-project/file.cds'], // This file should be compiled individually
        expectedOutputFile: 'model.cds.json',
        projectDir,
      };
      projectMap.set(projectDir, project);

      // Set up path.relative to match the expectation
      (path.relative as jest.Mock).mockReturnValue('test-project/file.cds');

      // Set up environment variables that should be cleaned up
      process.env.NODE_PATH = '/original/node_path';
      process.env.npm_config_prefix = '/original/prefix';
      process.env.npm_config_global = 'true';
      process.env.CDS_HOME = '/original/cds_home';

      // Mock successful spawn process
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 0,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      });

      // Execute with direct binary command
      const result = compileCdsToJson(
        'test.cds',
        '/source/root',
        '/path/to/node_modules/.bin/cds',
        undefined,
        projectMap,
        projectDir,
      );

      // Verify
      expect(result.success).toBe(true);
      expect(result.compiledAsProject).toBe(true);

      // Verify that spawnSync was called with cleaned environment
      expect(childProcess.spawnSync).toHaveBeenCalledWith(
        '/path/to/node_modules/.bin/cds',
        expect.any(Array),
        expect.objectContaining({
          env: expect.not.objectContaining({
            NODE_PATH: expect.any(String),
            npm_config_prefix: expect.any(String),
            npm_config_global: expect.any(String),
            CDS_HOME: expect.any(String),
          }),
        }),
      );
    });

    it('should handle cache directory setup for non-direct binary commands', () => {
      // Setup
      const cacheDir = '/cache/dir';
      const projectMap = new Map<string, BasicCdsProject>();
      const projectDir = 'test-project';
      const project: BasicCdsProject = {
        cdsFiles: ['test-project/file.cds'],
        compilationTargets: ['test-project/file.cds'], // This file should be compiled individually
        expectedOutputFile: 'model.cds.json',
        projectDir,
      };
      projectMap.set(projectDir, project);

      // Set up path.relative to match the expectation
      (path.relative as jest.Mock).mockReturnValue('test-project/file.cds');

      // Mock successful spawn process
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 0,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      });

      // Execute with non-direct binary command and cache directory
      const result = compileCdsToJson(
        'test.cds',
        '/source/root',
        'cds',
        cacheDir,
        projectMap,
        projectDir,
      );

      // Verify
      expect(result.success).toBe(true);
      expect(result.compiledAsProject).toBe(true);

      // Verify that spawnSync was called with cache directory environment
      expect(childProcess.spawnSync).toHaveBeenCalledWith(
        'cds',
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({
            NODE_PATH: expect.stringContaining('/cache/dir/node_modules'),
            PATH: expect.stringContaining('/cache/dir/node_modules/.bin'),
            npm_config_prefix: '/cache/dir',
            npm_config_global: 'false',
            CDS_HOME: '/cache/dir',
          }),
        }),
      );
    });
  });
});
