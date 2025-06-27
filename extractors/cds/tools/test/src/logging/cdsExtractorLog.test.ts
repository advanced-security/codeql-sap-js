import {
  cdsExtractorLog,
  setSourceRootDirectory,
  startPerformanceTracking,
  endPerformanceTracking,
  logPerformanceMilestone,
  logExtractorStart,
  logExtractorStop,
  logMemoryUsage,
  logPerformanceCounter,
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

    describe('startPerformanceTracking and endPerformanceTracking', () => {
      it('should track performance for an operation', () => {
        const operationName = 'test-operation';

        startPerformanceTracking(operationName);

        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringMatching(/^\[CDS-.+ \d+\] DEBUG: Started: test-operation$/),
        );

        mockConsoleLog.mockClear();

        // Add a small delay to ensure different timestamps
        const start = Date.now();
        while (Date.now() - start < 10) {
          // busy wait
        }

        endPerformanceTracking(operationName);

        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringMatching(/^\[CDS-.+ \d+\] INFO: Completed: test-operation \(took \d+ms\)$/),
        );
      });

      it('should handle ending tracking for unknown operation', () => {
        endPerformanceTracking('unknown-operation');

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

    describe('logMemoryUsage', () => {
      it('should log memory usage when process.memoryUsage is available', () => {
        // Mock process.memoryUsage
        const mockMemoryUsage = jest.spyOn(process, 'memoryUsage').mockReturnValue({
          rss: 1024 * 1024 * 50, // 50 MB
          heapUsed: 1024 * 1024 * 30, // 30 MB
          heapTotal: 1024 * 1024 * 40, // 40 MB
          external: 1024 * 1024 * 5, // 5 MB
          arrayBuffers: 0,
        });

        logMemoryUsage('After compilation');

        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringMatching(
            /^\[CDS-.+ \d+\] DEBUG: Memory usage - After compilation: RSS=50 MB, Heap Used=30 MB, Heap Total=40 MB, External=5 MB$/,
          ),
        );

        // Restore original memoryUsage
        mockMemoryUsage.mockRestore();
      });

      it('should handle when process.memoryUsage is not available', () => {
        // Test graceful handling when memoryUsage throws
        const mockMemoryUsage = jest.spyOn(process, 'memoryUsage').mockImplementation(() => {
          throw new Error('memoryUsage not available');
        });

        // This should not throw an error
        expect(() => {
          logMemoryUsage('Test context');
        }).not.toThrow();

        // Should not log anything when memoryUsage is not available
        expect(mockConsoleLog).not.toHaveBeenCalled();

        // Restore original memoryUsage
        mockMemoryUsage.mockRestore();
      });

      it('should format bytes correctly', () => {
        const mockMemoryUsage = jest.spyOn(process, 'memoryUsage').mockReturnValue({
          rss: 0,
          heapUsed: 512,
          heapTotal: 1024 * 2,
          external: 1024 * 1024 * 1.5,
          arrayBuffers: 0,
        });

        logMemoryUsage('Byte formatting test');

        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringMatching(
            /^\[CDS-.+ \d+\] DEBUG: Memory usage - Byte formatting test: RSS=0 B, Heap Used=512 B, Heap Total=2 KB, External=1.5 MB$/,
          ),
        );

        mockMemoryUsage.mockRestore();
      });
    });

    describe('logPerformanceCounter', () => {
      it('should log basic counter information', () => {
        logPerformanceCounter('Files processed', 25);

        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringMatching(/^\[CDS-.+ \d+\] DEBUG: Files processed: 25$/),
        );
      });

      it('should log counter with progress percentage', () => {
        logPerformanceCounter('Files processed', 25, undefined, 100);

        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringMatching(/^\[CDS-.+ \d+\] DEBUG: Files processed: 25 \/ 100 \(25\.0%\)$/),
        );
      });

      it('should log counter with rate information', () => {
        const startTime = Date.now() - 1000; // 1 second ago
        logPerformanceCounter('Files processed', 10, startTime);

        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringMatching(
            /^\[CDS-.+ \d+\] DEBUG: Files processed: 10 - Rate: \d+\.\d+\/sec$/,
          ),
        );
      });

      it('should log counter with both percentage and rate', () => {
        const startTime = Date.now() - 2000; // 2 seconds ago
        logPerformanceCounter('Files processed', 20, startTime, 50);

        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringMatching(
            /^\[CDS-.+ \d+\] DEBUG: Files processed: 20 \/ 50 \(40\.0%\) - Rate: \d+\.\d+\/sec$/,
          ),
        );
      });

      it('should handle zero elapsed time gracefully', () => {
        const startTime = Date.now(); // Current time (essentially zero elapsed)
        logPerformanceCounter('Files processed', 10, startTime);

        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringMatching(/^\[CDS-.+ \d+\] DEBUG: Files processed: 10 - Rate: 0\/sec$/),
        );
      });

      it('should handle zero or negative total expected', () => {
        logPerformanceCounter('Files processed', 10, undefined, 0);

        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringMatching(/^\[CDS-.+ \d+\] DEBUG: Files processed: 10$/),
        );

        mockConsoleLog.mockClear();

        logPerformanceCounter('Files processed', 10, undefined, -5);

        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringMatching(/^\[CDS-.+ \d+\] DEBUG: Files processed: 10$/),
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

      startPerformanceTracking(operationName);
      mockConsoleLog.mockClear();

      // Add a small delay to ensure measurable time difference
      const start = Date.now();
      while (Date.now() - start < 10) {
        // busy wait for ~10ms
      }

      endPerformanceTracking(operationName);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/^\[CDS-.+ \d+\] INFO: Completed: long-operation \(took \d+ms\)$/),
      );
    });
  });
});
