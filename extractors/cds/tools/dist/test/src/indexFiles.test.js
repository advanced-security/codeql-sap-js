"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
const globals_1 = require("@jest/globals");
const indexFiles_1 = require("../../src/indexFiles");
(0, globals_1.describe)('indexFiles', () => {
    let tempDir;
    let sourceRoot;
    let responseFile;
    let platformInfo;
    (0, globals_1.beforeEach)(() => {
        // Create a temporary directory for each test
        tempDir = (0, fs_1.mkdtempSync)((0, path_1.join)((0, os_1.tmpdir)(), 'indexFiles-test-'));
        sourceRoot = (0, path_1.join)(tempDir, 'src');
        responseFile = (0, path_1.join)(tempDir, 'response.txt');
        platformInfo = { isWindows: process.platform === 'win32' };
        // Create source directory
        (0, fs_1.mkdirSync)(sourceRoot, { recursive: true });
        // Mock console methods to avoid noisy test output
        globals_1.jest.spyOn(console, 'log').mockImplementation(() => { });
        globals_1.jest.spyOn(console, 'warn').mockImplementation(() => { });
    });
    afterEach(() => {
        // Clean up temporary directory
        if (tempDir) {
            (0, fs_1.rmSync)(tempDir, { recursive: true, force: true });
        }
        // Restore console methods
        globals_1.jest.restoreAllMocks();
    });
    (0, globals_1.describe)('validateIndexFilesMode', () => {
        (0, globals_1.test)('should return success when discovered files match response file', () => {
            // Arrange
            const cdsFiles = ['model.cds', 'service.cds'];
            const cdsFilePathsToProcess = cdsFiles.map(file => (0, path_1.join)(sourceRoot, file));
            // Create the CDS files
            cdsFiles.forEach(file => {
                (0, fs_1.writeFileSync)((0, path_1.join)(sourceRoot, file), 'using from "./test";');
            });
            // Create response file with absolute paths
            const responseContent = cdsFilePathsToProcess.join('\n');
            (0, fs_1.writeFileSync)(responseFile, responseContent);
            // Act
            const result = (0, indexFiles_1.validateIndexFilesMode)(cdsFilePathsToProcess, sourceRoot, responseFile, platformInfo);
            // Assert
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.warnings).toHaveLength(0);
            (0, globals_1.expect)(result.discoveredCount).toBe(2);
            (0, globals_1.expect)(result.responseFileCount).toBe(2);
            (0, globals_1.expect)(result.errorMessage).toBeUndefined();
        });
        (0, globals_1.test)('should return warnings when discovered files differ from response file', () => {
            // Arrange
            const discoveredFiles = ['model.cds', 'service.cds', 'extra.cds'];
            const responseFiles = ['model.cds', 'different.cds'];
            const cdsFilePathsToProcess = discoveredFiles.map(file => (0, path_1.join)(sourceRoot, file));
            // Create the CDS files
            discoveredFiles.forEach(file => {
                (0, fs_1.writeFileSync)((0, path_1.join)(sourceRoot, file), 'using from "./test";');
            });
            // Create response file with different files
            const responseContent = responseFiles.map(file => (0, path_1.join)(sourceRoot, file)).join('\n');
            (0, fs_1.writeFileSync)(responseFile, responseContent);
            // Act
            const result = (0, indexFiles_1.validateIndexFilesMode)(cdsFilePathsToProcess, sourceRoot, responseFile, platformInfo);
            // Assert
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.warnings).toHaveLength(2);
            (0, globals_1.expect)(result.warnings[0]).toContain('Discovered CDS files not in response file:');
            (0, globals_1.expect)(result.warnings[0]).toContain('extra.cds');
            (0, globals_1.expect)(result.warnings[1]).toContain('Response file contains CDS files not discovered: different.cds');
            (0, globals_1.expect)(result.discoveredCount).toBe(3);
            (0, globals_1.expect)(result.responseFileCount).toBe(2);
        });
        (0, globals_1.test)('should return error when response file cannot be read', () => {
            // Arrange
            const cdsFilePathsToProcess = [(0, path_1.join)(sourceRoot, 'model.cds')];
            const nonExistentResponseFile = (0, path_1.join)(tempDir, 'nonexistent.txt');
            // Act
            const result = (0, indexFiles_1.validateIndexFilesMode)(cdsFilePathsToProcess, sourceRoot, nonExistentResponseFile, platformInfo);
            // Assert
            (0, globals_1.expect)(result.success).toBe(false);
            (0, globals_1.expect)(result.errorMessage).toBeDefined();
            (0, globals_1.expect)(result.errorMessage).toContain('does not exist');
            (0, globals_1.expect)(result.discoveredCount).toBe(1);
            (0, globals_1.expect)(result.responseFileCount).toBe(0);
        });
        (0, globals_1.test)('should handle empty response file', () => {
            // Arrange
            const cdsFilePathsToProcess = [(0, path_1.join)(sourceRoot, 'model.cds')];
            // Create empty response file
            (0, fs_1.writeFileSync)(responseFile, '');
            // Act
            const result = (0, indexFiles_1.validateIndexFilesMode)(cdsFilePathsToProcess, sourceRoot, responseFile, platformInfo);
            // Assert
            // Empty response file is treated as an error by getCdsFilePathsToProcess
            (0, globals_1.expect)(result.success).toBe(false);
            (0, globals_1.expect)(result.errorMessage).toBeDefined();
            (0, globals_1.expect)(result.discoveredCount).toBe(1);
            (0, globals_1.expect)(result.responseFileCount).toBe(0);
        });
        (0, globals_1.test)('should handle relative paths correctly', () => {
            // Arrange
            const relativePaths = ['model.cds', 'subdir/service.cds'];
            const cdsFilePathsToProcess = relativePaths; // Pass relative paths
            // Create the CDS files
            (0, fs_1.mkdirSync)((0, path_1.join)(sourceRoot, 'subdir'), { recursive: true });
            relativePaths.forEach(file => {
                (0, fs_1.writeFileSync)((0, path_1.join)(sourceRoot, file), 'using from "./test";');
            });
            // Create response file with absolute paths
            const responseContent = relativePaths.map(file => (0, path_1.join)(sourceRoot, file)).join('\n');
            (0, fs_1.writeFileSync)(responseFile, responseContent);
            // Act
            const result = (0, indexFiles_1.validateIndexFilesMode)(cdsFilePathsToProcess, sourceRoot, responseFile, platformInfo);
            // Assert
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.warnings).toHaveLength(0);
            (0, globals_1.expect)(result.discoveredCount).toBe(2);
            (0, globals_1.expect)(result.responseFileCount).toBe(2);
        });
    });
    (0, globals_1.describe)('handleIndexFilesMode', () => {
        (0, globals_1.test)('should successfully handle index files mode with matching files', () => {
            // Arrange
            const cdsFiles = ['project1/model.cds', 'project2/service.cds'];
            const projectMap = new Map();
            // Create projects
            projectMap.set('project1', {
                projectDir: (0, path_1.join)(sourceRoot, 'project1'),
                cdsFiles: [(0, path_1.join)(sourceRoot, 'project1/model.cds')],
                cdsFilesToCompile: [(0, path_1.join)(sourceRoot, 'project1/model.cds')],
                expectedOutputFiles: [(0, path_1.join)(sourceRoot, 'project1/model.cds.json')],
            });
            projectMap.set('project2', {
                projectDir: (0, path_1.join)(sourceRoot, 'project2'),
                cdsFiles: [(0, path_1.join)(sourceRoot, 'project2/service.cds')],
                cdsFilesToCompile: [(0, path_1.join)(sourceRoot, 'project2/service.cds')],
                expectedOutputFiles: [(0, path_1.join)(sourceRoot, 'project2/service.cds.json')],
            });
            // Create the CDS files and directories
            cdsFiles.forEach(file => {
                (0, fs_1.mkdirSync)((0, path_1.join)(sourceRoot, file.substring(0, file.lastIndexOf('/'))), { recursive: true });
                (0, fs_1.writeFileSync)((0, path_1.join)(sourceRoot, file), 'using from "./test";');
            });
            // Create response file
            const responseContent = cdsFiles.map(file => (0, path_1.join)(sourceRoot, file)).join('\n');
            (0, fs_1.writeFileSync)(responseFile, responseContent);
            // Act
            const result = (0, indexFiles_1.handleIndexFilesMode)(projectMap, sourceRoot, responseFile, platformInfo);
            // Assert
            (0, globals_1.expect)(result.validationResult.success).toBe(true);
            (0, globals_1.expect)(result.validationResult.warnings).toHaveLength(0);
            (0, globals_1.expect)(result.cdsFilePathsToProcess).toHaveLength(2);
            (0, globals_1.expect)(result.cdsFilePathsToProcess).toContain((0, path_1.join)(sourceRoot, 'project1/model.cds'));
            (0, globals_1.expect)(result.cdsFilePathsToProcess).toContain((0, path_1.join)(sourceRoot, 'project2/service.cds'));
        });
        (0, globals_1.test)('should return empty array when validation fails', () => {
            // Arrange
            const projectMap = new Map();
            projectMap.set('project1', {
                projectDir: (0, path_1.join)(sourceRoot, 'project1'),
                cdsFiles: [(0, path_1.join)(sourceRoot, 'project1/model.cds')],
                cdsFilesToCompile: [(0, path_1.join)(sourceRoot, 'project1/model.cds')],
                expectedOutputFiles: [(0, path_1.join)(sourceRoot, 'project1/model.cds.json')],
            });
            const nonExistentResponseFile = (0, path_1.join)(tempDir, 'nonexistent.txt');
            // Act
            const result = (0, indexFiles_1.handleIndexFilesMode)(projectMap, sourceRoot, nonExistentResponseFile, platformInfo);
            // Assert
            (0, globals_1.expect)(result.validationResult.success).toBe(false);
            (0, globals_1.expect)(result.validationResult.errorMessage).toBeDefined();
            (0, globals_1.expect)(result.cdsFilePathsToProcess).toHaveLength(0);
        });
        (0, globals_1.test)('should handle empty project map', () => {
            // Arrange
            const projectMap = new Map();
            // Create empty response file
            (0, fs_1.writeFileSync)(responseFile, '');
            // Act
            const result = (0, indexFiles_1.handleIndexFilesMode)(projectMap, sourceRoot, responseFile, platformInfo);
            // Assert
            // Empty response file is treated as an error by getCdsFilePathsToProcess
            (0, globals_1.expect)(result.validationResult.success).toBe(false);
            (0, globals_1.expect)(result.cdsFilePathsToProcess).toHaveLength(0);
            (0, globals_1.expect)(result.validationResult.discoveredCount).toBe(0);
            (0, globals_1.expect)(result.validationResult.responseFileCount).toBe(0);
        });
        (0, globals_1.test)('should log warnings when files do not match', () => {
            // Arrange
            const consoleSpy = globals_1.jest.spyOn(console, 'warn').mockImplementation(() => { });
            const projectMap = new Map();
            projectMap.set('project1', {
                projectDir: (0, path_1.join)(sourceRoot, 'project1'),
                cdsFiles: [(0, path_1.join)(sourceRoot, 'project1/model.cds'), (0, path_1.join)(sourceRoot, 'project1/extra.cds')],
                cdsFilesToCompile: [
                    (0, path_1.join)(sourceRoot, 'project1/model.cds'),
                    (0, path_1.join)(sourceRoot, 'project1/extra.cds'),
                ],
                expectedOutputFiles: [
                    (0, path_1.join)(sourceRoot, 'project1/model.cds.json'),
                    (0, path_1.join)(sourceRoot, 'project1/extra.cds.json'),
                ],
            });
            // Create the CDS files
            (0, fs_1.mkdirSync)((0, path_1.join)(sourceRoot, 'project1'), { recursive: true });
            (0, fs_1.writeFileSync)((0, path_1.join)(sourceRoot, 'project1/model.cds'), 'using from "./test";');
            (0, fs_1.writeFileSync)((0, path_1.join)(sourceRoot, 'project1/extra.cds'), 'using from "./test";');
            // Create response file with only one file
            const responseContent = (0, path_1.join)(sourceRoot, 'project1/model.cds');
            (0, fs_1.writeFileSync)(responseFile, responseContent);
            // Act
            const result = (0, indexFiles_1.handleIndexFilesMode)(projectMap, sourceRoot, responseFile, platformInfo);
            // Assert
            (0, globals_1.expect)(result.validationResult.success).toBe(true);
            (0, globals_1.expect)(result.validationResult.warnings).toHaveLength(1);
            (0, globals_1.expect)(consoleSpy).toHaveBeenCalledWith(globals_1.expect.stringContaining('WARN: Discovered CDS files not in response file: extra.cds'));
            consoleSpy.mockRestore();
        });
    });
});
//# sourceMappingURL=indexFiles.test.js.map