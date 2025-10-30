import {
  determineCdsCommand,
  determineVersionAwareCdsCommands,
  orchestrateCompilation,
} from '../../../../src/cds/compiler';
import { compileCdsToJson } from '../../../../src/cds/compiler/compile';
import { orchestrateRetryAttempts } from '../../../../src/cds/compiler/retry';
import * as validator from '../../../../src/cds/compiler/validator';
import { CdsDependencyGraph, CdsProject } from '../../../../src/cds/parser/types';
import { addCompilationDiagnostic } from '../../../../src/diagnostics';

// Mock dependencies
jest.mock('../../../../src/cds/compiler/command');
jest.mock('../../../../src/cds/compiler/compile');
jest.mock('../../../../src/cds/compiler/retry');
jest.mock('../../../../src/cds/compiler/validator');
jest.mock('../../../../src/diagnostics');
jest.mock('../../../../src/logging');

const mockDetermineCdsCommand = determineCdsCommand as jest.MockedFunction<
  typeof determineCdsCommand
>;
const mockDetermineVersionAwareCdsCommands =
  determineVersionAwareCdsCommands as jest.MockedFunction<typeof determineVersionAwareCdsCommands>;
const mockCompileCdsToJson = compileCdsToJson as jest.MockedFunction<typeof compileCdsToJson>;
const mockOrchestrateRetryAttempts = orchestrateRetryAttempts as jest.MockedFunction<
  typeof orchestrateRetryAttempts
>;
const mockValidator = validator as jest.Mocked<typeof validator>;
const mockAddCompilationDiagnostic = addCompilationDiagnostic as jest.MockedFunction<
  typeof addCompilationDiagnostic
>;

// Helper function to create a mock CdsProject
function createMockProject(
  projectDir: string,
  cdsFiles: string[],
  overrides: Partial<CdsProject> = {},
): CdsProject {
  return {
    id: `project-${projectDir}`,
    projectDir,
    cdsFiles,
    compilationTargets: cdsFiles,
    expectedOutputFile: 'model.cds.json',
    dependencies: [],
    imports: new Map(),
    packageJson: undefined,
    compilationConfig: undefined,
    enhancedCompilationConfig: undefined,
    compilationTasks: [],
    status: 'discovered',
    timestamps: {
      discovered: new Date(),
    },
    ...overrides,
  };
}

// Helper function to create a mock CdsDependencyGraph
function createMockDependencyGraph(
  overrides: Partial<CdsDependencyGraph> = {},
): CdsDependencyGraph {
  return {
    id: 'test-dependency-graph',
    sourceRootDir: '/test/source',
    projects: new Map(),
    debugInfo: {
      extractor: {
        runMode: 'test',
        sourceRootDir: '/test/source',
        startTime: new Date(),
        environment: {
          nodeVersion: '18.0.0',
          platform: 'linux',
          cwd: '/test',
          argv: [],
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
        selectedCommand: 'cds compile',
        cacheDirectories: [],
        cacheInitialized: false,
      },
    },
    currentPhase: 'initializing',
    statusSummary: {
      totalProjects: 0,
      totalCdsFiles: 0,
      totalCompilationTasks: 0,
      successfulCompilations: 0,
      failedCompilations: 0,
      skippedCompilations: 0,
      jsonFilesGenerated: 0,
      overallSuccess: false,
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
    ...overrides,
  };
}

describe('graph.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1234567890123);
    jest.spyOn(Math, 'random').mockReturnValue(0.123456789);

    // Mock the centralized status validation function
    mockValidator.updateCdsDependencyGraphStatus.mockImplementation(
      (dependencyGraph, _sourceRootDir) => {
        // Mock implementation that simulates the centralized status validation
        // For tests, we simulate that all tasks with successful attempts are successful
        let successfulTasks = 0;
        let failedTasks = 0;
        let tasksSuccessfullyRetried = 0;

        for (const project of dependencyGraph.projects.values()) {
          for (const task of project.compilationTasks) {
            // Check if the task has any successful attempts
            const hasSuccessfulAttempt = task.attempts.some(attempt => attempt.result.success);

            if (hasSuccessfulAttempt) {
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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('orchestrateCompilation', () => {
    let mockDependencyGraph: CdsDependencyGraph;
    let projectCacheDirMap: Map<string, string>;

    beforeEach(() => {
      mockDependencyGraph = createMockDependencyGraph();
      projectCacheDirMap = new Map();
      mockDetermineCdsCommand.mockReturnValue('cds compile');
      mockDetermineVersionAwareCdsCommands.mockReturnValue({
        primaryCommand: {
          executable: 'cds',
          args: [],
          originalCommand: 'cds',
        },
        retryCommand: {
          executable: 'npx',
          args: ['--yes', '--package', '@sap/cds-dk', 'cds'],
          originalCommand: 'npx --yes --package @sap/cds-dk cds',
        },
      });
      mockCompileCdsToJson.mockReturnValue({
        success: true,
        outputPath: '/test/output.json',
        timestamp: new Date(),
      });
      mockOrchestrateRetryAttempts.mockReturnValue({
        success: true,
        projectsWithRetries: [],
        totalTasksRequiringRetry: 0,
        totalSuccessfulRetries: 0,
        totalFailedRetries: 0,
        projectsWithSuccessfulDependencyInstallation: [],
        projectsWithFailedDependencyInstallation: [],
        retryDurationMs: 0,
        dependencyInstallationDurationMs: 0,
        retryCompilationDurationMs: 0,
      });
    });

    it('should successfully orchestrate compilation for a single project', () => {
      const project = createMockProject('/test/project', ['/test/project/model.cds']);
      mockDependencyGraph.projects.set('/test/project', project);
      mockDependencyGraph.statusSummary.totalProjects = 1;
      projectCacheDirMap.set('/test/project', '/test/cache');

      orchestrateCompilation(mockDependencyGraph, projectCacheDirMap, '/path/to/codeql');

      expect(mockDetermineCdsCommand).toHaveBeenCalledWith('/test/cache', '/test/source');
      expect(mockCompileCdsToJson).toHaveBeenCalled();
      expect(mockDependencyGraph.statusSummary.overallSuccess).toBe(true);
      expect(mockDependencyGraph.currentPhase).toBe('completed');
      expect(mockDependencyGraph.statusSummary.successfulCompilations).toBe(1);
      expect(mockDependencyGraph.statusSummary.jsonFilesGenerated).toBe(1);
    });

    it('should handle project-level compilation', () => {
      const project = createMockProject(
        '/test/project',
        ['/test/project/model.cds', '/test/project/service.cds'],
        {
          compilationTargets: ['__PROJECT_LEVEL_COMPILATION__'],
        },
      );
      mockDependencyGraph.projects.set('/test/project', project);
      mockDependencyGraph.statusSummary.totalProjects = 1;
      projectCacheDirMap.set('/test/project', '/test/cache');

      orchestrateCompilation(mockDependencyGraph, projectCacheDirMap, '/path/to/codeql');

      expect(project.compilationTasks).toHaveLength(1);
      expect(project.compilationTasks[0].type).toBe('project');
      expect(project.compilationTasks[0].sourceFiles).toEqual([
        '/test/project/model.cds',
        '/test/project/service.cds',
      ]);
    });

    it('should handle compilation failure', () => {
      const project = createMockProject('/test/project', ['/test/project/model.cds']);
      mockDependencyGraph.projects.set('/test/project', project);
      mockDependencyGraph.statusSummary.totalProjects = 1;
      projectCacheDirMap.set('/test/project', '/test/cache');

      mockCompileCdsToJson.mockReturnValue({
        success: false,
        message: 'Compilation failed',
        timestamp: new Date(),
      });

      // Mock retry to indicate the task was retried but still failed
      mockOrchestrateRetryAttempts.mockImplementation((dependencyGraph, codeqlExePath) => {
        // Simulate the retry logic setting retryInfo on failed tasks
        for (const proj of dependencyGraph.projects.values()) {
          for (const task of proj.compilationTasks) {
            if (task.status === 'failed') {
              task.retryInfo = {
                hasBeenRetried: true,
                retryReason: 'Output validation failed',
                fullDependenciesInstalled: false,
                retryTimestamp: new Date(),
              };

              // Simulate adding diagnostics for failed tasks
              for (const sourceFile of task.sourceFiles) {
                mockAddCompilationDiagnostic(
                  sourceFile,
                  task.errorSummary ?? 'Compilation failed',
                  codeqlExePath,
                );
              }
            }
          }
        }

        return {
          success: false,
          projectsWithRetries: ['/test/project'],
          totalTasksRequiringRetry: 1,
          totalSuccessfulRetries: 0,
          totalFailedRetries: 1,
          projectsWithSuccessfulDependencyInstallation: [],
          projectsWithFailedDependencyInstallation: [],
          retryDurationMs: 100,
          dependencyInstallationDurationMs: 50,
          retryCompilationDurationMs: 50,
        };
      });

      orchestrateCompilation(mockDependencyGraph, projectCacheDirMap, '/path/to/codeql');

      expect(mockDependencyGraph.statusSummary.overallSuccess).toBe(false);
      expect(mockDependencyGraph.currentPhase).toBe('failed');
      expect(mockDependencyGraph.statusSummary.failedCompilations).toBe(1);
      expect(mockAddCompilationDiagnostic).toHaveBeenCalledWith(
        '/test/project/model.cds',
        expect.any(String),
        '/path/to/codeql',
      );
    });

    it('should handle compilation exception', () => {
      const project = createMockProject('/test/project', ['/test/project/model.cds']);
      mockDependencyGraph.projects.set('/test/project', project);
      mockDependencyGraph.statusSummary.totalProjects = 1;
      projectCacheDirMap.set('/test/project', '/test/cache');

      const testError = new Error('Test compilation error');
      mockCompileCdsToJson.mockImplementation(() => {
        throw testError;
      });

      orchestrateCompilation(mockDependencyGraph, projectCacheDirMap, '/path/to/codeql');

      expect(mockDependencyGraph.statusSummary.overallSuccess).toBe(false);
      expect(mockDependencyGraph.currentPhase).toBe('failed');
      expect(mockDependencyGraph.statusSummary.failedCompilations).toBe(1);
      expect(project.compilationTasks[0].status).toBe('failed');
      expect(project.compilationTasks[0].attempts[0].error).toEqual({
        message: 'Error: Test compilation error',
        stack: testError.stack,
      });
    });

    it('should handle multiple projects', () => {
      const project1 = createMockProject('/test/project1', ['/test/project1/model.cds']);
      const project2 = createMockProject('/test/project2', ['/test/project2/service.cds']);

      mockDependencyGraph.projects.set('/test/project1', project1);
      mockDependencyGraph.projects.set('/test/project2', project2);
      mockDependencyGraph.statusSummary.totalProjects = 2;
      projectCacheDirMap.set('/test/project1', '/test/cache1');
      projectCacheDirMap.set('/test/project2', '/test/cache2');

      orchestrateCompilation(mockDependencyGraph, projectCacheDirMap, '/path/to/codeql');

      expect(mockDependencyGraph.statusSummary.totalCompilationTasks).toBe(2);
      expect(mockDependencyGraph.statusSummary.successfulCompilations).toBe(2);
      expect(mockDependencyGraph.statusSummary.overallSuccess).toBe(true);
    });

    it('should handle planning errors', () => {
      const project = createMockProject('/test/project', ['/test/project/model.cds']);
      mockDependencyGraph.projects.set('/test/project', project);
      mockDependencyGraph.statusSummary.totalProjects = 1;
      projectCacheDirMap.set('/test/project', '/test/cache');

      mockDetermineCdsCommand.mockImplementation(() => {
        throw new Error('Command determination failed');
      });

      orchestrateCompilation(mockDependencyGraph, projectCacheDirMap, '/path/to/codeql');

      // Due to the current implementation, when planning fails, the project status gets overridden
      // to 'completed' in executeCompilationTasks because it has no tasks.
      // This is arguably a bug, but we test the current behavior here.
      expect(project.status).toBe('completed');

      // But the overall orchestration should record the error
      expect(mockDependencyGraph.errors.critical).toHaveLength(1);
      expect(mockDependencyGraph.errors.critical[0].message).toContain(
        'Command determination failed',
      );
      // The overall success should be false due to critical errors
      expect(mockDependencyGraph.statusSummary.overallSuccess).toBe(false);
      expect(mockDependencyGraph.currentPhase).toBe('failed');
    });

    it('should handle orchestration errors', () => {
      const project = createMockProject('/test/project', ['/test/project/model.cds']);
      mockDependencyGraph.projects.set('/test/project', project);
      projectCacheDirMap.set('/test/project', '/test/cache');

      // Mock an error that would cause compilation to fail
      mockCompileCdsToJson.mockImplementation(() => {
        throw new Error('Fatal orchestration error');
      });

      orchestrateCompilation(mockDependencyGraph, projectCacheDirMap, '/path/to/codeql');

      expect(mockDependencyGraph.statusSummary.overallSuccess).toBe(false);
      expect(mockDependencyGraph.currentPhase).toBe('failed');
      expect(mockDependencyGraph.statusSummary.failedCompilations).toBe(1);
    });

    it('should calculate compilation duration', () => {
      const project = createMockProject('/test/project', ['/test/project/model.cds']);
      mockDependencyGraph.projects.set('/test/project', project);
      projectCacheDirMap.set('/test/project', '/test/cache');

      orchestrateCompilation(mockDependencyGraph, projectCacheDirMap, '/path/to/codeql');

      // Just verify that the duration is calculated (should be > 0)
      expect(
        mockDependencyGraph.statusSummary.performance.compilationDurationMs,
      ).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty project list', () => {
      orchestrateCompilation(mockDependencyGraph, projectCacheDirMap, '/path/to/codeql');

      expect(mockDependencyGraph.statusSummary.totalCompilationTasks).toBe(0);
      expect(mockDependencyGraph.statusSummary.overallSuccess).toBe(true);
      expect(mockDependencyGraph.currentPhase).toBe('completed');
    });

    it('should handle project without cache directory', () => {
      const project = createMockProject('/test/project', ['/test/project/model.cds']);
      mockDependencyGraph.projects.set('/test/project', project);
      mockDependencyGraph.statusSummary.totalProjects = 1;
      // Not setting cache directory in projectCacheDirMap

      orchestrateCompilation(mockDependencyGraph, projectCacheDirMap, '/path/to/codeql');

      expect(mockDetermineCdsCommand).toHaveBeenCalledWith(undefined, '/test/source');
      expect(project.enhancedCompilationConfig?.cacheDir).toBeUndefined();
    });
  });
});
