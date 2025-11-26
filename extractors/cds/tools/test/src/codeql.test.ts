import * as childProcess from 'child_process';

import {
  handleEarlyExit,
  runJavaScriptExtractor,
  runJavaScriptExtractionWithMarker,
} from '../../src/codeql';
import { addJavaScriptExtractorDiagnostic } from '../../src/diagnostics';
import * as environment from '../../src/environment';
import * as filesystem from '../../src/filesystem';
import * as logging from '../../src/logging';

// Mock dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn(),
}));

jest.mock('child_process', () => ({
  spawnSync: jest.fn(),
}));

jest.mock('../../src/environment', () => ({
  getPlatformInfo: jest.fn(),
  configureLgtmIndexFilters: jest.fn(),
}));

jest.mock('../../src/diagnostics', () => ({
  addJavaScriptExtractorDiagnostic: jest.fn(),
}));

jest.mock('../../src/filesystem', () => ({
  createMarkerFile: jest.fn(),
  removeMarkerFile: jest.fn(),
}));

jest.mock('../../src/logging', () => ({
  cdsExtractorLog: jest.fn(),
  logExtractorStop: jest.fn(),
  logPerformanceTrackingStart: jest.fn(),
  logPerformanceTrackingStop: jest.fn(),
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

  describe('runJavaScriptExtractionWithMarker', () => {
    beforeEach(() => {
      (filesystem.createMarkerFile as jest.Mock).mockReturnValue('/path/to/marker.js');
      (filesystem.removeMarkerFile as jest.Mock).mockReturnValue(undefined);
    });

    it('should create and remove marker file during extraction', () => {
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 0,
        error: null,
      });

      const result = runJavaScriptExtractionWithMarker(
        '/path/to/source',
        '/path/to/autobuild.sh',
        '/path/to/codeql',
      );

      expect(result).toBe(true);
      expect(filesystem.createMarkerFile).toHaveBeenCalledWith('/path/to/source');
      expect(filesystem.removeMarkerFile).toHaveBeenCalledWith('/path/to/marker.js');
      expect(logging.logPerformanceTrackingStart).toHaveBeenCalledWith('JavaScript Extraction');
      expect(logging.logPerformanceTrackingStop).toHaveBeenCalledWith('JavaScript Extraction');
    });

    it('should update dependency graph performance metrics when provided', () => {
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 0,
        error: null,
      });

      const dependencyGraph = {
        projects: new Map(),
        statusSummary: {
          performance: {
            parsingDurationMs: 100,
            compilationDurationMs: 200,
            extractionDurationMs: 0,
            totalDurationMs: 0,
          },
        },
      };

      const result = runJavaScriptExtractionWithMarker(
        '/path/to/source',
        '/path/to/autobuild.sh',
        '/path/to/codeql',
        dependencyGraph as any,
      );

      expect(result).toBe(true);
      expect(dependencyGraph.statusSummary.performance.extractionDurationMs).toBeGreaterThanOrEqual(
        0,
      );
      expect(dependencyGraph.statusSummary.performance.totalDurationMs).toBe(
        dependencyGraph.statusSummary.performance.parsingDurationMs +
          dependencyGraph.statusSummary.performance.compilationDurationMs +
          dependencyGraph.statusSummary.performance.extractionDurationMs,
      );
    });

    it('should handle extraction failure and add diagnostic', () => {
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        error: new Error('Extraction failed'),
        status: null,
      });

      const result = runJavaScriptExtractionWithMarker(
        '/path/to/source',
        '/path/to/autobuild.sh',
        '/path/to/codeql',
      );

      expect(result).toBe(false);
      expect(logging.cdsExtractorLog).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('Error running JavaScript extractor'),
      );
      expect(addJavaScriptExtractorDiagnostic).toHaveBeenCalledWith(
        '/path/to/source',
        'Error running JavaScript extractor: Extraction failed',
        '/path/to/codeql',
        '/path/to/source',
      );
    });

    it('should remove marker file even when extraction fails', () => {
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        error: new Error('Extraction failed'),
        status: null,
      });

      runJavaScriptExtractionWithMarker(
        '/path/to/source',
        '/path/to/autobuild.sh',
        '/path/to/codeql',
      );

      expect(filesystem.removeMarkerFile).toHaveBeenCalledWith('/path/to/marker.js');
    });

    it('should use first CDS file as representative file for diagnostics when dependency graph is provided', () => {
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        error: new Error('Extraction failed'),
        status: null,
      });

      const dependencyGraph = {
        projects: new Map([
          [
            '/path/to/project',
            {
              cdsFiles: ['/path/to/project/model.cds', '/path/to/project/service.cds'],
            },
          ],
        ]),
        statusSummary: {
          performance: {
            parsingDurationMs: 0,
            compilationDurationMs: 0,
            extractionDurationMs: 0,
            totalDurationMs: 0,
          },
        },
      };

      runJavaScriptExtractionWithMarker(
        '/path/to/source',
        '/path/to/autobuild.sh',
        '/path/to/codeql',
        dependencyGraph as any,
      );

      expect(addJavaScriptExtractorDiagnostic).toHaveBeenCalledWith(
        '/path/to/project/model.cds',
        'Error running JavaScript extractor: Extraction failed',
        '/path/to/codeql',
        '/path/to/source',
      );
    });
  });

  describe('handleEarlyExit', () => {
    let mockExit: jest.SpyInstance;
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit called');
      }) as any);
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      (filesystem.createMarkerFile as jest.Mock).mockReturnValue('/path/to/marker.js');
      (filesystem.removeMarkerFile as jest.Mock).mockReturnValue(undefined);
    });

    afterEach(() => {
      mockExit.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should exit with code 0 after successful extraction', () => {
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 0,
        error: null,
      });

      expect(() => {
        handleEarlyExit(
          '/path/to/source',
          '/path/to/autobuild.sh',
          '/path/to/codeql',
          'Skipping CDS processing',
        );
      }).toThrow('process.exit called');

      expect(logging.logExtractorStop).toHaveBeenCalledWith(true, 'Skipping CDS processing');
      expect(console.log).toHaveBeenCalledWith(
        'Completed run of the cds-extractor.js script for the CDS extractor.',
      );
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('should exit with code 0 even when extraction fails', () => {
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        error: new Error('Failed'),
        status: null,
      });

      expect(() => {
        handleEarlyExit(
          '/path/to/source',
          '/path/to/autobuild.sh',
          '/path/to/codeql',
          'Skipping CDS processing',
        );
      }).toThrow('process.exit called');

      expect(logging.logExtractorStop).toHaveBeenCalledWith(false, 'JavaScript extractor failed');
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });
});
