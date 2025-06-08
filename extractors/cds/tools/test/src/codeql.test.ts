import * as childProcess from 'child_process';
import * as fs from 'fs';

import { validateRequirements, runJavaScriptExtractor } from '../../src/codeql';
import { addJavaScriptExtractorDiagnostic } from '../../src/diagnostics';
import * as environment from '../../src/environment';

// Mock dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn(),
}));

jest.mock('child_process', () => ({
  spawnSync: jest.fn(),
}));

jest.mock('../../src/environment', () => ({
  getPlatformInfo: jest.fn(),
}));

jest.mock('../../src/diagnostics', () => ({
  addJavaScriptExtractorDiagnostic: jest.fn(),
}));

describe('codeql', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementation
    (environment.getPlatformInfo as jest.Mock).mockReturnValue({
      platform: 'darwin',
      arch: 'x64',
      isWindows: false,
      exeExtension: '',
    });
  });

  describe('validateRequirements', () => {
    it('should return true when all requirements are met', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const result = validateRequirements(
        '/path/to/source',
        '/path/to/codeql',
        '/path/to/response.file',
        '/path/to/autobuild.sh',
        '/path/to/jsextractor',
      );

      expect(result).toBe(true);
      // The implementation calls existsSync 4 times in total
      expect(fs.existsSync).toHaveBeenCalledTimes(4);
    });

    it('should return false when autobuild script does not exist', () => {
      // Mock existsSync to return false only for autobuild script
      (fs.existsSync as jest.Mock).mockImplementation(path => {
        return path !== '/path/to/autobuild.sh';
      });

      // Mock console.warn to avoid polluting test output
      const originalConsoleWarn = console.warn;
      console.warn = jest.fn();

      const result = validateRequirements(
        '/path/to/source',
        '/path/to/codeql',
        '/path/to/response.file',
        '/path/to/autobuild.sh',
        '/path/to/jsextractor',
      );

      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("autobuild script '/path/to/autobuild.sh' does not exist"),
      );

      // Restore console.warn
      console.warn = originalConsoleWarn;
    });

    it('should return false and report all missing requirements', () => {
      // Mock existsSync to return false for all paths
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Mock console.warn to avoid polluting test output
      const originalConsoleWarn = console.warn;
      console.warn = jest.fn();

      const result = validateRequirements(
        '/path/to/source',
        '/path/to/codeql',
        '/path/to/response.file',
        '/path/to/autobuild.sh',
        '', // Empty JS extractor root
      );

      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("autobuild script '/path/to/autobuild.sh' does not exist"),
      );
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("codeql executable '/path/to/codeql' does not exist"),
      );
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("response file '/path/to/response.file' does not exist"),
      );
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("project root directory '/path/to/source' does not exist"),
      );
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('CODEQL_EXTRACTOR_JAVASCRIPT_ROOT environment variable is not set'),
      );

      // Restore console.warn
      console.warn = originalConsoleWarn;
    });
  });

  describe('runJavaScriptExtractor', () => {
    it('should successfully run JavaScript extractor', () => {
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 0,
        error: null,
      });

      const result = runJavaScriptExtractor(
        '/path/to/source',
        '/path/to/autobuild.sh',
        '/path/to/codeql',
      );

      expect(result).toEqual({ success: true });
      expect(childProcess.spawnSync).toHaveBeenCalledWith(
        '/path/to/autobuild.sh',
        [],
        expect.objectContaining({
          cwd: '/path/to/source',
          env: process.env,
          shell: true,
          stdio: 'inherit',
        }),
      );
    });

    it('should handle JavaScript extractor execution error', () => {
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        error: new Error('Failed to execute'),
        status: null,
      });

      const result = runJavaScriptExtractor(
        '/path/to/source',
        '/path/to/autobuild.sh',
        '/path/to/codeql',
      );

      expect(result).toEqual({
        success: false,
        error: 'Error running JavaScript extractor: Failed to execute',
      });
    });

    it('should handle JavaScript extractor non-zero exit code', () => {
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        error: null,
        status: 1,
      });

      const result = runJavaScriptExtractor(
        '/path/to/source',
        '/path/to/autobuild.sh',
        '/path/to/codeql',
      );

      expect(result).toEqual({
        success: false,
        error: 'JavaScript extractor failed with exit code 1',
      });
    });

    it('should add diagnostic when JavaScript extractor fails with CodeQL path provided', () => {
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        error: new Error('Failed to execute'),
        status: null,
      });

      const codeqlPath = '/path/to/codeql';
      const result = runJavaScriptExtractor('/path/to/source', '/path/to/autobuild.sh', codeqlPath);

      expect(result).toEqual({
        success: false,
        error: 'Error running JavaScript extractor: Failed to execute',
      });

      expect(addJavaScriptExtractorDiagnostic).toHaveBeenCalledWith(
        '/path/to/source',
        'Error running JavaScript extractor: Failed to execute',
        codeqlPath,
      );
    });
  });
});
