import { determineCdsCommand } from '../../../../src/cds/compiler/command';
import { compileCdsToJson } from '../../../../src/cds/compiler/compile';
import { orchestrateCompilation } from '../../../../src/cds/compiler/graph';
import { CdsDependencyGraph, CdsProject } from '../../../../src/cds/parser/types';
import { addCompilationDiagnostic } from '../../../../src/diagnostics';

// Mock dependencies
jest.mock('../../../../src/cds/compiler/command');
jest.mock('../../../../src/cds/compiler/compile');
jest.mock('../../../../src/diagnostics');
jest.mock('../../../../src/logging');

const mockDetermineCdsCommand = determineCdsCommand as jest.MockedFunction<
  typeof determineCdsCommand
>;
const mockCompileCdsToJson = compileCdsToJson as jest.MockedFunction<typeof compileCdsToJson>;
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
    cdsFilesToCompile: cdsFiles,
    expectedOutputFiles: cdsFiles.map(f => `${f}.json`),
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
    ...overrides,
  };
}

describe('graph.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1234567890123);
    jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
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
      mockCompileCdsToJson.mockReturnValue({
        success: true,
        outputPath: '/test/output.json',
        timestamp: new Date(),
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
          cdsFilesToCompile: ['__PROJECT_LEVEL_COMPILATION__'],
        },
      );
      mockDependencyGraph.projects.set('/test/project', project);
      mockDependencyGraph.statusSummary.totalProjects = 1;
      projectCacheDirMap.set('/test/project', '/test/cache');

      orchestrateCompilation(mockDependencyGraph, projectCacheDirMap, '/path/to/codeql');

      expect(project.compilationTasks).toHaveLength(1);
      expect(project.compilationTasks[0].type).toBe('project');
      expect(project.compilationTasks[0].useProjectLevelCompilation).toBe(true);
      expect(project.compilationTasks[0].sourceFiles).toEqual([
        '/test/project/model.cds',
        '/test/project/service.cds',
      ]);
    });

    it('should handle individual file compilation', () => {
      const project = createMockProject('/test/project', [
        '/test/project/model.cds',
        '/test/project/service.cds',
      ]);
      mockDependencyGraph.projects.set('/test/project', project);
      mockDependencyGraph.statusSummary.totalProjects = 1;
      projectCacheDirMap.set('/test/project', '/test/cache');

      orchestrateCompilation(mockDependencyGraph, projectCacheDirMap, '/path/to/codeql');

      expect(project.compilationTasks).toHaveLength(2);
      expect(project.compilationTasks[0].type).toBe('file');
      expect(project.compilationTasks[0].useProjectLevelCompilation).toBe(false);
      expect(project.compilationTasks[0].sourceFiles).toEqual(['/test/project/model.cds']);
      expect(project.compilationTasks[1].sourceFiles).toEqual(['/test/project/service.cds']);
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
