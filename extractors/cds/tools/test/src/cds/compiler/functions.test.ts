import * as childProcess from 'child_process';
import * as path from 'path';

import { determineCdsCommand, compileCdsToJson } from '../../../../src/cds/compiler/functions';
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

describe('cds compiler functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('determineCdsCommand', () => {
    it('should return "cds" when cds command is available', () => {
      // Mock successful execution of "cds --version"
      (childProcess.execFileSync as jest.Mock).mockImplementation(() => Buffer.from('4.6.0'));

      // Execute
      const result = determineCdsCommand();

      // Verify
      expect(result).toBe('cds');
      expect(childProcess.execFileSync).toHaveBeenCalledWith('cds', ['--version'], {
        stdio: 'ignore',
      });
    });

    it('should return "npx -y --package @sap/cds-dk cds" when cds command is not available', () => {
      // Mock failed execution of "cds --version"
      (childProcess.execFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Command not found');
      });

      // Execute
      const result = determineCdsCommand();

      // Verify
      expect(result).toBe('npx -y --package @sap/cds-dk cds');
      expect(childProcess.execFileSync).toHaveBeenCalledWith('cds', ['--version'], {
        stdio: 'ignore',
      });
    });
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
    });

    it('should return failure when input CDS file does not exist', () => {
      // Setup
      (filesystem.fileExists as jest.Mock).mockReturnValueOnce(false);

      // Execute
      const result = compileCdsToJson('test.cds', '/source/root', 'cds');

      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toContain('does not exist');
      expect(filesystem.fileExists).toHaveBeenCalledWith('/resolved/test.cds');
    });

    it('should successfully compile CDS to JSON file', () => {
      // Setup
      const resolvedCdsPath = '/resolved/test.cds';
      const cdsJsonOutPath = `${resolvedCdsPath}.json`;

      // Mock successful spawn process
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 0,
        stdout: Buffer.from('Compilation successful'),
        stderr: Buffer.from(''),
      });

      // Execute
      const result = compileCdsToJson('test.cds', '/source/root', 'cds');

      // Verify
      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(cdsJsonOutPath);
      expect(result.compiledAsProject).toBe(false);
      expect(childProcess.spawnSync).toHaveBeenCalledWith(
        'cds',
        expect.arrayContaining(['compile', resolvedCdsPath, '--to', 'json']),
        expect.any(Object),
      );
    });

    it('should handle compilation errors', () => {
      // Setup
      // Mock failed spawn process
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 1,
        stdout: Buffer.from(''),
        stderr: Buffer.from('Compilation failed with error'),
      });

      // Execute
      const result = compileCdsToJson('test.cds', '/source/root', 'cds');

      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toContain('Could not compile');
      expect(result.message).toContain('Compilation failed with error');
    });

    it('should handle directory output and rename files', () => {
      // Setup
      const resolvedCdsPath = '/resolved/test.cds';
      const cdsJsonOutPath = `${resolvedCdsPath}.json`;

      // Mock successful spawn process
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 0,
        stdout: Buffer.from('Compilation successful'),
        stderr: Buffer.from(''),
      });

      // Mock directory output instead of file
      (filesystem.fileExists as jest.Mock).mockImplementation(path => {
        if (path === resolvedCdsPath) return true;
        if (path === cdsJsonOutPath) return false;
        return true;
      });
      (filesystem.dirExists as jest.Mock).mockImplementation(path => {
        return path === cdsJsonOutPath;
      });

      // Execute
      const result = compileCdsToJson('test.cds', '/source/root', 'cds');

      // Verify
      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(cdsJsonOutPath);
      expect(filesystem.recursivelyRenameJsonFiles).toHaveBeenCalledWith(cdsJsonOutPath);
    });

    it('should use cache directory when provided', () => {
      // Setup
      const cacheDir = '/cache/dir';
      const nodePath = '/cache/dir/node_modules';
      const binPath = '/cache/dir/node_modules/.bin';

      // Mock successful spawn process
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 0,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      });

      // Execute
      compileCdsToJson('test.cds', '/source/root', 'cds', cacheDir);

      // Verify
      expect(childProcess.spawnSync).toHaveBeenCalledWith(
        'cds',
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({
            NODE_PATH: expect.stringContaining(nodePath),
            PATH: expect.stringContaining(binPath),
          }),
        }),
      );
    });

    it('should handle project-aware compilation for root files', () => {
      // Setup
      const resolvedCdsPath = '/resolved/test.cds';
      const cdsJsonOutPath = `${resolvedCdsPath}.json`;
      const sourceRoot = '/source/root';
      const projectDir = '/source/root/project';

      // Set up the path.relative mock for this test
      (path.relative as jest.Mock).mockImplementation(() => 'project/test.cds');

      // Create project dependency map with the test file as a root file
      const projectMap = new Map();
      const projectInfo = {
        projectDir,
        cdsFiles: ['project/test.cds', 'project/other.cds'],
        imports: new Map([['project/other.cds', [{ resolvedPath: 'project/lib.cds' }]]]),
      };
      projectMap.set(projectDir, projectInfo);

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
      expect(result.outputPath).toBe(cdsJsonOutPath);
      expect(result.compiledAsProject).toBe(true);

      // Verify the --parse flag was added for project compilation
      expect(childProcess.spawnSync).toHaveBeenCalledWith(
        'cds',
        expect.arrayContaining(['compile', resolvedCdsPath, '--to', 'json', '--parse']),
        expect.any(Object),
      );
    });

    it('should skip compilation for files imported by other files in project', () => {
      // Clear all mocks to ensure we're starting with a clean slate
      jest.clearAllMocks();

      // Setup
      const resolvedCdsPath = '/resolved/test.cds';
      const cdsJsonOutPath = `${resolvedCdsPath}.json`;
      const sourceRoot = '/source/root';
      const projectDir = '/source/root/project';

      // Set up the path.resolve mock to return our test path
      (path.resolve as jest.Mock).mockReturnValue(resolvedCdsPath);

      // Set up the path.relative mock for this test to return the path of an imported file
      (path.relative as jest.Mock).mockReturnValue('project/lib.cds');

      // Create project dependency map with the test file as an imported file
      const projectMap = new Map();
      const projectInfo = {
        projectDir,
        cdsFiles: ['project/root.cds', 'project/lib.cds'],
        imports: new Map([['project/root.cds', [{ resolvedPath: 'project/lib.cds' }]]]),
      };
      projectMap.set(projectDir, projectInfo);

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
      expect(result.outputPath).toBe(cdsJsonOutPath);
      expect(result.compiledAsProject).toBe(true);
      expect(result.message).toContain('part of a project-based compilation');

      // Verify that spawnSync was not called for the compile step
      expect(childProcess.spawnSync).not.toHaveBeenCalledWith(
        'cds',
        expect.arrayContaining(['compile']),
        expect.any(Object),
      );
    });
  });
});
