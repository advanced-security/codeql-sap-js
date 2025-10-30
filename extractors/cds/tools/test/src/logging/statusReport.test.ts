import type { CdsDependencyGraph } from '../../../src/cds/parser/types';
import { generateStatusReport } from '../../../src/logging/statusReport';

describe('generateStatusReport', () => {
  let mockDependencyGraph: CdsDependencyGraph;

  beforeEach(() => {
    mockDependencyGraph = {
      id: 'test-graph-id',
      sourceRootDir: '/test/source-root',
      projects: new Map(),
      debugInfo: {
        extractor: {
          runMode: 'test',
          sourceRootDir: '/test/source-root',
          startTime: new Date(),
          endTime: new Date(),
          durationMs: 0,
          environment: {
            nodeVersion: 'v18.0.0',
            platform: 'test',
            cwd: '/test/cwd',
            argv: ['node', 'test.js'],
          },
        },
        parser: {
          projectsDetected: 0,
          cdsFilesFound: 0,
          dependencyResolutionSuccess: true,
          parsingErrors: [],
          parsingWarnings: [],
        },
        compiler: {
          availableCommands: [],
          selectedCommand: 'test-command',
          cacheDirectories: [],
          cacheInitialized: false,
        },
      },
      currentPhase: 'completed',
      statusSummary: {
        overallSuccess: true,
        totalProjects: 0,
        totalCdsFiles: 0,
        totalCompilationTasks: 0,
        successfulCompilations: 0,
        failedCompilations: 0,
        skippedCompilations: 0,
        jsonFilesGenerated: 0,
        criticalErrors: [],
        warnings: [],
        performance: {
          totalDurationMs: 0,
          parsingDurationMs: 0,
          compilationDurationMs: 0,
          extractionDurationMs: 0,
        },
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
  });

  describe('basic status report generation', () => {
    it('should generate a basic status report with zero metrics', () => {
      const report = generateStatusReport(mockDependencyGraph);

      expect(report).toContain('CDS EXTRACTOR STATUS REPORT');
      expect(report).toContain('Status: SUCCESS');
      expect(report).toContain('Projects: 0');
      expect(report).toContain('CDS Files: 0');
      expect(report).toContain('JSON Files Generated: 0');
      expect(report).toContain('Total Duration: 0ms');
      expect(report).toContain('Parsing: 0ms');
      expect(report).toContain('Compilation: 0ms');
      expect(report).toContain('Extraction: 0ms');
    });

    it('should show failed status when overall success is false', () => {
      mockDependencyGraph.statusSummary.overallSuccess = false;

      const report = generateStatusReport(mockDependencyGraph);

      expect(report).toContain('Status: FAILED');
    });

    it('should show current phase correctly', () => {
      mockDependencyGraph.currentPhase = 'compiling';

      const report = generateStatusReport(mockDependencyGraph);

      expect(report).toContain('Current Phase: COMPILING');
    });
  });

  describe('performance metrics and breakdown', () => {
    it('should display performance metrics correctly', () => {
      mockDependencyGraph.statusSummary.performance = {
        totalDurationMs: 5000,
        parsingDurationMs: 500,
        compilationDurationMs: 3000,
        extractionDurationMs: 1500,
      };

      const report = generateStatusReport(mockDependencyGraph);

      expect(report).toContain('Total Duration: 5000ms');
      expect(report).toContain('Parsing: 500ms');
      expect(report).toContain('Compilation: 3000ms');
      expect(report).toContain('Extraction: 1500ms');
    });

    it('should show percentage breakdown when total duration > 0', () => {
      mockDependencyGraph.statusSummary.performance = {
        totalDurationMs: 1000,
        parsingDurationMs: 100, // 10%
        compilationDurationMs: 600, // 60%
        extractionDurationMs: 300, // 30%
      };

      const report = generateStatusReport(mockDependencyGraph);

      expect(report).toContain('Breakdown:');
      expect(report).toContain('Parsing: 10%');
      expect(report).toContain('Compilation: 60%');
      expect(report).toContain('Extraction: 30%');
    });

    it('should not show percentage breakdown when total duration is 0', () => {
      mockDependencyGraph.statusSummary.performance = {
        totalDurationMs: 0,
        parsingDurationMs: 0,
        compilationDurationMs: 0,
        extractionDurationMs: 0,
      };

      const report = generateStatusReport(mockDependencyGraph);

      expect(report).not.toContain('Breakdown:');
    });

    it('should round percentages correctly', () => {
      mockDependencyGraph.statusSummary.performance = {
        totalDurationMs: 3000,
        parsingDurationMs: 1000, // 33.33% -> 33%
        compilationDurationMs: 1000, // 33.33% -> 33%
        extractionDurationMs: 1000, // 33.33% -> 33%
      };

      const report = generateStatusReport(mockDependencyGraph);

      expect(report).toContain('Parsing: 33%');
      expect(report).toContain('Compilation: 33%');
      expect(report).toContain('Extraction: 33%');
    });
  });

  describe('compilation summary', () => {
    it('should display compilation metrics correctly', () => {
      mockDependencyGraph.statusSummary.totalCompilationTasks = 10;
      mockDependencyGraph.statusSummary.successfulCompilations = 8;
      mockDependencyGraph.statusSummary.failedCompilations = 1;
      mockDependencyGraph.statusSummary.skippedCompilations = 1;

      const report = generateStatusReport(mockDependencyGraph);

      expect(report).toContain('Total Tasks: 10');
      expect(report).toContain('Successful: 8');
      expect(report).toContain('Failed: 1');
      expect(report).toContain('Skipped: 1');
    });
  });

  describe('project and file counts', () => {
    it('should display project and file counts correctly', () => {
      mockDependencyGraph.statusSummary.totalProjects = 5;
      mockDependencyGraph.statusSummary.totalCdsFiles = 25;
      mockDependencyGraph.statusSummary.jsonFilesGenerated = 15;

      const report = generateStatusReport(mockDependencyGraph);

      expect(report).toContain('Projects: 5');
      expect(report).toContain('CDS Files: 25');
      expect(report).toContain('JSON Files Generated: 15');
    });
  });

  describe('error and warning reporting', () => {
    it('should display critical errors when present', () => {
      mockDependencyGraph.statusSummary.criticalErrors = ['Critical error 1', 'Critical error 2'];

      const report = generateStatusReport(mockDependencyGraph);

      expect(report).toContain('CRITICAL ERRORS:');
      expect(report).toContain('- Critical error 1');
      expect(report).toContain('- Critical error 2');
    });

    it('should display warnings when present', () => {
      mockDependencyGraph.statusSummary.warnings = ['Warning 1', 'Warning 2'];

      const report = generateStatusReport(mockDependencyGraph);

      expect(report).toContain('WARNINGS:');
      expect(report).toContain('- Warning 1');
      expect(report).toContain('- Warning 2');
    });

    it('should not display error sections when no errors are present', () => {
      const report = generateStatusReport(mockDependencyGraph);

      expect(report).not.toContain('CRITICAL ERRORS:');
      expect(report).not.toContain('WARNINGS:');
    });
  });

  describe('realistic scenario tests', () => {
    it('should generate a realistic successful extraction report', () => {
      mockDependencyGraph.statusSummary = {
        overallSuccess: true,
        totalProjects: 11,
        totalCdsFiles: 35,
        totalCompilationTasks: 11,
        successfulCompilations: 11,
        failedCompilations: 0,
        skippedCompilations: 0,
        jsonFilesGenerated: 11,
        criticalErrors: [],
        warnings: [],
        performance: {
          totalDurationMs: 7330,
          parsingDurationMs: 72,
          compilationDurationMs: 4195,
          extractionDurationMs: 1780,
        },
      };

      const report = generateStatusReport(mockDependencyGraph);

      expect(report).toContain('Status: SUCCESS');
      expect(report).toContain('Projects: 11');
      expect(report).toContain('CDS Files: 35');
      expect(report).toContain('JSON Files Generated: 11');
      expect(report).toContain('Total Duration: 7330ms');
      expect(report).toContain('Parsing: 72ms');
      expect(report).toContain('Compilation: 4195ms');
      expect(report).toContain('Extraction: 1780ms');
      expect(report).toContain('Breakdown:');
      expect(report).toContain('Parsing: 1%'); // 72/7330 = ~1%
      expect(report).toContain('Compilation: 57%'); // 4195/7330 = ~57%
      expect(report).toContain('Extraction: 24%'); // 1780/7330 = ~24%
    });

    it('should generate a realistic failed extraction report', () => {
      mockDependencyGraph.statusSummary = {
        overallSuccess: false,
        totalProjects: 5,
        totalCdsFiles: 20,
        totalCompilationTasks: 5,
        successfulCompilations: 3,
        failedCompilations: 2,
        skippedCompilations: 0,
        jsonFilesGenerated: 3,
        criticalErrors: ['Compilation failed for project A', 'Compilation failed for project B'],
        warnings: ['Warning: deprecated syntax found'],
        performance: {
          totalDurationMs: 3500,
          parsingDurationMs: 150,
          compilationDurationMs: 2500,
          extractionDurationMs: 850,
        },
      };

      const report = generateStatusReport(mockDependencyGraph);

      expect(report).toContain('Status: FAILED');
      expect(report).toContain('Projects: 5');
      expect(report).toContain('CDS Files: 20');
      expect(report).toContain('JSON Files Generated: 3');
      expect(report).toContain('Failed: 2');
      expect(report).toContain('CRITICAL ERRORS:');
      expect(report).toContain('- Compilation failed for project A');
      expect(report).toContain('- Compilation failed for project B');
      expect(report).toContain('WARNINGS:');
      expect(report).toContain('- Warning: deprecated syntax found');
    });
  });

  describe('retry summary reporting', () => {
    it('should show RETRY SUMMARY when retry attempts were made with successful retries', () => {
      // Setup scenario: 2 tasks were retried successfully
      mockDependencyGraph.retryStatus.totalTasksRequiringRetry = 0; // Should be 0 after successful retries
      mockDependencyGraph.retryStatus.totalTasksSuccessfullyRetried = 2;
      mockDependencyGraph.retryStatus.totalRetryAttempts = 2;
      mockDependencyGraph.retryStatus.projectsRequiringFullDependencies = new Set([
        'project-1',
        'project-2',
      ]);
      mockDependencyGraph.retryStatus.projectsWithFullDependencies = new Set([
        'project-1',
        'project-2',
      ]);

      const report = generateStatusReport(mockDependencyGraph);

      expect(report).toContain('RETRY SUMMARY:');
      expect(report).toContain('Tasks Requiring Retry: 0');
      expect(report).toContain('Tasks Successfully Retried: 2');
      expect(report).toContain('Total Retry Attempts: 2');
      expect(report).toContain('Projects Requiring Full Dependencies: 2');
      expect(report).toContain('Projects with Full Dependencies: 2');
    });

    it('should show RETRY SUMMARY when retry attempts were made with partial success', () => {
      // Setup scenario: 3 tasks needed retry, 2 succeeded, 1 still failed
      mockDependencyGraph.retryStatus.totalTasksRequiringRetry = 1; // 1 task still needs retry
      mockDependencyGraph.retryStatus.totalTasksSuccessfullyRetried = 2;
      mockDependencyGraph.retryStatus.totalRetryAttempts = 3;
      mockDependencyGraph.retryStatus.projectsRequiringFullDependencies = new Set(['project-1']);
      mockDependencyGraph.retryStatus.projectsWithFullDependencies = new Set(['project-1']);

      const report = generateStatusReport(mockDependencyGraph);

      expect(report).toContain('RETRY SUMMARY:');
      expect(report).toContain('Tasks Requiring Retry: 1');
      expect(report).toContain('Tasks Successfully Retried: 2');
      expect(report).toContain('Total Retry Attempts: 3');
    });

    it('should show RETRY SUMMARY when retry attempts were made but all failed', () => {
      // Setup scenario: 2 tasks needed retry, both failed
      mockDependencyGraph.retryStatus.totalTasksRequiringRetry = 2; // Still have tasks requiring retry
      mockDependencyGraph.retryStatus.totalTasksSuccessfullyRetried = 0;
      mockDependencyGraph.retryStatus.totalRetryAttempts = 2;

      const report = generateStatusReport(mockDependencyGraph);

      expect(report).toContain('RETRY SUMMARY:');
      expect(report).toContain('Tasks Requiring Retry: 2');
      expect(report).toContain('Tasks Successfully Retried: 0');
      expect(report).toContain('Total Retry Attempts: 2');
    });

    it('should not show RETRY SUMMARY when no retry attempts were made', () => {
      // Setup scenario: No retries needed or attempted
      mockDependencyGraph.retryStatus.totalTasksRequiringRetry = 0;
      mockDependencyGraph.retryStatus.totalTasksSuccessfullyRetried = 0;
      mockDependencyGraph.retryStatus.totalRetryAttempts = 0;

      const report = generateStatusReport(mockDependencyGraph);

      expect(report).not.toContain('RETRY SUMMARY:');
      expect(report).not.toContain('Tasks Requiring Retry:');
      expect(report).not.toContain('Tasks Successfully Retried:');
    });

    it('should match the exact scenario from the user bug report - 2 successful retries', () => {
      // This test replicates the exact scenario from the user's bug report:
      // - 2 tasks were successfully retried
      // - Expected: "Tasks Requiring Retry: 0" and "Tasks Successfully Retried: 2"

      // Setup compilation summary as reported by user
      mockDependencyGraph.statusSummary.totalCompilationTasks = 11;
      mockDependencyGraph.statusSummary.successfulCompilations = 11;
      mockDependencyGraph.statusSummary.failedCompilations = 0;
      mockDependencyGraph.statusSummary.skippedCompilations = 0;

      // Setup retry status - this is the key fix
      mockDependencyGraph.retryStatus.totalTasksRequiringRetry = 0; // FIXED: Should be 0 after successful retries
      mockDependencyGraph.retryStatus.totalTasksSuccessfullyRetried = 2; // FIXED: Should be 2 for successful retries
      mockDependencyGraph.retryStatus.totalRetryAttempts = 2;
      mockDependencyGraph.retryStatus.projectsRequiringFullDependencies = new Set([
        'project-1',
        'project-2',
      ]);
      mockDependencyGraph.retryStatus.projectsWithFullDependencies = new Set([
        'project-1',
        'project-2',
      ]);

      const report = generateStatusReport(mockDependencyGraph);

      // Verify COMPILATION SUMMARY section
      expect(report).toContain('COMPILATION SUMMARY:');
      expect(report).toContain('Total Tasks: 11');
      expect(report).toContain('Successful: 11');
      expect(report).toContain('Retried: 2');
      expect(report).toContain('Failed: 0');
      expect(report).toContain('Skipped: 0');

      // Verify RETRY SUMMARY section - this should now appear and show correct values
      expect(report).toContain('RETRY SUMMARY:');
      expect(report).toContain('Tasks Requiring Retry: 0'); // FIXED: Was incorrectly showing 2
      expect(report).toContain('Tasks Successfully Retried: 2'); // FIXED: Was incorrectly showing 0
      expect(report).toContain('Total Retry Attempts: 2');
      expect(report).toContain('Projects Requiring Full Dependencies: 2');
      expect(report).toContain('Projects with Full Dependencies: 2');
    });

    it('should use retryStatus.totalRetryAttempts for retried compilations instead of statusSummary.retriedCompilations', () => {
      mockDependencyGraph.statusSummary = {
        ...mockDependencyGraph.statusSummary,
        totalCompilationTasks: 11,
        successfulCompilations: 11,
        failedCompilations: 0,
        skippedCompilations: 0,
      };

      mockDependencyGraph.retryStatus = {
        totalTasksRequiringRetry: 0,
        totalTasksSuccessfullyRetried: 2,
        totalRetryAttempts: 2,
        projectsRequiringFullDependencies: new Set(['project1', 'project2']),
        projectsWithFullDependencies: new Set(['project1', 'project2']),
      };

      const report = generateStatusReport(mockDependencyGraph);

      expect(report).toContain('COMPILATION SUMMARY:');
      expect(report).toContain('Retried: 2');
      expect(report).not.toContain('Retried: 0');
    });
  });
});
