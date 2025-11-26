/** Tests for retry orchestration logic */

import * as compile from '../../../../src/cds/compiler/compile';
import { orchestrateRetryAttempts } from '../../../../src/cds/compiler/retry';
import type { CompilationTask } from '../../../../src/cds/compiler/types';
import * as validator from '../../../../src/cds/compiler/validator';
import type { CdsDependencyGraph, CdsProject } from '../../../../src/cds/parser';
import * as diagnostics from '../../../../src/diagnostics';
import * as logging from '../../../../src/logging';
import * as packageManager from '../../../../src/packageManager';

// Mock dependencies
jest.mock('../../../../src/cds/compiler/validator');
jest.mock('../../../../src/diagnostics');
jest.mock('../../../../src/logging');
jest.mock('../../../../src/packageManager');
jest.mock('../../../../src/cds/compiler/compile');

const mockValidator = validator as jest.Mocked<typeof validator>;
const mockDiagnostics = diagnostics as jest.Mocked<typeof diagnostics>;
const mockLogging = logging as jest.Mocked<typeof logging>;
const mockPackageManager = packageManager as jest.Mocked<typeof packageManager>;
const mockCompile = compile as jest.Mocked<typeof compile>;

describe('retry.ts', () => {
  let mockDependencyGraph: CdsDependencyGraph;
  let mockProject: CdsProject;
  let mockFailedTask: CompilationTask;
  const codeqlExePath = '/path/to/codeql';

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a failed compilation task
    mockFailedTask = {
      id: 'task-1',
      type: 'file',
      sourceFiles: ['/test/project/db/schema.cds'],
      expectedOutputFile: 'model.cds.json',
      projectDir: 'test-project',
      status: 'failed',
      attempts: [],
      dependencies: [],
      errorSummary: 'Initial compilation failed',
      primaryCommand: {
        executable: 'cds',
        args: [],
        originalCommand: 'cds',
      },
      retryCommand: {
        executable: 'npx',
        args: ['cds'],
        originalCommand: 'npx cds',
      },
    };

    // Create a mock project
    mockProject = {
      id: 'project-1',
      projectDir: 'test-project',
      cdsFiles: ['/test/project/db/schema.cds'],
      compilationTargets: ['/test/project/db/schema.cds'],
      expectedOutputFile: 'model.cds.json',
      dependencies: [],
      imports: new Map(),
      packageJson: {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          '@sap/cds': '^7.0.0',
        },
      },
      compilationTasks: [mockFailedTask],
      status: 'failed',
      timestamps: {
        discovered: new Date(),
        compilationStarted: new Date(),
      },
    };

    // Create a mock dependency graph
    mockDependencyGraph = {
      id: 'test-graph',
      sourceRootDir: '/test',
      projects: new Map([['test-project', mockProject]]),
      debugInfo: {
        extractor: {
          runMode: 'test',
          sourceRootDir: '/test',
          startTime: new Date(),
          environment: {
            nodeVersion: '18.0.0',
            platform: 'darwin',
            cwd: '/test',
            argv: [],
          },
        },
        parser: {
          projectsDetected: 1,
          cdsFilesFound: 1,
          dependencyResolutionSuccess: true,
          parsingErrors: [],
          parsingWarnings: [],
        },
        compiler: {
          availableCommands: [],
          selectedCommand: 'cds',
          cacheDirectories: [],
          cacheInitialized: false,
        },
      },
      currentPhase: 'compiling',
      statusSummary: {
        overallSuccess: false,
        totalProjects: 1,
        totalCdsFiles: 1,
        totalCompilationTasks: 1,
        successfulCompilations: 0,
        failedCompilations: 1,
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

    // Default mocks
    mockValidator.identifyTasksRequiringRetry.mockReturnValue(new Map());
    mockValidator.updateCdsDependencyGraphStatus.mockImplementation(
      (dependencyGraph, _sourceRootDir) => {
        // Mock implementation that simulates the centralized status validation
        let successfulTasks = 0;
        let failedTasks = 0;
        let tasksSuccessfullyRetried = 0;

        for (const project of dependencyGraph.projects.values()) {
          for (const task of project.compilationTasks) {
            // Check if the task has any successful attempts
            const hasSuccessfulAttempt = task.attempts.some(attempt => attempt.result.success);

            if (hasSuccessfulAttempt || task.status === 'success') {
              task.status = 'success';
              successfulTasks++;

              // If task has retry info and is now successful, count as successfully retried
              if (task.retryInfo?.hasBeenRetried) {
                tasksSuccessfullyRetried++;
              }
            } else {
              task.status = 'failed';
              failedTasks++;
            }
          }
        }

        // Update dependency graph counters
        dependencyGraph.statusSummary.successfulCompilations = successfulTasks;
        dependencyGraph.statusSummary.failedCompilations = failedTasks;

        // Update retry status tracking
        dependencyGraph.retryStatus.totalTasksSuccessfullyRetried = tasksSuccessfullyRetried;
        dependencyGraph.retryStatus.totalTasksRequiringRetry = failedTasks;

        return {
          tasksValidated: successfulTasks + failedTasks,
          successfulTasks,
          failedTasks,
          tasksSuccessfullyRetried,
        };
      },
    );
    mockPackageManager.needsFullDependencyInstallation.mockReturnValue(false);
    mockLogging.cdsExtractorLog.mockImplementation(() => {});
    mockDiagnostics.addCompilationDiagnostic.mockImplementation(() => true);
  });

  describe('orchestrateRetryAttempts', () => {
    it('should return early when no tasks require retry', () => {
      // Setup: No tasks requiring retry
      mockValidator.identifyTasksRequiringRetry.mockReturnValue(new Map());

      // Execute
      const result = orchestrateRetryAttempts(mockDependencyGraph, codeqlExePath);

      // Verify
      expect(result).toEqual({
        success: true,
        projectsWithRetries: [],
        totalTasksRequiringRetry: 0,
        totalSuccessfulRetries: 0,
        totalFailedRetries: 0,
        projectsWithSuccessfulDependencyInstallation: [],
        projectsWithFailedDependencyInstallation: [],
        retryDurationMs: expect.any(Number),
        dependencyInstallationDurationMs: 0,
        retryCompilationDurationMs: 0,
      });

      expect(mockValidator.identifyTasksRequiringRetry).toHaveBeenCalledWith(mockDependencyGraph);
      expect(mockLogging.cdsExtractorLog).toHaveBeenCalledWith(
        'info',
        'No tasks require retry - all compilations successful',
      );
    });

    it('should update retry counts when dependency installation is required', () => {
      // Setup: Tasks requiring retry
      const failedTask = { ...mockFailedTask };
      const tasksRequiringRetry = new Map([['test-project', [failedTask]]]);
      mockValidator.identifyTasksRequiringRetry.mockReturnValue(tasksRequiringRetry);
      mockPackageManager.needsFullDependencyInstallation.mockReturnValue(true);
      mockPackageManager.projectInstallDependencies.mockReturnValue({
        success: true,
        projectDir: 'test-project',
        warnings: [],
        durationMs: 1000,
        timedOut: false,
      });

      // Mock successful compilation retry
      mockCompile.compileCdsToJson.mockReturnValue({
        success: true,
        outputPath: '/test/project/db/schema.cds.json',
        message: 'Compilation successful',
        durationMs: 500,
      });

      // Execute
      const result = orchestrateRetryAttempts(mockDependencyGraph, codeqlExePath);

      // Verify retry counts are properly tracked
      expect(result.totalTasksRequiringRetry).toBe(1);
      expect(mockDependencyGraph.retryStatus.totalTasksRequiringRetry).toBe(0); // Should be 0 after successful retry
      expect(result.projectsWithSuccessfulDependencyInstallation).toEqual(['test-project']);
    });

    it('should track successful retries and update totalTasksRequiringRetry correctly', () => {
      // This test verifies the fix for the RETRY SUMMARY reporting issue

      // Setup: Initial state with 2 failed tasks
      mockDependencyGraph.statusSummary.successfulCompilations = 0;
      mockDependencyGraph.statusSummary.failedCompilations = 2;
      mockDependencyGraph.retryStatus.totalTasksRequiringRetry = 0; // Will be set by the function

      const task1 = { ...mockFailedTask, id: 'task-1' };
      const task2 = { ...mockFailedTask, id: 'task-2' };

      // Add both tasks to the project in the dependency graph
      mockProject.compilationTasks = [task1, task2];

      const tasksRequiringRetry = new Map([['test-project', [task1, task2]]]);

      mockValidator.identifyTasksRequiringRetry.mockReturnValue(tasksRequiringRetry);
      mockPackageManager.needsFullDependencyInstallation.mockReturnValue(false);

      // Mock successful compilation retries for both tasks
      mockCompile.compileCdsToJson.mockReturnValue({
        success: true,
        outputPath: '/test/project/db/schema.cds.json',
        message: 'Compilation successful',
        durationMs: 500,
      });

      // Execute
      const result = orchestrateRetryAttempts(mockDependencyGraph, codeqlExePath);

      // Verify the key metrics that were reported incorrectly:
      // - totalTasksRequiringRetry should be reduced to 0 after successful retries
      // - totalTasksSuccessfullyRetried should be 2
      expect(mockDependencyGraph.retryStatus.totalTasksRequiringRetry).toBe(0); // Should be reduced from 2 to 0
      expect(mockDependencyGraph.retryStatus.totalTasksSuccessfullyRetried).toBe(2);
      expect(result.totalTasksRequiringRetry).toBe(2); // Original count before retries
      expect(result.totalSuccessfulRetries).toBe(2);
    });

    it('should handle dependency installation errors gracefully', () => {
      // Setup: Tasks requiring retry with dependency installation failure
      const failedTask = { ...mockFailedTask };
      const tasksRequiringRetry = new Map([['test-project', [failedTask]]]);
      mockValidator.identifyTasksRequiringRetry.mockReturnValue(tasksRequiringRetry);
      mockPackageManager.needsFullDependencyInstallation.mockReturnValue(true);
      mockPackageManager.projectInstallDependencies.mockReturnValue({
        success: false,
        projectDir: 'test-project',
        error: 'npm install failed',
        warnings: ['Warning: deprecated package'],
        durationMs: 1000,
        timedOut: false,
      });

      // Execute
      const result = orchestrateRetryAttempts(mockDependencyGraph, codeqlExePath);

      // Verify error handling
      expect(result.projectsWithFailedDependencyInstallation).toEqual(['test-project']);
      expect(mockDependencyGraph.errors.warnings).toHaveLength(1);
      expect(mockDependencyGraph.errors.warnings[0].message).toBe('Warning: deprecated package');
      expect(mockDependencyGraph.errors.warnings[0].phase).toBe('retry_dependency_installation');
    });

    it('should handle dependency installation exceptions', () => {
      // Setup: Tasks requiring retry with dependency installation throwing exception
      const failedTask = { ...mockFailedTask };
      const tasksRequiringRetry = new Map([['test-project', [failedTask]]]);
      mockValidator.identifyTasksRequiringRetry.mockReturnValue(tasksRequiringRetry);
      mockPackageManager.needsFullDependencyInstallation.mockReturnValue(true);
      mockPackageManager.projectInstallDependencies.mockImplementation(() => {
        throw new Error('Installation crashed');
      });

      // Execute
      const result = orchestrateRetryAttempts(mockDependencyGraph, codeqlExePath);

      // Verify exception handling
      expect(result.projectsWithFailedDependencyInstallation).toEqual(['test-project']);
      expect(mockDependencyGraph.errors.critical).toHaveLength(1);
      expect(mockDependencyGraph.errors.critical[0].message).toContain(
        'Failed to install full dependencies for project test-project: Error: Installation crashed',
      );
      expect(mockDependencyGraph.errors.critical[0].phase).toBe('retry_dependency_installation');
    });

    it('should handle retry compilation failures', () => {
      // Setup: Tasks requiring retry with compilation failures
      const failedTask = { ...mockFailedTask };
      const tasksRequiringRetry = new Map([['test-project', [failedTask]]]);
      mockValidator.identifyTasksRequiringRetry.mockReturnValue(tasksRequiringRetry);
      mockPackageManager.needsFullDependencyInstallation.mockReturnValue(false);

      // Mock failed compilation retry
      mockCompile.compileCdsToJson.mockReturnValue({
        success: false,
        message: 'Compilation failed with errors',
        durationMs: 500,
      });

      // Execute
      const result = orchestrateRetryAttempts(mockDependencyGraph, codeqlExePath);

      // Verify failure handling
      expect(result.totalSuccessfulRetries).toBe(0);
      expect(result.totalFailedRetries).toBe(1);
      expect(mockLogging.cdsExtractorLog).toHaveBeenCalledWith(
        'warn',
        expect.stringContaining('Retry failed for task task-1:'),
      );
    });

    it('should handle retry compilation exceptions', () => {
      // Setup: Tasks requiring retry with compilation throwing exceptions
      const failedTask = { ...mockFailedTask };
      const tasksRequiringRetry = new Map([['test-project', [failedTask]]]);
      mockValidator.identifyTasksRequiringRetry.mockReturnValue(tasksRequiringRetry);
      mockPackageManager.needsFullDependencyInstallation.mockReturnValue(false);

      // Mock compilation throwing exception
      mockCompile.compileCdsToJson.mockImplementation(() => {
        throw new Error('Compilation crashed');
      });

      // Execute
      const result = orchestrateRetryAttempts(mockDependencyGraph, codeqlExePath);

      // Verify exception handling - the error is caught and stored in attempt.error,
      // which causes the retry to be marked as failed
      expect(result.totalSuccessfulRetries).toBe(0);
      expect(result.totalFailedRetries).toBe(1);
      expect(mockLogging.cdsExtractorLog).toHaveBeenCalledWith(
        'warn',
        expect.stringContaining('Retry failed for task task-1:'),
      );
    });

    it('should handle retry orchestration exceptions', () => {
      // Setup: Force an exception in the main try block
      mockValidator.identifyTasksRequiringRetry.mockImplementation(() => {
        throw new Error('Validator crashed');
      });

      // Execute
      const result = orchestrateRetryAttempts(mockDependencyGraph, codeqlExePath);

      // Verify orchestration exception handling
      expect(result.success).toBe(false);
      expect(mockDependencyGraph.errors.critical).toHaveLength(1);
      expect(mockDependencyGraph.errors.critical[0].message).toBe(
        'Retry orchestration failed: Error: Validator crashed',
      );
      expect(mockDependencyGraph.errors.critical[0].phase).toBe('retry_orchestration');
      expect(mockLogging.cdsExtractorLog).toHaveBeenCalledWith(
        'error',
        'Retry orchestration failed: Error: Validator crashed',
      );
    });

    it('should handle missing project in dependency graph', () => {
      // Setup: Tasks requiring retry but project not found in dependency graph
      const failedTask = { ...mockFailedTask };
      const tasksRequiringRetry = new Map([['missing-project', [failedTask]]]);
      mockValidator.identifyTasksRequiringRetry.mockReturnValue(tasksRequiringRetry);

      // Execute
      const result = orchestrateRetryAttempts(mockDependencyGraph, codeqlExePath);

      // Verify graceful handling of missing project
      expect(result.totalTasksRequiringRetry).toBe(1);
      expect(result.totalSuccessfulRetries).toBe(0);
      expect(result.totalFailedRetries).toBe(0);
      expect(result.projectsWithRetries).toHaveLength(0);
    });

    it('should call addCompilationDiagnostic for failed tasks', () => {
      // Setup: Tasks with failed retry attempts
      const failedTask = { ...mockFailedTask };
      failedTask.retryInfo = { hasBeenRetried: true, retryReason: 'Test retry' };
      failedTask.status = 'failed'; // Ensure task is marked as failed
      mockProject.compilationTasks = [failedTask];

      const tasksRequiringRetry = new Map([['test-project', [failedTask]]]);
      mockValidator.identifyTasksRequiringRetry.mockReturnValue(tasksRequiringRetry);
      mockPackageManager.needsFullDependencyInstallation.mockReturnValue(false);

      // Mock failed compilation retry
      mockCompile.compileCdsToJson.mockReturnValue({
        success: false,
        message: 'Compilation failed',
        durationMs: 500,
      });

      // Execute
      orchestrateRetryAttempts(mockDependencyGraph, codeqlExePath);

      // Verify diagnostics are added for failed tasks
      expect(mockDiagnostics.addCompilationDiagnostic).toHaveBeenCalledWith(
        '/test/project/db/schema.cds',
        expect.any(String),
        codeqlExePath,
        '/test',
      );
    });

    it('should call addCompilationDiagnostic for tasks that were never retried', () => {
      // Setup: Tasks with no retry info (never retried)
      const failedTask = { ...mockFailedTask };
      failedTask.retryInfo = undefined;
      failedTask.status = 'failed'; // Ensure task is marked as failed
      mockProject.compilationTasks = [failedTask];

      const tasksRequiringRetry = new Map([['test-project', [failedTask]]]);
      mockValidator.identifyTasksRequiringRetry.mockReturnValue(tasksRequiringRetry);
      mockPackageManager.needsFullDependencyInstallation.mockReturnValue(false);

      // Mock failed compilation retry
      mockCompile.compileCdsToJson.mockReturnValue({
        success: false,
        message: 'Compilation failed',
        durationMs: 500,
      });

      orchestrateRetryAttempts(mockDependencyGraph, codeqlExePath);

      // Verify diagnostics are added for tasks that were never retried (retryInfo is undefined)
      expect(mockDiagnostics.addCompilationDiagnostic).toHaveBeenCalledWith(
        '/test/project/db/schema.cds',
        expect.any(String),
        codeqlExePath,
        '/test',
      );
    });

    it('should set success to true when totalTasksRequiringRetry is 0', () => {
      // Setup: No tasks requiring retry
      mockValidator.identifyTasksRequiringRetry.mockReturnValue(new Map());

      // Execute
      const result = orchestrateRetryAttempts(mockDependencyGraph, codeqlExePath);

      // Verify success condition
      expect(result.success).toBe(true);
      expect(result.totalTasksRequiringRetry).toBe(0);
    });

    it('should set success to true when totalSuccessfulRetries > 0', () => {
      // Setup: Tasks requiring retry with successful retries
      const failedTask = { ...mockFailedTask };
      const tasksRequiringRetry = new Map([['test-project', [failedTask]]]);
      mockValidator.identifyTasksRequiringRetry.mockReturnValue(tasksRequiringRetry);
      mockPackageManager.needsFullDependencyInstallation.mockReturnValue(false);

      // Mock successful compilation retry
      mockCompile.compileCdsToJson.mockReturnValue({
        success: true,
        outputPath: '/test/project/db/schema.cds.json',
        message: 'Compilation successful',
        durationMs: 500,
      });

      // Execute
      const result = orchestrateRetryAttempts(mockDependencyGraph, codeqlExePath);

      // Verify success condition
      expect(result.success).toBe(true);
      expect(result.totalSuccessfulRetries).toBe(1);
    });

    it('should handle exceptions thrown during task retry setup', () => {
      // This test covers the catch block in retryCompilationTasksForProject (lines 350-355)

      // Setup: Tasks requiring retry
      const failedTask = { ...mockFailedTask };
      const tasksRequiringRetry = new Map([['test-project', [failedTask]]]);
      mockValidator.identifyTasksRequiringRetry.mockReturnValue(tasksRequiringRetry);
      mockPackageManager.needsFullDependencyInstallation.mockReturnValue(false);

      // Force an exception by making compileCdsToJson throw after being called
      mockCompile.compileCdsToJson.mockImplementation(() => {
        throw new Error('Simulated exception in retry compilation');
      });

      // We need to check that the task object becomes modified correctly
      const originalTask = failedTask;

      // Execute
      const result = orchestrateRetryAttempts(mockDependencyGraph, codeqlExePath);

      // Verify exception handling - the exception is caught by retryCompilationTask
      // and stored in the attempt.error, so it doesn't reach the catch block
      expect(result.totalFailedRetries).toBe(1);
      expect(result.totalSuccessfulRetries).toBe(0);
      expect(originalTask.status).toBe('failed');
      expect(originalTask.retryInfo?.hasBeenRetried).toBe(true);
    });
  });
});
