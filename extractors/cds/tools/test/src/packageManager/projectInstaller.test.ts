/** Tests for CDS compiler installer functionality */

import { execFileSync } from 'child_process';

import type { CdsProject } from '../../../src/cds/parser';
import {
  needsFullDependencyInstallation,
  projectInstallDependencies,
} from '../../../src/packageManager';

// Mock all external dependencies
jest.mock('child_process');

const mockExecFileSync = execFileSync as jest.MockedFunction<typeof execFileSync>;

describe('CDS Compiler Installer', () => {
  const mockSourceRoot = '/test/source';

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Date.now to return a consistent timestamp for testing
    jest.spyOn(Date, 'now').mockReturnValue(1640995200000);
    // Mock process.hrtime.bigint for performance timing
    jest.spyOn(process.hrtime, 'bigint').mockReturnValue(BigInt(1640995200000000000));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Helper to create minimal valid CdsProject
  const createMockProject = (overrides: Partial<CdsProject> = {}): CdsProject => ({
    id: 'test-project-id',
    projectDir: 'test-project',
    cdsFiles: [],
    compilationTasks: [],
    status: 'discovered' as const,
    timestamps: { discovered: new Date() },
    compilationTargets: [],
    expectedOutputFile: 'model.cds.json',
    packageJson: {
      name: 'test-package',
      version: '1.0.0',
      dependencies: { dep1: '^1.0.0' },
      devDependencies: { 'dev-dep1': '^2.0.0' },
    },
    ...overrides,
  });

  describe('projectInstallDependencies', () => {
    it('should successfully install dependencies and return success result', () => {
      const project = createMockProject();

      mockExecFileSync.mockReturnValue(Buffer.from(''));

      const result = projectInstallDependencies(project, mockSourceRoot);

      expect(result.success).toBe(true);
      expect(result.projectDir).toBe('/test/source/test-project');
      expect(result.error).toBeUndefined();
      expect(result.warnings).toEqual([]);
      expect(result.timedOut).toBe(false);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);

      expect(mockExecFileSync).toHaveBeenCalledWith(
        'npm',
        ['install', '--quiet', '--no-audit', '--no-fund'],
        {
          cwd: '/test/source/test-project',
          stdio: 'inherit',
          timeout: 120000,
        },
      );
    });

    it('should handle npm install timeout gracefully', () => {
      const project = createMockProject();

      const timeoutError = new Error('Command timed out') as Error & { signal: string };
      timeoutError.signal = 'SIGTERM';
      mockExecFileSync.mockImplementation(() => {
        throw timeoutError;
      });

      const result = projectInstallDependencies(project, mockSourceRoot);

      expect(result.success).toBe(false);
      expect(result.timedOut).toBe(true);
      expect(result.error).toBe('Dependency installation timed out');
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain(
        'Dependency installation failed but will still attempt retry compilation',
      );
    });

    it('should handle npm install failure gracefully', () => {
      const project = createMockProject();

      const installError = new Error('npm install failed');
      mockExecFileSync.mockImplementation(() => {
        throw installError;
      });

      const result = projectInstallDependencies(project, mockSourceRoot);

      expect(result.success).toBe(false);
      expect(result.error).toContain('npm install failed');
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain(
        'Dependency installation failed but will still attempt retry compilation',
      );
    });

    it('should handle project without package.json', () => {
      const project = createMockProject({ packageJson: undefined });

      const result = projectInstallDependencies(project, mockSourceRoot);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No package.json found for project');
    });
  });

  describe('needsFullDependencyInstallation', () => {
    it('should return true for project with failed tasks and package.json', () => {
      const project = createMockProject({
        compilationTasks: [
          {
            id: 'task1',
            type: 'file',
            status: 'failed',
            sourceFiles: ['test.cds'],
            expectedOutputFile: 'model.cds.json',
            projectDir: 'test-project',
            attempts: [],
            dependencies: [],
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
          },
        ],
      });

      const result = needsFullDependencyInstallation(project);
      expect(result).toBe(true);
    });

    it('should return false for project with already installed dependencies', () => {
      const project = createMockProject({
        retryStatus: {
          fullDependenciesInstalled: true,
          tasksRequiringRetry: 0,
          tasksRetried: 0,
        },
      });

      const result = needsFullDependencyInstallation(project);
      expect(result).toBe(false);
    });

    it('should return false for project without package.json', () => {
      const project = createMockProject({
        packageJson: undefined,
        compilationTasks: [
          {
            id: 'task1',
            type: 'file',
            status: 'failed',
            sourceFiles: ['test.cds'],
            expectedOutputFile: 'model.cds.json',
            projectDir: 'test-project',
            attempts: [],
            dependencies: [],
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
          },
        ],
      });

      const result = needsFullDependencyInstallation(project);
      expect(result).toBe(false);
    });

    it('should return false for project with no failed tasks', () => {
      const project = createMockProject({
        compilationTasks: [
          {
            id: 'task1',
            type: 'file',
            status: 'success',
            sourceFiles: ['test.cds'],
            expectedOutputFile: 'model.cds.json',
            projectDir: 'test-project',
            attempts: [],
            dependencies: [],
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
          },
        ],
      });

      const result = needsFullDependencyInstallation(project);
      expect(result).toBe(false);
    });
  });
});
