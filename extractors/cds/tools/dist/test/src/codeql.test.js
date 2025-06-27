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
const fs = __importStar(require("fs"));
const codeql_1 = require("../../src/codeql");
const diagnostics_1 = require("../../src/diagnostics");
const environment = __importStar(require("../../src/environment"));
// Mock dependencies
jest.mock('fs', () => ({
    existsSync: jest.fn(),
}));
jest.mock('child_process', () => ({
    spawnSync: jest.fn(),
}));
jest.mock('../../src/environment', () => ({
    getPlatformInfo: jest.fn(),
}));
jest.mock('../../src/diagnostics', () => ({
    addJavaScriptExtractorDiagnostic: jest.fn(),
}));
describe('codeql', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Default mock implementation
        environment.getPlatformInfo.mockReturnValue({
            platform: 'darwin',
            arch: 'x64',
            isWindows: false,
            exeExtension: '',
        });
    });
    describe('validateRequirements', () => {
        it('should return true when all requirements are met', () => {
            fs.existsSync.mockReturnValue(true);
            const result = (0, codeql_1.validateRequirements)('/path/to/source', '/path/to/codeql', '/path/to/response.file', '/path/to/autobuild.sh', '/path/to/jsextractor');
            expect(result).toBe(true);
            // The implementation calls existsSync 4 times in total
            expect(fs.existsSync).toHaveBeenCalledTimes(4);
        });
        it('should return false when autobuild script does not exist', () => {
            // Mock existsSync to return false only for autobuild script
            fs.existsSync.mockImplementation(path => {
                return path !== '/path/to/autobuild.sh';
            });
            // Mock console.warn to avoid polluting test output
            const originalConsoleWarn = console.warn;
            console.warn = jest.fn();
            const result = (0, codeql_1.validateRequirements)('/path/to/source', '/path/to/codeql', '/path/to/response.file', '/path/to/autobuild.sh', '/path/to/jsextractor');
            expect(result).toBe(false);
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("autobuild script '/path/to/autobuild.sh' does not exist"));
            // Restore console.warn
            console.warn = originalConsoleWarn;
        });
        it('should return false and report all missing requirements', () => {
            // Mock existsSync to return false for all paths
            fs.existsSync.mockReturnValue(false);
            // Mock console.warn to avoid polluting test output
            const originalConsoleWarn = console.warn;
            console.warn = jest.fn();
            const result = (0, codeql_1.validateRequirements)('/path/to/source', '/path/to/codeql', '/path/to/response.file', '/path/to/autobuild.sh', '');
            expect(result).toBe(false);
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("autobuild script '/path/to/autobuild.sh' does not exist"));
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("codeql executable '/path/to/codeql' does not exist"));
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("response file '/path/to/response.file' does not exist"));
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("project root directory '/path/to/source' does not exist"));
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('CODEQL_EXTRACTOR_JAVASCRIPT_ROOT environment variable is not set'));
            // Restore console.warn
            console.warn = originalConsoleWarn;
        });
    });
    describe('runJavaScriptExtractor', () => {
        it('should successfully run JavaScript extractor', () => {
            childProcess.spawnSync.mockReturnValue({
                status: 0,
                error: null,
            });
            const result = (0, codeql_1.runJavaScriptExtractor)('/path/to/source', '/path/to/autobuild.sh', '/path/to/codeql');
            expect(result).toEqual({ success: true });
            expect(childProcess.spawnSync).toHaveBeenCalledWith('/path/to/autobuild.sh', [], expect.objectContaining({
                cwd: '/path/to/source',
                env: process.env,
                shell: true,
                stdio: 'inherit',
            }));
        });
        it('should handle JavaScript extractor execution error', () => {
            childProcess.spawnSync.mockReturnValue({
                error: new Error('Failed to execute'),
                status: null,
            });
            const result = (0, codeql_1.runJavaScriptExtractor)('/path/to/source', '/path/to/autobuild.sh', '/path/to/codeql');
            expect(result).toEqual({
                success: false,
                error: 'Error running JavaScript extractor: Failed to execute',
            });
        });
        it('should handle JavaScript extractor non-zero exit code', () => {
            childProcess.spawnSync.mockReturnValue({
                error: null,
                status: 1,
            });
            const result = (0, codeql_1.runJavaScriptExtractor)('/path/to/source', '/path/to/autobuild.sh', '/path/to/codeql');
            expect(result).toEqual({
                success: false,
                error: 'JavaScript extractor failed with exit code 1',
            });
        });
        it('should add diagnostic when JavaScript extractor fails with CodeQL path provided', () => {
            childProcess.spawnSync.mockReturnValue({
                error: new Error('Failed to execute'),
                status: null,
            });
            const codeqlPath = '/path/to/codeql';
            const result = (0, codeql_1.runJavaScriptExtractor)('/path/to/source', '/path/to/autobuild.sh', codeqlPath);
            expect(result).toEqual({
                success: false,
                error: 'Error running JavaScript extractor: Failed to execute',
            });
            expect(diagnostics_1.addJavaScriptExtractorDiagnostic).toHaveBeenCalledWith('/path/to/source', 'Error running JavaScript extractor: Failed to execute', codeqlPath);
        });
    });
});
//# sourceMappingURL=codeql.test.js.map