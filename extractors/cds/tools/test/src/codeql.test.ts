import * as childProcess from 'child_process';

import { runJavaScriptExtractor } from '../../src/codeql';
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
        '/path/to/source',
      );
    });
  });
});
