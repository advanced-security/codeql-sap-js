import * as childProcess from 'child_process';

import {
  orchestrateCdsIndexer,
  projectUsesCdsIndexer,
  runCdsIndexer,
} from '../../../src/cds/indexer';
import { CdsDependencyGraph, CdsProject, PackageJson } from '../../../src/cds/parser/types';

// Mock dependencies
jest.mock('child_process', () => ({
  execFileSync: jest.fn(),
  spawnSync: jest.fn(),
}));

jest.mock('../../../src/logging', () => ({
  cdsExtractorLog: jest.fn(),
  logPerformanceTrackingStart: jest.fn(),
  logPerformanceTrackingStop: jest.fn(),
}));

jest.mock('../../../src/diagnostics', () => ({
  addCdsIndexerDiagnostic: jest.fn().mockReturnValue(true),
  DiagnosticSeverity: {
    Error: 'error',
    Warning: 'warning',
  },
}));

// Helper to create a minimal CdsProject mock
function createMockProject(projectDir: string, packageJson?: PackageJson): CdsProject {
  return {
    id: `project-${projectDir}`,
    cdsFiles: [`${projectDir}/db/schema.cds`],
    compilationTargets: ['db'],
    compilationTasks: [],
    dependencies: [],
    expectedOutputFile: 'model.cds.json',
    imports: new Map(),
    packageJson,
    projectDir,
    status: 'dependencies_resolved',
    timestamps: { discovered: new Date() },
  };
}

// Helper to create a minimal CdsDependencyGraph mock
function createMockDependencyGraph(
  projects: CdsProject[],
  sourceRootDir: string = '/source',
): CdsDependencyGraph {
  const projectsMap = new Map<string, CdsProject>();
  for (const project of projects) {
    projectsMap.set(project.projectDir, project);
  }

  return {
    id: 'test-graph',
    sourceRootDir,
    projects: projectsMap,
    config: {
      maxRetryAttempts: 3,
      enableDetailedLogging: false,
      generateDebugOutput: false,
      compilationTimeoutMs: 30000,
    },
    debugInfo: {} as CdsDependencyGraph['debugInfo'],
    statusSummary: {
      totalProjects: projects.length,
      totalCdsFiles: projects.length,
      totalCompilationTasks: 0,
      successfulCompilations: 0,
      failedCompilations: 0,
      skippedCompilations: 0,
      jsonFilesGenerated: 0,
      overallSuccess: true,
      criticalErrors: [],
      warnings: [],
      performance: {
        totalDurationMs: 0,
        parsingDurationMs: 0,
        compilationDurationMs: 0,
        extractionDurationMs: 0,
      },
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
    currentPhase: 'parsing',
  };
}

describe('cds/indexer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // projectUsesCdsIndexer
  // =========================================================================
  describe('projectUsesCdsIndexer', () => {
    it('should return true when @sap/cds-indexer is in dependencies', () => {
      const project = createMockProject('myProject', {
        name: 'my-cap-app',
        dependencies: {
          '@sap/cds': '^7.0.0',
          '@sap/cds-indexer': '^1.0.0',
        },
      });

      expect(projectUsesCdsIndexer(project)).toBe(true);
    });

    it('should return true when @sap/cds-indexer is in devDependencies', () => {
      const project = createMockProject('myProject', {
        name: 'my-cap-app',
        dependencies: { '@sap/cds': '^7.0.0' },
        devDependencies: { '@sap/cds-indexer': '^1.0.0' },
      });

      expect(projectUsesCdsIndexer(project)).toBe(true);
    });

    it('should return false when @sap/cds-indexer is not listed', () => {
      const project = createMockProject('myProject', {
        name: 'my-cap-app',
        dependencies: { '@sap/cds': '^7.0.0' },
        devDependencies: { '@sap/cds-dk': '^7.0.0' },
      });

      expect(projectUsesCdsIndexer(project)).toBe(false);
    });

    it('should return false when project has no package.json', () => {
      const project = createMockProject('myProject');

      expect(projectUsesCdsIndexer(project)).toBe(false);
    });

    it('should return false when package.json has no dependencies', () => {
      const project = createMockProject('myProject', {
        name: 'my-cap-app',
      });

      expect(projectUsesCdsIndexer(project)).toBe(false);
    });

    it('should return true when @sap/cds-indexer is in both dependencies and devDependencies', () => {
      const project = createMockProject('myProject', {
        name: 'my-cap-app',
        dependencies: { '@sap/cds-indexer': '^1.0.0' },
        devDependencies: { '@sap/cds-indexer': '^1.0.0' },
      });

      expect(projectUsesCdsIndexer(project)).toBe(true);
    });
  });

  // =========================================================================
  // runCdsIndexer
  // =========================================================================
  describe('runCdsIndexer', () => {
    it('should run npx @sap/cds-indexer successfully', () => {
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 0,
        stdout: Buffer.from('Indexing complete'),
        stderr: Buffer.from(''),
        error: undefined,
      });

      const project = createMockProject('myProject', {
        name: 'my-cap-app',
        dependencies: { '@sap/cds-indexer': '^1.0.0' },
      });

      const result = runCdsIndexer(project, '/source');

      expect(result.success).toBe(true);
      expect(result.projectDir).toBe('myProject');
      expect(result.error).toBeUndefined();
      expect(childProcess.spawnSync).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['@sap/cds-indexer']),
        expect.objectContaining({
          cwd: expect.stringContaining('myProject'),
        }),
      );
    });

    it('should handle cds-indexer command failure gracefully', () => {
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 1,
        stdout: Buffer.from(''),
        stderr: Buffer.from('Command failed'),
        error: undefined,
      });

      const project = createMockProject('myProject', {
        name: 'my-cap-app',
        dependencies: { '@sap/cds-indexer': '^1.0.0' },
      });

      const result = runCdsIndexer(project, '/source');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('failed');
    });

    it('should handle cds-indexer spawn error gracefully', () => {
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: null,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
        error: new Error('spawn ENOENT'),
      });

      const project = createMockProject('myProject', {
        name: 'my-cap-app',
        dependencies: { '@sap/cds-indexer': '^1.0.0' },
      });

      const result = runCdsIndexer(project, '/source');

      expect(result.success).toBe(false);
      expect(result.error).toContain('ENOENT');
    });

    it('should handle exception during cds-indexer execution', () => {
      (childProcess.spawnSync as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected exception');
      });

      const project = createMockProject('myProject', {
        name: 'my-cap-app',
        dependencies: { '@sap/cds-indexer': '^1.0.0' },
      });

      const result = runCdsIndexer(project, '/source');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unexpected exception');
    });

    it('should handle timeout during cds-indexer execution', () => {
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: null,
        signal: 'SIGTERM',
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
        error: undefined,
      });

      const project = createMockProject('myProject', {
        name: 'my-cap-app',
        dependencies: { '@sap/cds-indexer': '^1.0.0' },
      });

      const result = runCdsIndexer(project, '/source');

      expect(result.success).toBe(false);
      expect(result.timedOut).toBe(true);
    });

    it('should use cache directory when provided', () => {
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 0,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
        error: undefined,
      });

      const project = createMockProject('myProject', {
        name: 'my-cap-app',
        dependencies: { '@sap/cds-indexer': '^1.0.0' },
      });

      const result = runCdsIndexer(project, '/source', '/source/.cds-extractor-cache/cds-abc123');

      expect(result.success).toBe(true);
      expect(childProcess.spawnSync).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['@sap/cds-indexer']),
        expect.objectContaining({
          env: expect.objectContaining({
            NODE_PATH: expect.stringContaining('node_modules'),
          }),
        }),
      );
    });
  });

  // =========================================================================
  // orchestrateCdsIndexer
  // =========================================================================
  describe('orchestrateCdsIndexer', () => {
    it('should skip projects that do not use cds-indexer', () => {
      const project = createMockProject('myProject', {
        name: 'my-cap-app',
        dependencies: { '@sap/cds': '^7.0.0' },
      });
      const graph = createMockDependencyGraph([project]);

      const summary = orchestrateCdsIndexer(graph, '/source', new Map());

      expect(summary.totalProjects).toBe(1);
      expect(summary.projectsRequiringIndexer).toBe(0);
      expect(summary.successfulRuns).toBe(0);
      expect(summary.failedRuns).toBe(0);
      expect(childProcess.spawnSync).not.toHaveBeenCalled();
    });

    it('should run cds-indexer for projects that use it', () => {
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 0,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
        error: undefined,
      });

      const project = createMockProject('myProject', {
        name: 'my-cap-app',
        dependencies: {
          '@sap/cds': '^7.0.0',
          '@sap/cds-indexer': '^1.0.0',
        },
      });
      const graph = createMockDependencyGraph([project]);

      const summary = orchestrateCdsIndexer(graph, '/source', new Map());

      expect(summary.projectsRequiringIndexer).toBe(1);
      expect(summary.successfulRuns).toBe(1);
      expect(summary.failedRuns).toBe(0);
    });

    it('should handle mixed projects (some with cds-indexer, some without)', () => {
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 0,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
        error: undefined,
      });

      const projectWithIndexer = createMockProject('projectA', {
        name: 'project-a',
        dependencies: {
          '@sap/cds': '^7.0.0',
          '@sap/cds-indexer': '^1.0.0',
        },
      });
      const projectWithoutIndexer = createMockProject('projectB', {
        name: 'project-b',
        dependencies: { '@sap/cds': '^7.0.0' },
      });
      const graph = createMockDependencyGraph([projectWithIndexer, projectWithoutIndexer]);

      const summary = orchestrateCdsIndexer(graph, '/source', new Map());

      expect(summary.totalProjects).toBe(2);
      expect(summary.projectsRequiringIndexer).toBe(1);
      expect(summary.successfulRuns).toBe(1);
      expect(summary.failedRuns).toBe(0);
    });

    it('should add diagnostic when cds-indexer fails and codeqlExePath is provided', () => {
      const { addCdsIndexerDiagnostic } = jest.requireMock('../../../src/diagnostics');

      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 1,
        stdout: Buffer.from(''),
        stderr: Buffer.from('indexer error'),
        error: undefined,
      });

      const project = createMockProject('myProject', {
        name: 'my-cap-app',
        dependencies: {
          '@sap/cds': '^7.0.0',
          '@sap/cds-indexer': '^1.0.0',
        },
      });
      const graph = createMockDependencyGraph([project]);

      const summary = orchestrateCdsIndexer(graph, '/source', new Map(), '/path/to/codeql');

      expect(summary.failedRuns).toBe(1);
      expect(addCdsIndexerDiagnostic).toHaveBeenCalledWith(
        'myProject',
        expect.any(String),
        '/path/to/codeql',
        '/source',
      );
    });

    it('should handle empty dependency graph', () => {
      const graph = createMockDependencyGraph([]);

      const summary = orchestrateCdsIndexer(graph, '/source', new Map());

      expect(summary.totalProjects).toBe(0);
      expect(summary.projectsRequiringIndexer).toBe(0);
      expect(summary.successfulRuns).toBe(0);
      expect(summary.failedRuns).toBe(0);
    });

    it('should continue processing other projects when one fails', () => {
      (childProcess.spawnSync as jest.Mock)
        .mockReturnValueOnce({
          status: 1,
          stdout: Buffer.from(''),
          stderr: Buffer.from('error'),
          error: undefined,
        })
        .mockReturnValueOnce({
          status: 0,
          stdout: Buffer.from(''),
          stderr: Buffer.from(''),
          error: undefined,
        });

      const projectA = createMockProject('projectA', {
        name: 'project-a',
        dependencies: {
          '@sap/cds': '^7.0.0',
          '@sap/cds-indexer': '^1.0.0',
        },
      });
      const projectB = createMockProject('projectB', {
        name: 'project-b',
        dependencies: {
          '@sap/cds': '^7.0.0',
          '@sap/cds-indexer': '^1.0.0',
        },
      });
      const graph = createMockDependencyGraph([projectA, projectB]);

      const summary = orchestrateCdsIndexer(graph, '/source', new Map());

      expect(summary.projectsRequiringIndexer).toBe(2);
      expect(summary.successfulRuns).toBe(1);
      expect(summary.failedRuns).toBe(1);
    });

    it('should pass cache directory to runCdsIndexer when available', () => {
      (childProcess.spawnSync as jest.Mock).mockReturnValue({
        status: 0,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
        error: undefined,
      });

      const project = createMockProject('myProject', {
        name: 'my-cap-app',
        dependencies: {
          '@sap/cds': '^7.0.0',
          '@sap/cds-indexer': '^1.0.0',
        },
      });
      const graph = createMockDependencyGraph([project]);
      const projectCacheDirMap = new Map([['myProject', '/source/.cds-extractor-cache/cds-abc']]);

      const summary = orchestrateCdsIndexer(graph, '/source', projectCacheDirMap);

      expect(summary.successfulRuns).toBe(1);
      expect(childProcess.spawnSync).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['@sap/cds-indexer']),
        expect.objectContaining({
          env: expect.objectContaining({
            NODE_PATH: expect.stringContaining('node_modules'),
          }),
        }),
      );
    });
  });
});
