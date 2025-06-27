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
const diagnostics_1 = require("../../src/diagnostics");
// Mock dependencies
jest.mock('child_process', () => ({
    execFileSync: jest.fn(),
    spawnSync: jest.fn(),
}));
jest.mock('fs', () => ({
    existsSync: jest.fn(),
}));
jest.mock('../../src/filesystem', () => ({
    fileExists: jest.fn(),
    dirExists: jest.fn(),
    recursivelyRenameJsonFiles: jest.fn(),
}));
describe('diagnostics', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('addCompilationDiagnostic', () => {
        it('should add compilation diagnostic successfully', () => {
            const cdsFilePath = '/path/to/model.cds';
            const errorMessage = 'Syntax error in CDS file';
            const codeqlExePath = '/path/to/codeql';
            // Mock process.env to include necessary environment variable
            const originalEnv = process.env;
            process.env = {
                ...originalEnv,
                CODEQL_EXTRACTOR_CDS_WIP_DATABASE: '/path/to/db',
            };
            // Mock successful execution
            childProcess.execFileSync.mockReturnValue(Buffer.from(''));
            const result = (0, diagnostics_1.addCompilationDiagnostic)(cdsFilePath, errorMessage, codeqlExePath);
            expect(result).toBe(true);
            expect(childProcess.execFileSync).toHaveBeenCalledWith(codeqlExePath, expect.arrayContaining([
                'database',
                'add-diagnostic',
                '--extractor-name=cds',
                '--ready-for-status-page',
                '--source-id=cds/compilation-failure',
                '--source-name=Failure to compile one or more SAP CAP CDS files',
                '--severity=error',
                `--markdown-message=${errorMessage}`,
                `--file-path=${cdsFilePath}`,
                '--',
                '/path/to/db',
            ]));
            // Restore original environment
            process.env = originalEnv;
        });
        it('should handle errors when adding diagnostic', () => {
            const cdsFilePath = '/path/to/model.cds';
            const errorMessage = 'Syntax error in CDS file';
            const codeqlExePath = '/path/to/codeql';
            // Mock error during execution
            childProcess.execFileSync.mockImplementation(() => {
                throw new Error('Failed to add diagnostic');
            });
            // Mock console.error
            const originalConsoleError = console.error;
            console.error = jest.fn();
            const result = (0, diagnostics_1.addCompilationDiagnostic)(cdsFilePath, errorMessage, codeqlExePath);
            expect(result).toBe(false);
            expect(console.error).toHaveBeenCalledWith(expect.stringContaining(`ERROR: Failed to add error diagnostic for source file=${cdsFilePath}`));
            // Restore console.error
            console.error = originalConsoleError;
        });
    });
    describe('addPackageJsonParsingDiagnostic', () => {
        it('should add package.json parsing diagnostic successfully', () => {
            const packageJsonPath = '/path/to/package.json';
            const errorMessage = 'Invalid JSON format';
            const codeqlExePath = '/path/to/codeql';
            // Mock process.env to include necessary environment variable
            const originalEnv = process.env;
            process.env = {
                ...originalEnv,
                CODEQL_EXTRACTOR_CDS_WIP_DATABASE: '/path/to/db',
            };
            // Mock successful execution
            childProcess.execFileSync.mockReturnValue(Buffer.from(''));
            const result = (0, diagnostics_1.addPackageJsonParsingDiagnostic)(packageJsonPath, errorMessage, codeqlExePath);
            expect(result).toBe(true);
            expect(childProcess.execFileSync).toHaveBeenCalledWith(codeqlExePath, expect.arrayContaining([
                'database',
                'add-diagnostic',
                '--extractor-name=cds',
                '--ready-for-status-page',
                '--source-id=cds/package-json-parsing-failure',
                '--severity=warning',
                `--markdown-message=${errorMessage}`,
            ]));
            // Restore original environment
            process.env = originalEnv;
        });
    });
    describe('addDependencyDiagnostic', () => {
        it('should add dependency installation diagnostic successfully', () => {
            const packageJsonPath = '/path/to/package.json';
            const errorMessage = 'Failed to install npm dependencies';
            const codeqlExePath = '/path/to/codeql';
            // Mock process.env to include necessary environment variable
            const originalEnv = process.env;
            process.env = {
                ...originalEnv,
                CODEQL_EXTRACTOR_CDS_WIP_DATABASE: '/path/to/db',
            };
            // Mock successful execution
            childProcess.execFileSync.mockReturnValue(Buffer.from(''));
            const result = (0, diagnostics_1.addDependencyDiagnostic)(packageJsonPath, errorMessage, codeqlExePath);
            expect(result).toBe(true);
            expect(childProcess.execFileSync).toHaveBeenCalledWith(codeqlExePath, expect.arrayContaining([
                'database',
                'add-diagnostic',
                '--extractor-name=cds',
                '--ready-for-status-page',
                '--source-id=cds/dependency-failure',
                '--severity=error',
                `--markdown-message=${errorMessage}`,
            ]));
            // Restore original environment
            process.env = originalEnv;
        });
    });
    describe('addJavaScriptExtractorDiagnostic', () => {
        it('should add JavaScript extractor diagnostic successfully', () => {
            const filePath = '/path/to/source/root';
            const errorMessage = 'JavaScript extractor failed';
            const codeqlExePath = '/path/to/codeql';
            // Mock process.env to include necessary environment variable
            const originalEnv = process.env;
            process.env = {
                ...originalEnv,
                CODEQL_EXTRACTOR_CDS_WIP_DATABASE: '/path/to/db',
            };
            // Mock successful execution
            childProcess.execFileSync.mockReturnValue(Buffer.from(''));
            const result = (0, diagnostics_1.addJavaScriptExtractorDiagnostic)(filePath, errorMessage, codeqlExePath);
            expect(result).toBe(true);
            expect(childProcess.execFileSync).toHaveBeenCalledWith(codeqlExePath, expect.arrayContaining([
                'database',
                'add-diagnostic',
                '--extractor-name=cds',
                '--ready-for-status-page',
                '--source-id=cds/js-extractor-failure',
                '--severity=error',
                `--markdown-message=${errorMessage}`,
            ]));
            // Restore original environment
            process.env = originalEnv;
        });
    });
});
//# sourceMappingURL=diagnostics.test.js.map