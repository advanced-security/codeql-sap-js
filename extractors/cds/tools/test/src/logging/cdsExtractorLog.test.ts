import { cdsExtractorLog, setSourceRootDirectory } from '../../../src/logging';

// Mock console functions to test output
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('cdsExtractorLog', () => {
  beforeEach(() => {
    // Clear all mock calls before each test
    mockConsoleLog.mockClear();
    mockConsoleWarn.mockClear();
    mockConsoleError.mockClear();

    // Reset source root directory to a known state
    setSourceRootDirectory('/test/source-root');
  });

  afterAll(() => {
    // Restore original console functions
    mockConsoleLog.mockRestore();
    mockConsoleWarn.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('basic log level functionality', () => {
    it('should log info messages to console.log with INFO prefix', () => {
      cdsExtractorLog('info', 'Test info message');

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith('INFO: Test info message');
    });

    it('should log debug messages to console.log with DEBUG prefix', () => {
      cdsExtractorLog('debug', 'Test debug message');

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith('DEBUG: Test debug message');
    });

    it('should log warn messages to console.warn with WARN prefix', () => {
      cdsExtractorLog('warn', 'Test warning message');

      expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
      expect(mockConsoleWarn).toHaveBeenCalledWith('WARN: Test warning message');
    });

    it('should log error messages to console.error with ERROR prefix', () => {
      cdsExtractorLog('error', 'Test error message');

      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledWith('ERROR: Test error message');
    });
  });

  describe('message formatting', () => {
    it('should handle multiple arguments like console.log', () => {
      cdsExtractorLog('info', 'Multiple', 'arguments', 123, { key: 'value' });

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith('INFO: Multiple', 'arguments', 123, {
        key: 'value',
      });
    });

    it('should handle Error objects', () => {
      const error = new Error('Test error');
      cdsExtractorLog('error', error);

      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledWith('ERROR: ', error);
    });

    it('should handle empty messages', () => {
      cdsExtractorLog('info', '');

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith('INFO: ');
    });
  });

  describe('path filtering for source root directory', () => {
    beforeEach(() => {
      setSourceRootDirectory('/my/source-root');
    });

    it('should allow source root directory logging message to pass through unchanged', () => {
      const message = 'CDS extractor source root directory: /my/source-root';
      cdsExtractorLog('info', message);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'INFO: CDS extractor source root directory: /my/source-root',
      );
    });

    it('should filter absolute paths to relative paths within source root', () => {
      const message = 'Processing file at /my/source-root/project1/service.cds';
      cdsExtractorLog('info', message);

      expect(mockConsoleLog).toHaveBeenCalledWith('INFO: Processing file at project1/service.cds');
    });

    it('should filter absolute paths with trailing slash on source root', () => {
      setSourceRootDirectory('/my/source-root/');
      const message = 'Processing file at /my/source-root/project1/service.cds';
      cdsExtractorLog('info', message);

      expect(mockConsoleLog).toHaveBeenCalledWith('INFO: Processing file at project1/service.cds');
    });

    it('should handle multiple paths in the same message', () => {
      const message = 'Copying from /my/source-root/src/file.cds to /my/source-root/dist/file.cds';
      cdsExtractorLog('info', message);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'INFO: Copying from src/file.cds to dist/file.cds',
      );
    });

    it('should handle paths that do not start with source root directory', () => {
      const message = 'External file at /other/path/file.cds';
      cdsExtractorLog('warn', message);

      expect(mockConsoleWarn).toHaveBeenCalledWith('WARN: External file at /other/path/file.cds');
    });

    it('should handle relative paths without modification', () => {
      const message = 'Processing relative file at project1/service.cds';
      cdsExtractorLog('info', message);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'INFO: Processing relative file at project1/service.cds',
      );
    });

    it('should handle messages without paths', () => {
      const message = 'Starting compilation process';
      cdsExtractorLog('info', message);

      expect(mockConsoleLog).toHaveBeenCalledWith('INFO: Starting compilation process');
    });

    it('should filter paths in complex messages', () => {
      const message =
        'Potential problem with CDS file at expected path /my/source-root/project1/service.cds';
      cdsExtractorLog('warn', message);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'WARN: Potential problem with CDS file at expected path project1/service.cds',
      );
    });
  });

  describe('edge cases', () => {
    it('should throw error when source root directory is undefined', () => {
      setSourceRootDirectory(undefined as unknown as string);

      expect(() => {
        cdsExtractorLog('info', 'Test message with /some/path');
      }).toThrow('Source root directory is not set. Call setSourceRootDirectory() first.');
    });

    it('should throw error when source root directory is empty', () => {
      setSourceRootDirectory('');

      expect(() => {
        cdsExtractorLog('info', 'Test message with /some/path');
      }).toThrow('Source root directory is not set. Call setSourceRootDirectory() first.');
    });

    it('should handle non-string message arguments', () => {
      setSourceRootDirectory('/test/source-root');
      cdsExtractorLog('info', 123, true, null, undefined);

      expect(mockConsoleLog).toHaveBeenCalledWith('INFO: ', 123, true, null, undefined);
    });

    it('should throw error for invalid log level', () => {
      setSourceRootDirectory('/test/source-root');
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cdsExtractorLog('invalid' as any, 'test message');
      }).toThrow('Invalid log level: invalid');
    });
  });

  describe('setSourceRootDirectory function', () => {
    it('should allow setting and updating source root directory', () => {
      setSourceRootDirectory('/new/source-root');
      const message = 'File at /new/source-root/test.cds';
      cdsExtractorLog('info', message);

      expect(mockConsoleLog).toHaveBeenCalledWith('INFO: File at test.cds');
    });

    it('should normalize source root directory with trailing slash', () => {
      setSourceRootDirectory('/test/root/');
      const message = 'File at /test/root/subfolder/test.cds';
      cdsExtractorLog('info', message);

      expect(mockConsoleLog).toHaveBeenCalledWith('INFO: File at subfolder/test.cds');
    });
  });
});
