import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import { CdsProject } from '../../src/cds/parser/types';
import { handleIndexFilesMode, validateIndexFilesMode } from '../../src/indexFiles';

describe('indexFiles', () => {
  let tempDir: string;
  let sourceRoot: string;
  let responseFile: string;
  let platformInfo: { isWindows: boolean };

  beforeEach(() => {
    // Create a temporary directory for each test
    tempDir = mkdtempSync(join(tmpdir(), 'indexFiles-test-'));
    sourceRoot = join(tempDir, 'src');
    responseFile = join(tempDir, 'response.txt');
    platformInfo = { isWindows: process.platform === 'win32' };

    // Create source directory
    mkdirSync(sourceRoot, { recursive: true });

    // Mock console methods to avoid noisy test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up temporary directory
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }

    // Restore console methods
    jest.restoreAllMocks();
  });

  describe('validateIndexFilesMode', () => {
    test('should return success when discovered files match response file', () => {
      // Arrange
      const cdsFiles = ['model.cds', 'service.cds'];
      const cdsFilePathsToProcess = cdsFiles.map(file => join(sourceRoot, file));

      // Create the CDS files
      cdsFiles.forEach(file => {
        writeFileSync(join(sourceRoot, file), 'using from "./test";');
      });

      // Create response file with absolute paths
      const responseContent = cdsFilePathsToProcess.join('\n');
      writeFileSync(responseFile, responseContent);

      // Act
      const result = validateIndexFilesMode(
        cdsFilePathsToProcess,
        sourceRoot,
        responseFile,
        platformInfo,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.warnings).toHaveLength(0);
      expect(result.discoveredCount).toBe(2);
      expect(result.responseFileCount).toBe(2);
      expect(result.errorMessage).toBeUndefined();
    });

    test('should return warnings when discovered files differ from response file', () => {
      // Arrange
      const discoveredFiles = ['model.cds', 'service.cds', 'extra.cds'];
      const responseFiles = ['model.cds', 'different.cds'];

      const cdsFilePathsToProcess = discoveredFiles.map(file => join(sourceRoot, file));

      // Create the CDS files
      discoveredFiles.forEach(file => {
        writeFileSync(join(sourceRoot, file), 'using from "./test";');
      });

      // Create response file with different files
      const responseContent = responseFiles.map(file => join(sourceRoot, file)).join('\n');
      writeFileSync(responseFile, responseContent);

      // Act
      const result = validateIndexFilesMode(
        cdsFilePathsToProcess,
        sourceRoot,
        responseFile,
        platformInfo,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings[0]).toContain('Discovered CDS files not in response file:');
      expect(result.warnings[0]).toContain('extra.cds');
      expect(result.warnings[1]).toContain(
        'Response file contains CDS files not discovered: different.cds',
      );
      expect(result.discoveredCount).toBe(3);
      expect(result.responseFileCount).toBe(2);
    });

    test('should return error when response file cannot be read', () => {
      // Arrange
      const cdsFilePathsToProcess = [join(sourceRoot, 'model.cds')];
      const nonExistentResponseFile = join(tempDir, 'nonexistent.txt');

      // Act
      const result = validateIndexFilesMode(
        cdsFilePathsToProcess,
        sourceRoot,
        nonExistentResponseFile,
        platformInfo,
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.errorMessage).toBeDefined();
      expect(result.errorMessage).toContain('does not exist');
      expect(result.discoveredCount).toBe(1);
      expect(result.responseFileCount).toBe(0);
    });

    test('should handle empty response file', () => {
      // Arrange
      const cdsFilePathsToProcess = [join(sourceRoot, 'model.cds')];

      // Create empty response file
      writeFileSync(responseFile, '');

      // Act
      const result = validateIndexFilesMode(
        cdsFilePathsToProcess,
        sourceRoot,
        responseFile,
        platformInfo,
      );

      // Assert
      // Empty response file is treated as an error by getCdsFilePathsToProcess
      expect(result.success).toBe(false);
      expect(result.errorMessage).toBeDefined();
      expect(result.discoveredCount).toBe(1);
      expect(result.responseFileCount).toBe(0);
    });

    test('should handle relative paths correctly', () => {
      // Arrange
      const relativePaths = ['model.cds', 'subdir/service.cds'];
      const cdsFilePathsToProcess = relativePaths; // Pass relative paths

      // Create the CDS files
      mkdirSync(join(sourceRoot, 'subdir'), { recursive: true });
      relativePaths.forEach(file => {
        writeFileSync(join(sourceRoot, file), 'using from "./test";');
      });

      // Create response file with absolute paths
      const responseContent = relativePaths.map(file => join(sourceRoot, file)).join('\n');
      writeFileSync(responseFile, responseContent);

      // Act
      const result = validateIndexFilesMode(
        cdsFilePathsToProcess,
        sourceRoot,
        responseFile,
        platformInfo,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.warnings).toHaveLength(0);
      expect(result.discoveredCount).toBe(2);
      expect(result.responseFileCount).toBe(2);
    });
  });

  describe('handleIndexFilesMode', () => {
    test('should successfully handle index files mode with matching files', () => {
      // Arrange
      const cdsFiles = ['project1/model.cds', 'project2/service.cds'];
      const projectMap = new Map<string, CdsProject>();
      // Create projects
      projectMap.set('project1', {
        projectDir: join(sourceRoot, 'project1'),
        cdsFiles: [join(sourceRoot, 'project1/model.cds')],
        cdsFilesToCompile: [join(sourceRoot, 'project1/model.cds')],
      });

      projectMap.set('project2', {
        projectDir: join(sourceRoot, 'project2'),
        cdsFiles: [join(sourceRoot, 'project2/service.cds')],
        cdsFilesToCompile: [join(sourceRoot, 'project2/service.cds')],
      });

      // Create the CDS files and directories
      cdsFiles.forEach(file => {
        mkdirSync(join(sourceRoot, file.substring(0, file.lastIndexOf('/'))), { recursive: true });
        writeFileSync(join(sourceRoot, file), 'using from "./test";');
      });

      // Create response file
      const responseContent = cdsFiles.map(file => join(sourceRoot, file)).join('\n');
      writeFileSync(responseFile, responseContent);

      // Act
      const result = handleIndexFilesMode(projectMap, sourceRoot, responseFile, platformInfo);

      // Assert
      expect(result.validationResult.success).toBe(true);
      expect(result.validationResult.warnings).toHaveLength(0);
      expect(result.cdsFilePathsToProcess).toHaveLength(2);
      expect(result.cdsFilePathsToProcess).toContain(join(sourceRoot, 'project1/model.cds'));
      expect(result.cdsFilePathsToProcess).toContain(join(sourceRoot, 'project2/service.cds'));
    });

    test('should return empty array when validation fails', () => {
      // Arrange
      const projectMap = new Map<string, CdsProject>();
      projectMap.set('project1', {
        projectDir: join(sourceRoot, 'project1'),
        cdsFiles: [join(sourceRoot, 'project1/model.cds')],
        cdsFilesToCompile: [join(sourceRoot, 'project1/model.cds')],
      });

      const nonExistentResponseFile = join(tempDir, 'nonexistent.txt');

      // Act
      const result = handleIndexFilesMode(
        projectMap,
        sourceRoot,
        nonExistentResponseFile,
        platformInfo,
      );

      // Assert
      expect(result.validationResult.success).toBe(false);
      expect(result.validationResult.errorMessage).toBeDefined();
      expect(result.cdsFilePathsToProcess).toHaveLength(0);
    });

    test('should handle empty project map', () => {
      // Arrange
      const projectMap = new Map<string, CdsProject>();

      // Create empty response file
      writeFileSync(responseFile, '');

      // Act
      const result = handleIndexFilesMode(projectMap, sourceRoot, responseFile, platformInfo);

      // Assert
      // Empty response file is treated as an error by getCdsFilePathsToProcess
      expect(result.validationResult.success).toBe(false);
      expect(result.cdsFilePathsToProcess).toHaveLength(0);
      expect(result.validationResult.discoveredCount).toBe(0);
      expect(result.validationResult.responseFileCount).toBe(0);
    });

    test('should log warnings when files do not match', () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const projectMap = new Map<string, CdsProject>();
      projectMap.set('project1', {
        projectDir: join(sourceRoot, 'project1'),
        cdsFiles: [join(sourceRoot, 'project1/model.cds'), join(sourceRoot, 'project1/extra.cds')],
        cdsFilesToCompile: [
          join(sourceRoot, 'project1/model.cds'),
          join(sourceRoot, 'project1/extra.cds'),
        ],
      });

      // Create the CDS files
      mkdirSync(join(sourceRoot, 'project1'), { recursive: true });
      writeFileSync(join(sourceRoot, 'project1/model.cds'), 'using from "./test";');
      writeFileSync(join(sourceRoot, 'project1/extra.cds'), 'using from "./test";');

      // Create response file with only one file
      const responseContent = join(sourceRoot, 'project1/model.cds');
      writeFileSync(responseFile, responseContent);

      // Act
      const result = handleIndexFilesMode(projectMap, sourceRoot, responseFile, platformInfo);

      // Assert
      expect(result.validationResult.success).toBe(true);
      expect(result.validationResult.warnings).toHaveLength(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('WARN: Discovered CDS files not in response file: extra.cds'),
      );

      consoleSpy.mockRestore();
    });
  });
});
