import * as childProcess from 'child_process';

import { addCompilationDiagnostic, addJavaScriptExtractorDiagnostic } from '../../src/diagnostics';

// Mock dependencies
jest.mock('child_process', () => ({
  execFileSync: jest.fn(),
  spawnSync: jest.fn(),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
}));

jest.mock('../../src/filesystem', () => ({
  fileExists: jest.fn(),
  dirExists: jest.fn(),
  recursivelyRenameJsonFiles: jest.fn(),
}));

describe('diagnostics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addCompilationDiagnostic', () => {
    it('should add compilation diagnostic successfully', () => {
      const cdsFilePath = '/path/to/model.cds';
      const errorMessage = 'Syntax error in CDS file';
      const codeqlExePath = '/path/to/codeql';

      // Mock process.env to include necessary environment variable
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        CODEQL_EXTRACTOR_CDS_WIP_DATABASE: '/path/to/db',
      };

      // Mock successful execution
      (childProcess.execFileSync as jest.Mock).mockReturnValue(Buffer.from(''));

      const result = addCompilationDiagnostic(cdsFilePath, errorMessage, codeqlExePath);

      expect(result).toBe(true);
      expect(childProcess.execFileSync).toHaveBeenCalledWith(
        codeqlExePath,
        expect.arrayContaining([
          'database',
          'add-diagnostic',
          '--extractor-name=cds',
          '--ready-for-status-page',
          '--source-id=cds/compilation-failure',
          '--source-name=Failure to compile one or more SAP CAP CDS files',
          '--severity=error',
          `--markdown-message=${errorMessage}`,
          `--file-path=${cdsFilePath}`,
          '--',
          '/path/to/db',
        ]),
      );

      // Restore original environment
      process.env = originalEnv;
    });

    it('should handle errors when adding diagnostic', () => {
      const cdsFilePath = '/path/to/model.cds';
      const errorMessage = 'Syntax error in CDS file';
      const codeqlExePath = '/path/to/codeql';

      // Mock error during execution
      (childProcess.execFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Failed to add diagnostic');
      });

      // Mock console.error
      const originalConsoleError = console.error;
      console.error = jest.fn();

      const result = addCompilationDiagnostic(cdsFilePath, errorMessage, codeqlExePath);

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(
          `ERROR: Failed to add error diagnostic for source file=${cdsFilePath}`,
        ),
      );

      // Restore console.error
      console.error = originalConsoleError;
    });
  });

  describe('addJavaScriptExtractorDiagnostic', () => {
    it('should add JavaScript extractor diagnostic successfully', () => {
      const filePath = '/path/to/source/root';
      const errorMessage = 'JavaScript extractor failed';
      const codeqlExePath = '/path/to/codeql';

      // Mock process.env to include necessary environment variable
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        CODEQL_EXTRACTOR_CDS_WIP_DATABASE: '/path/to/db',
      };

      // Mock successful execution
      (childProcess.execFileSync as jest.Mock).mockReturnValue(Buffer.from(''));

      const result = addJavaScriptExtractorDiagnostic(filePath, errorMessage, codeqlExePath);

      expect(result).toBe(true);
      expect(childProcess.execFileSync).toHaveBeenCalledWith(
        codeqlExePath,
        expect.arrayContaining([
          'database',
          'add-diagnostic',
          '--extractor-name=cds',
          '--ready-for-status-page',
          '--source-id=cds/js-extractor-failure',
          '--severity=error',
          `--markdown-message=${errorMessage}`,
        ]),
      );

      // Restore original environment
      process.env = originalEnv;
    });
  });
});
