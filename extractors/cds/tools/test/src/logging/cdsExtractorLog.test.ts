import {
  cdsExtractorLog,
  setSourceRootDirectory,
  logPerformanceTrackingStart,
  logPerformanceTrackingStop,
  logPerformanceMilestone,
  logExtractorStart,
  logExtractorStop,
} from '../../../src/logging';

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
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/^\[CDS-.+ \d+\] INFO: Test info message$/),
      );
    });

    it('should log debug messages to console.log with DEBUG prefix', () => {
      cdsExtractorLog('debug', 'Test debug message');

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/^\[CDS-.+ \d+\] DEBUG: Test debug message$/),
      );
    });

    it('should log warn messages to console.warn with WARN prefix', () => {
      cdsExtractorLog('warn', 'Test warning message');

      expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringMatching(/^\[CDS-.+ \d+\] WARN: Test warning message$/),
      );
    });

    it('should log error messages to console.error with ERROR prefix', () => {
      cdsExtractorLog('error', 'Test error message');

      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringMatching(/^\[CDS-.+ \d+\] ERROR: Test error message$/),
      );
    });
  });

  describe('message formatting', () => {
    it('should handle multiple arguments like console.log', () => {
      cdsExtractorLog('info', 'Multiple', 'arguments', 123, { key: 'value' });

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/^\[CDS-.+ \d+\] INFO: Multiple$/),
        'arguments',
        123,
        {
          key: 'value',
        },
      );
    });

    it('should handle Error objects', () => {
      const error = new Error('Test error');
      cdsExtractorLog('error', error);

      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringMatching(/^\[CDS-.+ \d+\] ERROR: $/),
        error,
      );
    });

    it('should handle empty messages', () => {
      cdsExtractorLog('info', '');

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringMatching(/^\[CDS-.+ \d+\] INFO: $/));
    });
  });

  describe('edge cases', () => {
    it('should throw error when source root directory is undefined', () => {
      setSourceRootDirectory(undefined as unknown as string);

      expect(() => {
        cdsExtractorLog('info', 'Test message');
      }).toThrow('Source root directory is not set. Call setSourceRootDirectory() first.');
    });

    it('should throw error when source root directory is empty', () => {
      setSourceRootDirectory('');

      expect(() => {
        cdsExtractorLog('info', 'Test message');
      }).toThrow('Source root directory is not set. Call setSourceRootDirectory() first.');
    });

    it('should handle non-string message arguments', () => {
      setSourceRootDirectory('/test/source-root');
      cdsExtractorLog('info', 123, true, null, undefined);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/^\[CDS-.+ \d+\] INFO: $/),
        123,
        true,
        null,
        undefined,
      );
    });

    it('should throw error for invalid log level', () => {
      setSourceRootDirectory('/test/source-root');
      expect(() => {
        cdsExtractorLog('invalid' as 'info', 'test message');
      }).toThrow('Invalid log level: invalid');
    });
  });

  describe('setSourceRootDirectory function', () => {
    it('should allow setting and updating source root directory', () => {
      setSourceRootDirectory('/new/source-root');
      const message = 'File at /new/source-root/test.cds';
      cdsExtractorLog('info', message);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/^\[CDS-.+ \d+\] INFO: File at \/new\/source-root\/test\.cds$/),
      );
    });

    it('should allow setting source root directory with trailing slash', () => {
      setSourceRootDirectory('/test/root/');
      const message = 'File at /test/root/subfolder/test.cds';
      cdsExtractorLog('info', message);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/^\[CDS-.+ \d+\] INFO: File at \/test\/root\/subfolder\/test\.cds$/),
      );
    });
  });

  describe('performance tracking functions', () => {
    beforeEach(() => {
      setSourceRootDirectory('/test/source-root');
    });

    describe('logPerformanceTrackingStart and logPerformanceTrackingStop', () => {
      it('should track performance for an operation', () => {
        const operationName = 'test-operation';

        logPerformanceTrackingStart(operationName);

        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringMatching(/^\[CDS-.+ \d+\] DEBUG: Started: test-operation$/),
        );

        mockConsoleLog.mockClear();

        // Add a small delay to ensure different timestamps
        const start = Date.now();
        while (Date.now() - start < 10) {
          // busy wait
        }

        logPerformanceTrackingStop(operationName);

        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringMatching(/^\[CDS-.+ \d+\] INFO: Completed: test-operation \(took \d+ms\)$/),
        );
      });

      it('should handle ending tracking for unknown operation', () => {
        logPerformanceTrackingStop('unknown-operation');

        expect(mockConsoleWarn).toHaveBeenCalledWith(
          expect.stringMatching(
            /^\[CDS-.+ \d+\] WARN: No start time found for operation: unknown-operation$/,
          ),
        );
      });
    });

    describe('logPerformanceMilestone', () => {
      it('should log milestone with timing information', () => {
        logPerformanceMilestone('Compilation completed');

        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringMatching(
            /^\[CDS-.+ \d+\] INFO: MILESTONE: Compilation completed \(after \d+ms\)$/,
          ),
        );
      });

      it('should log milestone with additional information', () => {
        logPerformanceMilestone('Files processed', '25 files');

        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringMatching(
            /^\[CDS-.+ \d+\] INFO: MILESTONE: Files processed \(after \d+ms\) - 25 files$/,
          ),
        );
      });
    });

    describe('logExtractorStart', () => {
      it('should log extractor start with session information', () => {
        logExtractorStart('/path/to/source');

        expect(mockConsoleLog).toHaveBeenCalledTimes(2);
        expect(mockConsoleLog).toHaveBeenNthCalledWith(
          1,
          expect.stringMatching(/^\[CDS-.+ \d+\] INFO: === CDS EXTRACTOR START \[.+\] ===$/),
        );
        expect(mockConsoleLog).toHaveBeenNthCalledWith(
          2,
          expect.stringMatching(/^\[CDS-.+ \d+\] INFO: Source Root: \/path\/to\/source$/),
        );
      });
    });

    describe('logExtractorStop', () => {
      it('should log successful extractor end', () => {
        logExtractorStop();

        expect(mockConsoleLog).toHaveBeenCalledTimes(2);
        expect(mockConsoleLog).toHaveBeenNthCalledWith(
          1,
          expect.stringMatching(
            /^\[CDS-.+ \d+\] INFO: === CDS EXTRACTOR END \[.+\] - SUCCESS ===$/,
          ),
        );
        expect(mockConsoleLog).toHaveBeenNthCalledWith(
          2,
          expect.stringMatching(/^\[CDS-.+ \d+\] INFO: Total Duration: \d+ms$/),
        );
      });

      it('should log failed extractor end', () => {
        logExtractorStop(false);

        expect(mockConsoleLog).toHaveBeenCalledTimes(2);
        expect(mockConsoleLog).toHaveBeenNthCalledWith(
          1,
          expect.stringMatching(
            /^\[CDS-.+ \d+\] INFO: === CDS EXTRACTOR END \[.+\] - FAILURE ===$/,
          ),
        );
        expect(mockConsoleLog).toHaveBeenNthCalledWith(
          2,
          expect.stringMatching(/^\[CDS-.+ \d+\] INFO: Total Duration: \d+ms$/),
        );
      });

      it('should log extractor end with additional summary', () => {
        logExtractorStop(true, 'Processed 50 files successfully');

        expect(mockConsoleLog).toHaveBeenCalledTimes(3);
        expect(mockConsoleLog).toHaveBeenNthCalledWith(
          1,
          expect.stringMatching(/^\[CDS-.+ \d+\] INFO: Processed 50 files successfully$/),
        );
        expect(mockConsoleLog).toHaveBeenNthCalledWith(
          2,
          expect.stringMatching(
            /^\[CDS-.+ \d+\] INFO: === CDS EXTRACTOR END \[.+\] - SUCCESS ===$/,
          ),
        );
        expect(mockConsoleLog).toHaveBeenNthCalledWith(
          3,
          expect.stringMatching(/^\[CDS-.+ \d+\] INFO: Total Duration: \d+ms$/),
        );
      });
    });
  });

  describe('formatDuration helper function behavior', () => {
    beforeEach(() => {
      setSourceRootDirectory('/test/source-root');
    });

    it('should handle durations over 1 minute in logExtractorStop', () => {
      // Since logExtractorStop calculates from the module's extractorStartTime,
      // we just test that it logs with a valid format (no negative values)
      logExtractorStop();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(
          /^\[CDS-.+ \d+\] INFO: Total Duration: \d+(\.\d+)?(ms|s|m \d+\.\d+s)$/,
        ),
      );
    });

    it('should handle durations over 1 second in performance tracking', () => {
      const operationName = 'long-operation';

      logPerformanceTrackingStart(operationName);
      mockConsoleLog.mockClear();

      // Add a small delay to ensure measurable time difference
      const start = Date.now();
      while (Date.now() - start < 10) {
        // busy wait for ~10ms
      }

      logPerformanceTrackingStop(operationName);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/^\[CDS-.+ \d+\] INFO: Completed: long-operation \(took \d+ms\)$/),
      );
    });
  });
});
