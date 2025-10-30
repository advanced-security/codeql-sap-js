import type { CdsDependencyGraph } from '../../../src/cds/parser/types';
import { generateStatusReport } from '../../../src/logging/statusReport';

/**
 * Test utilities for performance tracking integration tests
 */

/**
 * Creates a mock dependency graph with specific performance metrics
 */
function createMockDependencyGraph(performanceMetrics: {
  totalDurationMs: number;
  parsingDurationMs: number;
  compilationDurationMs: number;
  extractionDurationMs: number;
}): CdsDependencyGraph {
  return {
    id: 'integration-test-graph',
    sourceRootDir: '/test/integration-source',
    projects: new Map(),
    debugInfo: {
      extractor: {
        runMode: 'integration-test',
        sourceRootDir: '/test/integration-source',
        startTime: new Date(),
        endTime: new Date(),
        durationMs: performanceMetrics.totalDurationMs,
        environment: {
          nodeVersion: 'v18.0.0',
          platform: 'test',
          cwd: '/test/cwd',
          argv: ['node', 'test.js'],
        },
      },
      parser: {
        projectsDetected: 3,
        cdsFilesFound: 15,
        dependencyResolutionSuccess: true,
        parsingErrors: [],
        parsingWarnings: [],
      },
      compiler: {
        availableCommands: [
          {
            command: 'npx @sap/cds compile',
            version: '7.5.0',
            strategy: 'npx',
            tested: true,
          },
        ],
        selectedCommand: 'npx @sap/cds compile',
        cacheDirectories: ['/test/cache'],
        cacheInitialized: true,
      },
    },
    currentPhase: 'completed',
    statusSummary: {
      overallSuccess: true,
      totalProjects: 3,
      totalCdsFiles: 15,
      totalCompilationTasks: 3,
      successfulCompilations: 3,
      failedCompilations: 0,
      skippedCompilations: 0,
      jsonFilesGenerated: 3,
      criticalErrors: [],
      warnings: [],
      performance: performanceMetrics,
    },
    config: {
      maxRetryAttempts: 3,
      enableDetailedLogging: false,
      generateDebugOutput: false,
      compilationTimeoutMs: 30000,
    },
    errors: {
      critical: [],
      warnings: [],
    },
    retryStatus: {
      totalTasksRequiringRetry: 0,
      totalTasksSuccessfullyRetried: 0,
      totalRetryAttempts: 0,
      projectsRequiringFullDependencies: new Set<string>(),
      projectsWithFullDependencies: new Set<string>(),
    },
  };
}

/**
 * Simulates the performance tracking that happens in the main extractor
 */
function simulatePerformanceTracking(): {
  totalDurationMs: number;
  parsingDurationMs: number;
  compilationDurationMs: number;
  extractionDurationMs: number;
} {
  // Simulate parsing phase
  const parsingDurationMs = 150;

  // Simulate compilation phase
  const compilationDurationMs = 3500;

  // Simulate extraction phase
  const extractionDurationMs = 1200;

  // Calculate total duration
  const totalDurationMs = parsingDurationMs + compilationDurationMs + extractionDurationMs;

  return {
    totalDurationMs,
    parsingDurationMs,
    compilationDurationMs,
    extractionDurationMs,
  };
}

/**
 * Validates that performance metrics are consistent and properly calculated
 */
function validatePerformanceMetrics(metrics: {
  totalDurationMs: number;
  parsingDurationMs: number;
  compilationDurationMs: number;
  extractionDurationMs: number;
}): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check that all metrics are non-negative
  if (metrics.totalDurationMs < 0) {
    errors.push('Total duration cannot be negative');
  }
  if (metrics.parsingDurationMs < 0) {
    errors.push('Parsing duration cannot be negative');
  }
  if (metrics.compilationDurationMs < 0) {
    errors.push('Compilation duration cannot be negative');
  }
  if (metrics.extractionDurationMs < 0) {
    errors.push('Extraction duration cannot be negative');
  }

  // Check that total duration equals sum of phases
  const expectedTotal =
    metrics.parsingDurationMs + metrics.compilationDurationMs + metrics.extractionDurationMs;
  if (metrics.totalDurationMs !== expectedTotal) {
    errors.push(
      `Total duration (${metrics.totalDurationMs}ms) does not equal sum of phases (${expectedTotal}ms)`,
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Integration tests for performance tracking
 */
describe('Performance Tracking Integration', () => {
  describe('simulatePerformanceTracking', () => {
    it('should generate realistic performance metrics', () => {
      const metrics = simulatePerformanceTracking();

      expect(metrics.parsingDurationMs).toBeGreaterThan(0);
      expect(metrics.compilationDurationMs).toBeGreaterThan(0);
      expect(metrics.extractionDurationMs).toBeGreaterThan(0);
      expect(metrics.totalDurationMs).toBeGreaterThan(0);
    });

    it('should have total duration equal to sum of phases', () => {
      const metrics = simulatePerformanceTracking();
      const expectedTotal =
        metrics.parsingDurationMs + metrics.compilationDurationMs + metrics.extractionDurationMs;

      expect(metrics.totalDurationMs).toBe(expectedTotal);
    });
  });

  describe('validatePerformanceMetrics', () => {
    it('should validate correct performance metrics', () => {
      const metrics = simulatePerformanceTracking();
      const validation = validatePerformanceMetrics(metrics);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect negative durations', () => {
      const metrics = {
        totalDurationMs: -100,
        parsingDurationMs: -50,
        compilationDurationMs: 1000,
        extractionDurationMs: 500,
      };
      const validation = validatePerformanceMetrics(metrics);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Total duration cannot be negative');
      expect(validation.errors).toContain('Parsing duration cannot be negative');
    });

    it('should detect incorrect total duration calculation', () => {
      const metrics = {
        totalDurationMs: 1000,
        parsingDurationMs: 100,
        compilationDurationMs: 200,
        extractionDurationMs: 300,
      };
      const validation = validatePerformanceMetrics(metrics);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        'Total duration (1000ms) does not equal sum of phases (600ms)',
      );
    });
  });

  describe('createMockDependencyGraph', () => {
    it('should create a dependency graph with correct performance metrics', () => {
      const metrics = simulatePerformanceTracking();
      const graph = createMockDependencyGraph(metrics);

      expect(graph.statusSummary.performance).toEqual(metrics);
      expect(graph.statusSummary.overallSuccess).toBe(true);
      expect(graph.currentPhase).toBe('completed');
    });

    it('should create a realistic dependency graph structure', () => {
      const metrics = simulatePerformanceTracking();
      const graph = createMockDependencyGraph(metrics);

      expect(graph.statusSummary.totalProjects).toBe(3);
      expect(graph.statusSummary.totalCdsFiles).toBe(15);
      expect(graph.statusSummary.totalCompilationTasks).toBe(3);
      expect(graph.statusSummary.successfulCompilations).toBe(3);
      expect(graph.statusSummary.failedCompilations).toBe(0);
      expect(graph.statusSummary.jsonFilesGenerated).toBe(3);
    });
  });

  describe('status report integration', () => {
    it('should generate a comprehensive status report with performance metrics', () => {
      const metrics = simulatePerformanceTracking();
      const graph = createMockDependencyGraph(metrics);
      const report = generateStatusReport(graph);

      expect(report).toContain('Status: SUCCESS');
      expect(report).toContain(`Total Duration: ${metrics.totalDurationMs}ms`);
      expect(report).toContain(`Parsing: ${metrics.parsingDurationMs}ms`);
      expect(report).toContain(`Compilation: ${metrics.compilationDurationMs}ms`);
      expect(report).toContain(`Extraction: ${metrics.extractionDurationMs}ms`);
    });

    it('should include percentage breakdown in status report', () => {
      const metrics = {
        totalDurationMs: 1000,
        parsingDurationMs: 100, // 10%
        compilationDurationMs: 700, // 70%
        extractionDurationMs: 200, // 20%
      };
      const graph = createMockDependencyGraph(metrics);
      const report = generateStatusReport(graph);

      expect(report).toContain('Breakdown:');
      expect(report).toContain('Parsing: 10%');
      expect(report).toContain('Compilation: 70%');
      expect(report).toContain('Extraction: 20%');
    });

    it('should demonstrate extraction timing', () => {
      const parsingDurationMs = 72;
      const compilationDurationMs = 4195;
      const extractionDurationMs = 1780;
      const totalDurationMs = parsingDurationMs + compilationDurationMs + extractionDurationMs; // 6047

      const metrics = {
        totalDurationMs,
        parsingDurationMs,
        compilationDurationMs,
        extractionDurationMs,
      };
      const graph = createMockDependencyGraph(metrics);
      const report = generateStatusReport(graph);

      // Verify that extraction timing is now properly captured
      expect(report).toContain('Extraction: 1780ms');
      expect(report).toContain(`Total Duration: ${totalDurationMs}ms`);
      expect(report).toContain('Extraction: 29%'); // 1780/6047 ≈ 29%

      // Verify that the total duration is correctly calculated
      const validation = validatePerformanceMetrics(metrics);
      expect(validation.isValid).toBe(true);
    });
  });
});
