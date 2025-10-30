/** Tests for validation utilities for CDS compilation output files */

import * as fs from 'fs';
import * as path from 'path';

import type { CompilationTask } from '../../../../src/cds/compiler/types';
import {
  identifyTasksRequiringRetry,
  validateOutputFile,
  validateTaskOutputs,
} from '../../../../src/cds/compiler/validator';
import type { CdsDependencyGraph, CdsProject } from '../../../../src/cds/parser';
import * as filesystem from '../../../../src/filesystem';
import * as logging from '../../../../src/logging';

// Mock dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('../../../../src/filesystem');
jest.mock('../../../../src/logging');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;
const mockFilesystem = filesystem as jest.Mocked<typeof filesystem>;
const mockLogging = logging as jest.Mocked<typeof logging>;

describe('validator.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default path behavior
    mockPath.isAbsolute.mockImplementation((p: string) => p.startsWith('/'));
    mockPath.join.mockImplementation((...args: string[]) => args.join('/'));

    // Default logging behavior
    mockLogging.cdsExtractorLog.mockImplementation(() => {});
  });

  describe('validateOutputFile', () => {
    it('should return invalid result when file does not exist', () => {
      const filePath = '/test/output.cds.json';
      mockFilesystem.fileExists.mockReturnValue(false);

      const result = validateOutputFile(filePath);

      expect(result).toEqual({
        isValid: false,
        filePath,
        exists: false,
        error: 'File does not exist',
      });
      expect(mockFilesystem.fileExists).toHaveBeenCalledWith(filePath);
    });

    it('should return invalid result when JSON file is empty', () => {
      const filePath = '/test/output.cds.json';
      mockFilesystem.fileExists.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('   '); // whitespace only

      const result = validateOutputFile(filePath);

      expect(result).toEqual({
        isValid: false,
        filePath,
        exists: true,
        error: 'File is empty',
      });
    });

    it('should return invalid result when JSON file has invalid JSON', () => {
      const filePath = '/test/output.cds.json';
      mockFilesystem.fileExists.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json {');

      const result = validateOutputFile(filePath);

      expect(result.isValid).toBe(false);
      expect(result.exists).toBe(true);
      expect(result.error).toContain('Invalid JSON content:');
    });

    it('should return invalid result when JSON file contains non-object', () => {
      const filePath = '/test/output.cds.json';
      mockFilesystem.fileExists.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('"just a string"');

      const result = validateOutputFile(filePath);

      expect(result).toEqual({
        isValid: false,
        filePath,
        exists: true,
        error: 'File does not contain a valid JSON object',
      });
    });

    it('should return valid result for valid JSON file', () => {
      const filePath = '/test/output.cds.json';
      mockFilesystem.fileExists.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{"valid": "json", "object": true}');

      const result = validateOutputFile(filePath);

      expect(result).toEqual({
        isValid: true,
        filePath,
        exists: true,
        hasValidJson: true,
      });
    });

    it('should return valid result for non-JSON file that exists', () => {
      const filePath = '/test/output.txt';
      mockFilesystem.fileExists.mockReturnValue(true);

      const result = validateOutputFile(filePath);

      expect(result).toEqual({
        isValid: true,
        filePath,
        exists: true,
      });
      expect(mockFs.readFileSync).not.toHaveBeenCalled(); // Should not read non-JSON files
    });

    it('should handle .json files (not just .cds.json)', () => {
      const filePath = '/test/output.json';
      mockFilesystem.fileExists.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{"test": true}');

      const result = validateOutputFile(filePath);

      expect(result.isValid).toBe(true);
      expect(result.hasValidJson).toBe(true);
    });
  });

  describe('validateTaskOutputs', () => {
    let mockTask: CompilationTask;

    beforeEach(() => {
      mockTask = {
        id: 'task-1',
        type: 'file',
        sourceFiles: ['/test/input.cds'],
        expectedOutputFile: 'model.cds.json',
        projectDir: 'test-project',
        status: 'success',
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
      };
    });

    it('should validate single output file and return result', () => {
      const sourceRoot = '/test/root';
      mockTask.expectedOutputFile = 'model.cds.json';

      // Mock path resolution
      mockPath.isAbsolute.mockReturnValue(false);
      mockPath.join.mockReturnValue('/test/root/model.cds.json');

      // Mock file validation - file exists and is valid
      mockFilesystem.fileExists.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{"valid": true}');

      const result = validateTaskOutputs(mockTask, sourceRoot);

      expect(result.task).toBe(mockTask);
      expect(result.expectedFileCount).toBe(1);
      expect(result.validFileCount).toBe(1);
      expect(result.isValid).toBe(true);
      expect(result.fileResults).toHaveLength(1);
      expect(result.fileResults[0].isValid).toBe(true);
    });

    it('should return valid result when all output files are valid', () => {
      const sourceRoot = '/test/root';
      mockTask.expectedOutputFile = 'model.cds.json';

      mockPath.isAbsolute.mockReturnValue(false);
      mockPath.join.mockReturnValue('/test/root/output.cds.json');
      mockFilesystem.fileExists.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{"valid": true}');

      const result = validateTaskOutputs(mockTask, sourceRoot);

      expect(result.isValid).toBe(true);
      expect(result.validFileCount).toBe(1);
      expect(result.expectedFileCount).toBe(1);
    });

    it('should return invalid result when task has empty expected output file', () => {
      const sourceRoot = '/test/root';
      mockTask.expectedOutputFile = '';

      // Mock path behavior for empty file name
      mockPath.isAbsolute.mockReturnValue(false);
      mockPath.join.mockReturnValue('/test/root'); // join with empty string returns just the root
      mockFilesystem.fileExists.mockReturnValue(false); // Empty path should not exist as a file

      const result = validateTaskOutputs(mockTask, sourceRoot);

      expect(result.isValid).toBe(false);
      expect(result.validFileCount).toBe(0);
      expect(result.expectedFileCount).toBe(1);
      expect(result.fileResults).toHaveLength(1);
      expect(result.fileResults[0].isValid).toBe(false);
    });
  });

  describe('identifyTasksRequiringRetry', () => {
    let mockDependencyGraph: CdsDependencyGraph;
    let mockProject: CdsProject;
    let mockTask1: CompilationTask;
    let mockTask2: CompilationTask;

    beforeEach(() => {
      mockTask1 = {
        id: 'task-1',
        type: 'file',
        sourceFiles: ['/test/input1.cds'],
        expectedOutputFile: 'model.cds.json',
        projectDir: 'test-project',
        status: 'failed',
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
      };

      mockTask2 = {
        id: 'task-2',
        type: 'file',
        sourceFiles: ['/test/input2.cds'],
        expectedOutputFile: 'model.cds.json',
        projectDir: 'test-project',
        status: 'success',
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
      };

      mockProject = {
        id: 'project-1',
        projectDir: 'test-project',
        cdsFiles: ['/test/input1.cds', '/test/input2.cds'],
        compilationTargets: ['/test/input1.cds', '/test/input2.cds'],
        expectedOutputFile: 'model.cds.json',
        dependencies: [],
        imports: new Map(),
        compilationTasks: [mockTask1, mockTask2],
        status: 'failed',
        timestamps: {
          discovered: new Date(),
        },
      };

      mockDependencyGraph = {
        id: 'test-graph',
        sourceRootDir: '/test/root',
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
            cdsFilesFound: 2,
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
          totalCdsFiles: 2,
          totalCompilationTasks: 2,
          successfulCompilations: 1,
          failedCompilations: 1,
          skippedCompilations: 0,
          jsonFilesGenerated: 1,
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

    it('should identify tasks with missing output files', () => {
      // Mock validation: task1 fails validation, task2 passes
      mockPath.isAbsolute.mockReturnValue(false);
      mockPath.join.mockImplementation((root, file) => `${root}/${file}`);

      // Task 1 - file doesn't exist
      mockFilesystem.fileExists.mockReturnValueOnce(false);
      // Task 2 - file exists and is valid
      mockFilesystem.fileExists.mockReturnValueOnce(true);
      mockFs.readFileSync.mockReturnValueOnce('{"valid": true}');

      const result = identifyTasksRequiringRetry(mockDependencyGraph);

      expect(result.size).toBe(1);
      expect(result.get('test-project')).toEqual([mockTask1]);
      expect(mockLogging.cdsExtractorLog).toHaveBeenCalledWith(
        'info',
        'Task task-1 requires retry: 0/1 output files valid (status: failed)',
      );
      expect(mockLogging.cdsExtractorLog).toHaveBeenCalledWith(
        'info',
        'Identified 1 task(s) requiring retry across 1 project(s)',
      );
    });

    it('should update task status from success to failed when output files are invalid', () => {
      // Both tasks initially marked as success but have invalid outputs
      mockTask1.status = 'success';
      mockTask2.status = 'success';

      // Mock validation: both tasks fail validation
      mockPath.isAbsolute.mockReturnValue(false);
      mockPath.join.mockImplementation((root, file) => `${root}/${file}`);
      mockFilesystem.fileExists.mockReturnValue(false); // Both files don't exist

      const result = identifyTasksRequiringRetry(mockDependencyGraph);

      expect(result.size).toBe(1);
      expect(result.get('test-project')).toEqual([mockTask1, mockTask2]);
      expect(mockTask1.status).toBe('failed'); // Updated from success to failed
      expect(mockTask2.status).toBe('failed'); // Updated from success to failed
      expect(mockLogging.cdsExtractorLog).toHaveBeenCalledWith(
        'warn',
        'Task task-1 was marked as successful but output files are missing or invalid - updating status to failed',
      );
    });

    it('should skip tasks that have already been retried', () => {
      // Mark task1 as already retried
      mockTask1.retryInfo = {
        hasBeenRetried: true,
        retryTimestamp: new Date(),
        retryReason: 'Output files missing',
      };

      // Mock validation: task2 fails validation
      mockPath.isAbsolute.mockReturnValue(false);
      mockPath.join.mockImplementation((root, file) => `${root}/${file}`);
      mockFilesystem.fileExists.mockReturnValue(false);

      const result = identifyTasksRequiringRetry(mockDependencyGraph);

      expect(result.size).toBe(1);
      expect(result.get('test-project')).toEqual([mockTask2]); // Only task2, task1 was skipped
    });

    it('should return empty map when all tasks have valid outputs', () => {
      // Mock validation: all tasks pass validation
      mockPath.isAbsolute.mockReturnValue(false);
      mockPath.join.mockImplementation((root, file) => `${root}/${file}`);
      mockFilesystem.fileExists.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{"valid": true}');

      const result = identifyTasksRequiringRetry(mockDependencyGraph);

      expect(result.size).toBe(0);
      expect(mockLogging.cdsExtractorLog).not.toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('task(s) requiring retry'),
      );
    });

    it('should handle multiple projects with different retry requirements', () => {
      // Add a second project
      const mockTask3: CompilationTask = {
        id: 'task-3',
        type: 'file',
        sourceFiles: ['/test/input3.cds'],
        expectedOutputFile: 'model.cds.json',
        projectDir: 'test-project-2',
        status: 'failed',
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
      };

      const mockProject2: CdsProject = {
        id: 'project-2',
        projectDir: 'test-project-2',
        cdsFiles: ['/test/input3.cds'],
        compilationTargets: ['/test/input3.cds'],
        expectedOutputFile: 'model.cds.json',
        dependencies: [],
        imports: new Map(),
        compilationTasks: [mockTask3],
        status: 'failed',
        timestamps: {
          discovered: new Date(),
        },
      };

      mockDependencyGraph.projects.set('test-project-2', mockProject2);

      // Mock validation: project1 has 1 failed task, project2 has 1 failed task
      mockPath.isAbsolute.mockReturnValue(false);
      mockPath.join.mockImplementation((root, file) => `${root}/${file}`);

      // All files don't exist
      mockFilesystem.fileExists.mockReturnValue(false);

      const result = identifyTasksRequiringRetry(mockDependencyGraph);

      expect(result.size).toBe(2);
      expect(result.get('test-project')).toEqual([mockTask1, mockTask2]);
      expect(result.get('test-project-2')).toEqual([mockTask3]);
      expect(mockLogging.cdsExtractorLog).toHaveBeenCalledWith(
        'info',
        'Identified 3 task(s) requiring retry across 2 project(s)',
      );
    });
  });
});
