"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const childProcess = __importStar(require("child_process"));
const path = __importStar(require("path"));
const glob_1 = require("glob");
const compiler_1 = require("../../../../src/cds/compiler");
const version_1 = require("../../../../src/cds/compiler/version");
const filesystem = __importStar(require("../../../../src/filesystem"));
// Mock dependencies
jest.mock('child_process', () => ({
    execFileSync: jest.fn(),
    spawnSync: jest.fn(),
}));
jest.mock('path', () => {
    const original = jest.requireActual('path');
    return {
        ...original,
        resolve: jest.fn(),
        join: jest.fn(),
        relative: jest.fn(),
        delimiter: original.delimiter,
    };
});
jest.mock('../../../../src/filesystem', () => ({
    fileExists: jest.fn(),
    dirExists: jest.fn(),
    recursivelyRenameJsonFiles: jest.fn(),
}));
jest.mock('../../../../src/cds/compiler/version', () => ({
    getCdsVersion: jest.fn(),
}));
jest.mock('glob', () => ({
    globSync: jest.fn(),
}));
describe('compile .cds to .cds.json', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('compileCdsToJson', () => {
        beforeEach(() => {
            // Mock path functions
            path.resolve.mockImplementation(p => `/resolved/${p}`);
            path.join.mockImplementation((...parts) => parts.join('/'));
            path.relative.mockImplementation((_from, _to) => 'project/file.cds');
            // Default mocks for filesystem functions
            filesystem.fileExists.mockReturnValue(true);
            filesystem.dirExists.mockReturnValue(false);
            // Mock getCdsVersion to return a version
            version_1.getCdsVersion.mockReturnValue('7.0.0');
        });
        it('should return failure when input CDS file does not exist', () => {
            // Setup
            filesystem.fileExists.mockReturnValueOnce(false);
            // Execute
            const result = (0, compiler_1.compileCdsToJson)('test.cds', '/source/root', 'cds');
            // Verify
            expect(result.success).toBe(false);
            expect(result.message).toContain('does not exist');
            expect(filesystem.fileExists).toHaveBeenCalledWith('/resolved/test.cds');
        });
        it('should successfully compile CDS to JSON file', () => {
            // Setup
            const resolvedCdsPath = '/resolved/test.cds';
            const cdsJsonOutPath = `${resolvedCdsPath}.json`;
            const relativeCdsPath = 'project/file.cds'; // This comes from the mocked path.relative
            // Mock successful spawn process
            childProcess.spawnSync.mockReturnValue({
                status: 0,
                stdout: Buffer.from('Compilation successful'),
                stderr: Buffer.from(''),
            });
            // Execute
            const result = (0, compiler_1.compileCdsToJson)('test.cds', '/source/root', 'cds');
            // Verify
            expect(result.success).toBe(true);
            expect(result.outputPath).toBe(cdsJsonOutPath);
            expect(result.compiledAsProject).toBe(false);
            expect(result.message).toBe('Standalone file compiled using project-aware compilation approach');
            // Check that getCdsVersion was called first
            expect(version_1.getCdsVersion).toHaveBeenCalledWith('cds', undefined);
            // Check the compilation command
            expect(childProcess.spawnSync).toHaveBeenCalledWith('cds', [
                'compile',
                relativeCdsPath,
                '--to',
                'json',
                '--dest',
                'project/file.cds.json',
                '--locations',
                '--log-level',
                'warn',
            ], expect.objectContaining({
                cwd: '/source/root', // CRITICAL: Verify cwd is sourceRoot
            }));
        });
        it('should ensure cwd is always sourceRoot for spawned processes', () => {
            // Setup
            const sourceRoot = '/my/source/root';
            const cacheDir = '/cache/dir';
            // Mock successful spawn process
            childProcess.spawnSync.mockReturnValue({
                status: 0,
                stdout: Buffer.from(''),
                stderr: Buffer.from(''),
            });
            // Execute
            (0, compiler_1.compileCdsToJson)('test.cds', sourceRoot, 'cds', cacheDir);
            // Verify that all spawnSync calls use sourceRoot as cwd
            expect(childProcess.spawnSync).toHaveBeenCalledWith('cds', expect.any(Array), expect.objectContaining({
                cwd: sourceRoot, // CRITICAL: Must be sourceRoot to ensure correct path generation
            }));
        });
        it('should handle compilation errors', () => {
            // Setup
            // Mock failed spawn process
            childProcess.spawnSync.mockReturnValue({
                status: 1,
                stdout: Buffer.from(''),
                stderr: Buffer.from('Compilation failed with error'),
            });
            // Execute
            const result = (0, compiler_1.compileCdsToJson)('test.cds', '/source/root', 'cds');
            // Verify
            expect(result.success).toBe(false);
            expect(result.message).toContain('Could not compile');
            expect(result.message).toContain('Compilation failed with error');
        });
        it('should handle directory output and rename files', () => {
            // Setup
            const resolvedCdsPath = '/resolved/test.cds';
            const cdsJsonOutPath = `${resolvedCdsPath}.json`;
            // Mock successful spawn process
            childProcess.spawnSync.mockReturnValue({
                status: 0,
                stdout: Buffer.from('Compilation successful'),
                stderr: Buffer.from(''),
            });
            // Mock directory output instead of file
            filesystem.fileExists.mockImplementation(path => {
                if (path === resolvedCdsPath)
                    return true; // Source file exists
                if (path === cdsJsonOutPath)
                    return false; // Output file does not exist
                return false;
            });
            filesystem.dirExists.mockImplementation(path => {
                if (path === cdsJsonOutPath)
                    return true; // Output is a directory
                return false;
            });
            // Execute
            const result = (0, compiler_1.compileCdsToJson)('test.cds', '/source/root', 'cds');
            // Verify
            expect(result.success).toBe(true);
            expect(result.outputPath).toBe(cdsJsonOutPath);
            expect(result.compiledAsProject).toBe(false);
            expect(result.message).toBe('Standalone file compiled using project-aware compilation approach');
            expect(filesystem.recursivelyRenameJsonFiles).toHaveBeenCalledWith(cdsJsonOutPath);
        });
        it('should use cache directory when provided', () => {
            // Setup
            const cacheDir = '/cache/dir';
            const sourceRoot = '/source/root';
            const nodePath = '/cache/dir/node_modules';
            const binPath = '/cache/dir/node_modules/.bin';
            // Mock successful spawn process
            childProcess.spawnSync.mockReturnValue({
                status: 0,
                stdout: Buffer.from(''),
                stderr: Buffer.from(''),
            });
            // Execute
            (0, compiler_1.compileCdsToJson)('test.cds', sourceRoot, 'cds', cacheDir);
            // Verify
            expect(childProcess.spawnSync).toHaveBeenCalledWith('cds', expect.any(Array), expect.objectContaining({
                cwd: sourceRoot, // CRITICAL: Must be sourceRoot
                env: expect.objectContaining({
                    NODE_PATH: expect.stringContaining(nodePath),
                    PATH: expect.stringContaining(binPath),
                }),
            }));
        });
        it('should handle project-aware compilation for root files', () => {
            // Setup
            const resolvedCdsPath = '/resolved/test.cds';
            const cdsJsonOutPath = `${resolvedCdsPath}.json`;
            const sourceRoot = '/source/root';
            const projectDir = 'project';
            const relativeCdsPath = 'project/test.cds';
            // Set up the path.relative mock for this test
            path.relative.mockImplementation(() => relativeCdsPath);
            // Create project dependency map with the test file as a root file
            const projectMap = new Map();
            const projectInfo = {
                directory: projectDir,
                cdsFiles: ['project/test.cds', 'project/other.cds'],
                cdsFilesToCompile: ['project/test.cds'],
                packageJsonPath: 'project/package.json',
                dependencies: new Map([['@sap/cds', '^7.0.0']]),
                dependents: [],
            };
            projectMap.set(projectDir, projectInfo);
            // Mock successful spawn process
            childProcess.spawnSync.mockReturnValue({
                status: 0,
                stdout: Buffer.from('Compilation successful'),
                stderr: Buffer.from(''),
            });
            // Execute
            const result = (0, compiler_1.compileCdsToJson)('test.cds', sourceRoot, 'cds', undefined, projectMap, projectDir);
            // Verify
            expect(result.success).toBe(true);
            expect(result.outputPath).toBe(cdsJsonOutPath);
            expect(result.compiledAsProject).toBe(true);
            expect(childProcess.spawnSync).toHaveBeenCalledWith('cds', expect.arrayContaining([
                'compile',
                relativeCdsPath,
                '--to',
                'json',
                '--dest',
                `${relativeCdsPath}.json`,
            ]), expect.any(Object));
        });
        it('should skip compilation for files imported by other files in project', () => {
            // Clear all mocks to ensure we're starting with a clean slate
            jest.clearAllMocks();
            // Setup
            const resolvedCdsPath = '/resolved/test.cds';
            const cdsJsonOutPath = `${resolvedCdsPath}.json`;
            const sourceRoot = '/source/root';
            const projectDir = '/source/root/project';
            // Set up the path.resolve mock to return our test path
            path.resolve.mockReturnValue(resolvedCdsPath);
            // Set up the path.relative mock for this test to return the path of an imported file
            path.relative.mockReturnValue('project/lib.cds');
            // Create project dependency map with the test file as an imported file
            const projectMap = new Map();
            const projectInfo = {
                projectDir,
                cdsFiles: ['project/root.cds', 'project/lib.cds'],
                cdsFilesToCompile: ['project/root.cds'], // Only root.cds should be compiled, not lib.cds
                imports: new Map([['project/root.cds', [{ resolvedPath: 'project/lib.cds' }]]]),
            };
            projectMap.set(projectDir, projectInfo);
            // Execute
            const result = (0, compiler_1.compileCdsToJson)('test.cds', sourceRoot, 'cds', undefined, projectMap, projectDir);
            // Verify
            expect(result.success).toBe(true);
            expect(result.outputPath).toBe(cdsJsonOutPath);
            expect(result.compiledAsProject).toBe(true);
            expect(result.message).toContain('part of a project-based compilation');
            // Verify that spawnSync was not called for the compile step
            expect(childProcess.spawnSync).not.toHaveBeenCalledWith('cds', expect.arrayContaining(['compile']), expect.any(Object));
        });
        it('should use sourceRoot as cwd for project-level compilation', () => {
            // Setup
            const sourceRoot = '/source/root';
            const projectDir = 'test-project';
            // Set up the path.relative mock
            path.relative.mockImplementation(() => 'test-project/test.cds');
            // Mock globSync to return CDS files for project-level compilation
            glob_1.globSync.mockImplementation((pattern) => {
                if (pattern.includes('**/*.cds')) {
                    return ['test-project/srv/service.cds', 'test-project/db/schema.cds'];
                }
                if (pattern.includes('*.cds')) {
                    return [];
                }
                return [];
            });
            // Create project dependency map with project-level compilation marker
            const projectMap = new Map();
            const projectInfo = {
                projectDir,
                cdsFiles: ['test-project/srv/service.cds', 'test-project/db/schema.cds'],
                cdsFilesToCompile: ['__PROJECT_LEVEL_COMPILATION__'],
                imports: new Map(),
            };
            projectMap.set(projectDir, projectInfo);
            // Mock filesystem checks
            filesystem.dirExists.mockImplementation(path => {
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                return path.includes('/db') || path.includes('/srv');
            });
            // Mock successful spawn process
            childProcess.spawnSync.mockReturnValue({
                status: 0,
                stdout: Buffer.from('Compilation successful'),
                stderr: Buffer.from(''),
            });
            // Execute
            const result = (0, compiler_1.compileCdsToJson)('test.cds', sourceRoot, 'cds', undefined, projectMap, projectDir);
            // Verify
            expect(result.success).toBe(true);
            expect(result.compiledAsProject).toBe(true);
            // CRITICAL: Verify that project-level compilation uses sourceRoot as cwd
            expect(childProcess.spawnSync).toHaveBeenCalledWith('cds', expect.arrayContaining(['compile', 'test-project/db', 'test-project/srv']), expect.objectContaining({
                cwd: sourceRoot, // CRITICAL: Must be sourceRoot, not projectAbsolutePath
            }));
        });
    });
});
//# sourceMappingURL=compile.test.js.map