import * as childProcess from 'child_process';
import * as path from 'path';

import { determineCdsCommand, compileCdsToJson } from '../../../src/cds/compiler';
import * as filesystem from '../../../src/filesystem';

// Mock dependencies
jest.mock('child_process', () => ({
  execFileSync: jest.fn(),
  spawnSync: jest.fn(),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
}));

jest.mock('path', () => ({
  resolve: jest.fn(),
  join: jest.fn(),
  relative: jest.fn(),
  delimiter: ':', // for Unix-like systems
}));

jest.mock('../../../src/filesystem', () => ({
  fileExists: jest.fn(),
  dirExists: jest.fn(),
  recursivelyRenameJsonFiles: jest.fn(),
}));

describe('cdsCompiler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('determineCdsCommand', () => {
    it('should return "cds" when cds command is available', () => {
      // Mock successful execution of "cds --version"
      (childProcess.execFileSync as jest.Mock).mockReturnValue(Buffer.from('4.6.0'));

      const result = determineCdsCommand();

      expect(result).toBe('cds');
      expect(childProcess.execFileSync).toHaveBeenCalledWith(
        'cds',
        ['--version'],
        expect.objectContaining({ stdio: 'ignore' }),
      );
    });

    it('should return "npx -y --package @sap/cds-dk cds" when cds command is not available', () => {
      // Mock error when executing "cds --version"
      (childProcess.execFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Command not found');
      });

      const result = determineCdsCommand();

      expect(result).toBe('npx -y --package @sap/cds-dk cds');
      expect(childProcess.execFileSync).toHaveBeenCalledWith(
        'cds',
        ['--version'],
        expect.objectContaining({ stdio: 'ignore' }),
      );
    });
  });

  describe('compileCdsToJson', () => {
    beforeEach(() => {
      // Mock path functions
      (path.resolve as jest.Mock).mockImplementation(p => `/resolved/${p}`);
      (path.join as jest.Mock).mockImplementation((...parts) => parts.join('/'));
      (path.relative as jest.Mock).mockImplementation((_from, _to) => 'relative/path');
    });

    it('should use --parse-csn flag for root CDS files in project-aware mode', () => {
      const cdsFilePath = '/path/to/main.cds';
      const sourceRoot = '/path/to';
      const cdsCommand = 'cds';
      const resolvedCdsPath = `/resolved/${cdsFilePath}`;
      const expectedJsonPath = `${resolvedCdsPath}.json`;

      // Create a test project map with main.cds as a root file
      const projectDir = 'test-project';
      const projectMap = new Map();
      const importsMap = new Map();
      importsMap.set('main.cds', [{ resolvedPath: 'imported-model.cds' }]);

      projectMap.set(projectDir, {
        projectDir,
        cdsFiles: ['main.cds', 'imported-model.cds'],
        imports: importsMap,
      });

      // Mock filesystem.fileExists to return true for CDS file
      (filesystem.fileExists as jest.Mock).mockImplementation(path => path === resolvedCdsPath);

      // Mock successful compilation
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 0,
        stderr: null,
        error: null,
      });

      // Mock that the output JSON file exists
      (filesystem.fileExists as jest.Mock).mockImplementation(
        path => path === resolvedCdsPath || path === expectedJsonPath,
      );

      // Mock that the output is not a directory
      (filesystem.dirExists as jest.Mock).mockReturnValue(false);

      // Call the function with project information
      const result = compileCdsToJson(
        cdsFilePath,
        sourceRoot,
        cdsCommand,
        undefined,
        projectMap,
        projectDir,
      );

      expect(result).toEqual({
        success: true,
        outputPath: expectedJsonPath,
        compiledAsProject: true,
      });

      // Check that --parse flag was added for root file
      expect(childProcess.spawnSync).toHaveBeenCalledWith(
        cdsCommand,
        [
          'compile',
          resolvedCdsPath,
          '--to',
          'json',
          '--dest',
          expectedJsonPath,
          '--locations',
          '--log-level',
          'warn',
          '--parse',
        ],
        expect.anything(),
      );
    });

    it('should successfully compile CDS file to JSON file', () => {
      const cdsFilePath = '/path/to/model.cds';
      const sourceRoot = '/path/to';
      const cdsCommand = 'cds';
      const resolvedCdsPath = `/resolved/${cdsFilePath}`;
      const expectedJsonPath = `${resolvedCdsPath}.json`;

      // Mock filesystem.fileExists to return true for CDS file
      (filesystem.fileExists as jest.Mock).mockImplementation(path => path === resolvedCdsPath);

      // Mock successful compilation
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 0,
        stderr: null,
        error: null,
      });

      // Mock that the output JSON file exists
      (filesystem.fileExists as jest.Mock).mockImplementation(
        path => path === resolvedCdsPath || path === expectedJsonPath,
      );

      // Mock that the output is not a directory
      (filesystem.dirExists as jest.Mock).mockReturnValue(false);

      const result = compileCdsToJson(cdsFilePath, sourceRoot, cdsCommand);

      expect(result).toEqual({
        success: true,
        outputPath: expectedJsonPath,
        compiledAsProject: false,
      });

      expect(childProcess.spawnSync).toHaveBeenCalledWith(
        cdsCommand,
        [
          'compile',
          resolvedCdsPath,
          '--to',
          'json',
          '--dest',
          expectedJsonPath,
          '--locations',
          '--log-level',
          'warn',
        ],
        expect.objectContaining({
          cwd: sourceRoot,
          shell: true,
          stdio: 'pipe',
        }),
      );
    });

    it('should handle CDS file that does not exist', () => {
      const cdsFilePath = '/path/to/nonexistent.cds';
      const sourceRoot = '/path/to';
      const cdsCommand = 'cds';
      const resolvedCdsPath = `/resolved/${cdsFilePath}`;

      // Mock filesystem.fileExists to return false for CDS file
      (filesystem.fileExists as jest.Mock).mockReturnValue(false);

      const result = compileCdsToJson(cdsFilePath, sourceRoot, cdsCommand);

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining(`Expected CDS file '${resolvedCdsPath}' does not exist.`),
      });

      expect(childProcess.spawnSync).not.toHaveBeenCalled();
    });

    it('should handle compilation errors', () => {
      const cdsFilePath = '/path/to/model.cds';
      const sourceRoot = '/path/to';
      const cdsCommand = 'cds';
      const resolvedCdsPath = `/resolved/${cdsFilePath}`;

      // Mock filesystem.fileExists to return true for CDS file
      (filesystem.fileExists as jest.Mock).mockImplementation(path => path === resolvedCdsPath);

      // Mock compilation failure
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 1,
        stderr: Buffer.from('Syntax error in CDS file'),
        error: null,
      });

      const result = compileCdsToJson(cdsFilePath, sourceRoot, cdsCommand);

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining('Could not compile the file'),
      });
    });

    it('should handle directory output and rename files', () => {
      const cdsFilePath = '/path/to/model.cds';
      const sourceRoot = '/path/to';
      const cdsCommand = 'cds';
      const resolvedCdsPath = `/resolved/${cdsFilePath}`;
      const expectedJsonPath = `${resolvedCdsPath}.json`;

      // Mock filesystem.fileExists to return true for CDS file
      (filesystem.fileExists as jest.Mock).mockImplementation(path => path === resolvedCdsPath);

      // Mock successful compilation
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 0,
        stderr: null,
        error: null,
      });

      // Mock that the output is a directory
      (filesystem.fileExists as jest.Mock).mockImplementation(path => path === resolvedCdsPath);
      (filesystem.dirExists as jest.Mock).mockImplementation(path => path === expectedJsonPath);

      const result = compileCdsToJson(cdsFilePath, sourceRoot, cdsCommand);

      expect(result).toEqual({
        success: true,
        outputPath: expectedJsonPath,
        compiledAsProject: false,
      });

      // Check if recursivelyRenameJsonFiles was called
      expect(filesystem.recursivelyRenameJsonFiles).toHaveBeenCalledWith(expectedJsonPath);
    });

    // This test is a duplicate of the first test case with the same name
    // The implementation above already tests this functionality

    // This test is a duplicate of the first test case with the same name
    // The implementation above already tests this functionality
  });
});
