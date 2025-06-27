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
/* eslint-disable @typescript-eslint/no-explicit-any */
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const environment_1 = require("../../src/environment");
// Mock modules
jest.mock('child_process');
jest.mock('os');
jest.mock('path');
jest.mock('../../src/filesystem', () => {
    const originalModule = jest.requireActual('../../src/filesystem');
    return {
        ...originalModule,
        dirExists: jest.fn().mockImplementation(path => {
            // Default to true unless specified in a test
            if (path === '/invalid/source')
                return false;
            return true;
        }),
        fileExists: jest.fn().mockImplementation(_path => {
            // Path-specific mock logic can be added here if needed
            return true; // Default to true for all paths
        }),
    };
});
jest.mock('fs', () => ({
    existsSync: jest.fn().mockImplementation(path => {
        // Return true for autobuild script paths in the tests
        if (path === '/path/to/js/extractor/tools/autobuild.sh')
            return true;
        if (path === '/dist/js/extractor/tools/autobuild.sh')
            return true;
        if (path === '/path/to/codeql_unpacked/codeql')
            return true;
        if (path === '/dist/codeql/codeql')
            return true;
        return false;
    }),
}));
describe('environment', () => {
    // Save original environment
    const originalEnv = { ...process.env };
    // Define a logger for capturing console output
    let consoleSpy;
    beforeEach(() => {
        jest.resetModules(); // Reset modules to clear cache
        jest.resetAllMocks(); // Reset all mocks
        // Reset environment variables before each test
        process.env = { ...originalEnv };
        // Spy on console methods
        consoleSpy = {
            log: jest.spyOn(console, 'log').mockImplementation(() => { }),
            warn: jest.spyOn(console, 'warn').mockImplementation(() => { }),
            error: jest.spyOn(console, 'error').mockImplementation(() => { }),
        };
        // Default path mocks
        path.resolve.mockImplementation((p) => p);
        path.join.mockImplementation((...args) => args.join('/'));
        // Reset the fs.existsSync mock to its default implementation in the mock declaration
        fs.existsSync.mockImplementation((path) => {
            // Return true for autobuild script paths in the tests
            if (path === '/path/to/js/extractor/tools/autobuild.sh')
                return true;
            if (path === '/dist/js/extractor/tools/autobuild.sh')
                return true;
            if (path === '/path/to/codeql_unpacked/codeql')
                return true;
            if (path === '/dist/codeql/codeql')
                return true;
            return false;
        });
    });
    afterEach(() => {
        // Restore environment variables after each test
        process.env = { ...originalEnv };
        // Restore console spies
        consoleSpy.log.mockRestore();
        consoleSpy.warn.mockRestore();
        consoleSpy.error.mockRestore();
    });
    describe('getPlatformInfo', () => {
        it('should correctly identify Windows platform', () => {
            // Mock OS platform and architecture
            os.platform.mockReturnValue('win32');
            os.arch.mockReturnValue('x64');
            const platformInfo = (0, environment_1.getPlatformInfo)();
            expect(platformInfo.platform).toBe('win32');
            expect(platformInfo.arch).toBe('x64');
            expect(platformInfo.isWindows).toBe(true);
            expect(platformInfo.exeExtension).toBe('.exe');
        });
        it('should correctly identify non-Windows platform', () => {
            // Mock OS platform and architecture
            os.platform.mockReturnValue('darwin');
            os.arch.mockReturnValue('x64');
            const platformInfo = (0, environment_1.getPlatformInfo)();
            expect(platformInfo.platform).toBe('darwin');
            expect(platformInfo.arch).toBe('x64');
            expect(platformInfo.isWindows).toBe(false);
            expect(platformInfo.exeExtension).toBe('');
        });
    });
    describe('getCodeQLExePath', () => {
        it('should resolve codeql.exe path on Windows when CODEQL_DIST is set and valid', () => {
            // Setup platform
            os.platform.mockReturnValue('win32');
            process.env.CODEQL_DIST = '/path/to/codeql';
            // Mock existsSync to return true specifically for the codeql.exe path
            fs.existsSync.mockImplementation((p) => p === '/path/to/codeql/codeql.exe');
            const codeqlPath = (0, environment_1.getCodeQLExePath)();
            expect(codeqlPath).toBe('/path/to/codeql/codeql.exe');
            expect(fs.existsSync).toHaveBeenCalledWith('/path/to/codeql/codeql.exe');
        });
        it('should resolve codeql path on non-Windows when CODEQL_DIST is set and valid', () => {
            // Setup platform
            os.platform.mockReturnValue('darwin');
            process.env.CODEQL_DIST = '/path/to/codeql';
            // Mock existsSync to return true specifically for the codeql path
            fs.existsSync.mockImplementation((p) => p === '/path/to/codeql/codeql');
            const codeqlPath = (0, environment_1.getCodeQLExePath)();
            expect(codeqlPath).toBe('/path/to/codeql/codeql');
            expect(fs.existsSync).toHaveBeenCalledWith('/path/to/codeql/codeql');
        });
        it('should fall back to PATH search if CODEQL_DIST is set but path is invalid, then succeed if PATH is valid', () => {
            // Setup platform
            os.platform.mockReturnValue('darwin');
            process.env.CODEQL_DIST = '/invalid/dist/path';
            // Mock file existence
            fs.existsSync.mockImplementation((p) => {
                if (p === '/invalid/dist/path/codeql')
                    return false;
                if (p === '/resolved/via/version/codeql')
                    return true;
                return false;
            });
            // Mock execFileSync to return unpackedLocation
            child_process_1.execFileSync.mockReturnValueOnce(JSON.stringify({ unpackedLocation: '/resolved/via/version' }));
            const codeqlPath = (0, environment_1.getCodeQLExePath)();
            expect(codeqlPath).toBe('/resolved/via/version/codeql');
            expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining("CODEQL_DIST is set to '/invalid/dist/path', but CodeQL executable was not found"));
            expect(child_process_1.execFileSync).toHaveBeenCalledWith('codeql', ['version', '--format=json'], expect.any(Object));
        });
        it('should find codeql via PATH using `codeql version --format=json` if CODEQL_DIST is not set', () => {
            // Setup platform
            os.platform.mockReturnValue('darwin');
            delete process.env.CODEQL_DIST;
            // Mock file existence
            fs.existsSync.mockImplementation((p) => p === '/resolved/via/version/codeql');
            // Mock execFileSync to return unpackedLocation
            child_process_1.execFileSync.mockReturnValueOnce(JSON.stringify({ unpackedLocation: '/resolved/via/version' }));
            const codeqlPath = (0, environment_1.getCodeQLExePath)();
            expect(codeqlPath).toBe('/resolved/via/version/codeql');
            expect(child_process_1.execFileSync).toHaveBeenCalledWith('codeql', ['version', '--format=json'], expect.any(Object));
            expect(fs.existsSync).toHaveBeenCalledWith('/resolved/via/version/codeql');
        });
        it('should return empty string if CODEQL_DIST is not set and `codeql version --format=json` fails (ENOENT)', () => {
            // Setup platform
            os.platform.mockReturnValue('darwin');
            delete process.env.CODEQL_DIST;
            // Mock execFileSync to throw ENOENT error
            const error = new Error('Command not found');
            error.code = 'ENOENT';
            child_process_1.execFileSync.mockImplementation(() => {
                throw error;
            });
            const codeqlPath = (0, environment_1.getCodeQLExePath)();
            expect(codeqlPath).toBe('');
            expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining("INFO: The command 'codeql' was not found in your system PATH."));
            expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('ERROR: Failed to determine CodeQL executable path'));
        });
        it('should return empty string if CODEQL_DIST is not set and `codeql version --format=json` output is invalid (missing unpackedLocation)', () => {
            // Setup platform
            os.platform.mockReturnValue('darwin');
            delete process.env.CODEQL_DIST;
            // Mock execFileSync to return invalid JSON without unpackedLocation
            child_process_1.execFileSync.mockReturnValueOnce(JSON.stringify({ version: '1.2.3' }));
            const codeqlPath = (0, environment_1.getCodeQLExePath)();
            expect(codeqlPath).toBe('');
            expect(consoleSpy.warn).toHaveBeenCalledWith(expect.stringContaining("WARN: Could not determine CodeQL executable path from 'codeql version --format=json' output."));
            expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('ERROR: Failed to determine CodeQL executable path'));
        });
        it('should return empty string if `codeql version --format=json` provides unpackedLocation but executable is not found there', () => {
            // Setup platform
            os.platform.mockReturnValue('darwin');
            delete process.env.CODEQL_DIST;
            // Mock execFileSync to return valid JSON with unpackedLocation
            child_process_1.execFileSync.mockReturnValueOnce(JSON.stringify({ unpackedLocation: '/some/path' }));
            // Mock existsSync to return false for the executable path
            fs.existsSync.mockReturnValue(false);
            const codeqlPath = (0, environment_1.getCodeQLExePath)();
            expect(codeqlPath).toBe('');
            expect(consoleSpy.warn).toHaveBeenCalledWith(expect.stringContaining("WARN: 'codeql version --format=json' provided unpackedLocation '/some/path', but executable not found"));
            expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('ERROR: Failed to determine CodeQL executable path'));
        });
    });
    describe('getJavaScriptExtractorRoot', () => {
        it('should return CODEQL_EXTRACTOR_JAVASCRIPT_ROOT when set', () => {
            process.env.CODEQL_EXTRACTOR_JAVASCRIPT_ROOT = '/path/to/js/extractor';
            const jsExtractorRoot = (0, environment_1.getJavaScriptExtractorRoot)('/path/to/codeql');
            expect(jsExtractorRoot).toBe('/path/to/js/extractor');
            expect(child_process_1.execFileSync).not.toHaveBeenCalled();
        });
        it('should resolve JS extractor root if env var not set and codeqlExePath is valid', () => {
            delete process.env.CODEQL_EXTRACTOR_JAVASCRIPT_ROOT;
            // Mock execFileSync to return a path
            child_process_1.execFileSync.mockReturnValueOnce('/resolved/js/extractor/path\n');
            const jsExtractorRoot = (0, environment_1.getJavaScriptExtractorRoot)('/valid/codeql/path');
            expect(jsExtractorRoot).toBe('/resolved/js/extractor/path');
            expect(child_process_1.execFileSync).toHaveBeenCalledWith('/valid/codeql/path', ['resolve', 'extractor', '--language=javascript'], expect.any(Object));
        });
        it('should return empty string if codeqlExePath is empty', () => {
            delete process.env.CODEQL_EXTRACTOR_JAVASCRIPT_ROOT;
            const jsExtractorRoot = (0, environment_1.getJavaScriptExtractorRoot)('');
            expect(jsExtractorRoot).toBe('');
            expect(child_process_1.execFileSync).not.toHaveBeenCalled();
            expect(consoleSpy.warn).toHaveBeenCalledWith(expect.stringMatching(/^\[CDS-.+ \d+\] WARN: Cannot resolve JavaScript extractor root because the CodeQL executable path was not provided or found\.$/));
        });
        it('should return empty string and log error if JS extractor resolution fails', () => {
            delete process.env.CODEQL_EXTRACTOR_JAVASCRIPT_ROOT;
            // Mock execFileSync to throw an error
            child_process_1.execFileSync.mockImplementation(() => {
                throw new Error('Command failed');
            });
            const jsExtractorRoot = (0, environment_1.getJavaScriptExtractorRoot)('/valid/codeql/path');
            expect(jsExtractorRoot).toBe('');
            expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining("Error resolving JavaScript extractor root using '/valid/codeql/path': Error: Command failed"));
        });
    });
    describe('setupJavaScriptExtractorEnv', () => {
        it('should correctly map CDS environment variables to JavaScript environment variables', () => {
            // Set sample environment variables for testing
            process.env.CODEQL_EXTRACTOR_CDS_WIP_DATABASE = 'cds-wip-db';
            process.env.CODEQL_EXTRACTOR_CDS_DIAGNOSTIC_DIR = 'cds-diagnostic-dir';
            process.env.CODEQL_EXTRACTOR_CDS_LOG_DIR = 'cds-log-dir';
            process.env.CODEQL_EXTRACTOR_CDS_SCRATCH_DIR = 'cds-scratch-dir';
            process.env.CODEQL_EXTRACTOR_CDS_TRAP_DIR = 'cds-trap-dir';
            process.env.CODEQL_EXTRACTOR_CDS_SOURCE_ARCHIVE_DIR = 'cds-source-archive-dir';
            (0, environment_1.setupJavaScriptExtractorEnv)();
            expect(process.env.CODEQL_EXTRACTOR_JAVASCRIPT_WIP_DATABASE).toBe('cds-wip-db');
            expect(process.env.CODEQL_EXTRACTOR_JAVASCRIPT_DIAGNOSTIC_DIR).toBe('cds-diagnostic-dir');
            expect(process.env.CODEQL_EXTRACTOR_JAVASCRIPT_LOG_DIR).toBe('cds-log-dir');
            expect(process.env.CODEQL_EXTRACTOR_JAVASCRIPT_SCRATCH_DIR).toBe('cds-scratch-dir');
            expect(process.env.CODEQL_EXTRACTOR_JAVASCRIPT_TRAP_DIR).toBe('cds-trap-dir');
            expect(process.env.CODEQL_EXTRACTOR_JAVASCRIPT_SOURCE_ARCHIVE_DIR).toBe('cds-source-archive-dir');
        });
        it('should handle missing CDS environment variables gracefully', () => {
            // Clear all CDS environment variables
            delete process.env.CODEQL_EXTRACTOR_CDS_WIP_DATABASE;
            delete process.env.CODEQL_EXTRACTOR_CDS_DIAGNOSTIC_DIR;
            delete process.env.CODEQL_EXTRACTOR_CDS_LOG_DIR;
            delete process.env.CODEQL_EXTRACTOR_CDS_SCRATCH_DIR;
            delete process.env.CODEQL_EXTRACTOR_CDS_TRAP_DIR;
            delete process.env.CODEQL_EXTRACTOR_CDS_SOURCE_ARCHIVE_DIR;
            (0, environment_1.setupJavaScriptExtractorEnv)();
            expect(process.env.CODEQL_EXTRACTOR_JAVASCRIPT_WIP_DATABASE).toBeUndefined();
            expect(process.env.CODEQL_EXTRACTOR_JAVASCRIPT_DIAGNOSTIC_DIR).toBeUndefined();
            expect(process.env.CODEQL_EXTRACTOR_JAVASCRIPT_LOG_DIR).toBeUndefined();
            expect(process.env.CODEQL_EXTRACTOR_JAVASCRIPT_SCRATCH_DIR).toBeUndefined();
            expect(process.env.CODEQL_EXTRACTOR_JAVASCRIPT_TRAP_DIR).toBeUndefined();
            expect(process.env.CODEQL_EXTRACTOR_JAVASCRIPT_SOURCE_ARCHIVE_DIR).toBeUndefined();
        });
    });
    describe('getAutobuildScriptPath', () => {
        it('should return correct autobuild script path for Windows', () => {
            os.platform.mockReturnValue('win32');
            const autobuildScriptPath = (0, environment_1.getAutobuildScriptPath)('/path/to/js/extractor');
            expect(autobuildScriptPath).toBe('/path/to/js/extractor/tools/autobuild.cmd');
        });
        it('should return correct autobuild script path for non-Windows', () => {
            os.platform.mockReturnValue('darwin');
            const autobuildScriptPath = (0, environment_1.getAutobuildScriptPath)('/path/to/js/extractor');
            expect(autobuildScriptPath).toBe('/path/to/js/extractor/tools/autobuild.sh');
        });
        it('should return empty string if jsExtractorRoot is empty', () => {
            const autobuildScriptPath = (0, environment_1.getAutobuildScriptPath)('');
            expect(autobuildScriptPath).toBe('');
        });
    });
    describe('configureLgtmIndexFilters', () => {
        it('should set up index filters with standard patterns when no existing filters are set', () => {
            delete process.env.LGTM_INDEX_FILTERS;
            (0, environment_1.configureLgtmIndexFilters)();
            expect(process.env.LGTM_INDEX_FILTERS).toBeDefined();
            expect(process.env.LGTM_INDEX_TYPESCRIPT).toBe('NONE');
            expect(process.env.LGTM_INDEX_FILETYPES).toBe('.cds:JSON');
        });
        it('should preserve existing exclusion filters except for generic exclusions', () => {
            process.env.LGTM_INDEX_FILTERS = [
                'exclude:**/*.*', // generic pattern
                'exclude:specific/path/**/*', // specific pattern
            ].join('\n');
            (0, environment_1.configureLgtmIndexFilters)();
            expect(process.env.LGTM_INDEX_FILTERS).toContain('include:**/*.cds.json');
            expect(process.env.LGTM_INDEX_FILTERS).toContain('exclude:specific/path/**/*');
            expect(process.env.LGTM_INDEX_TYPESCRIPT).toBe('NONE');
            expect(process.env.LGTM_INDEX_FILETYPES).toBe('.cds:JSON');
        });
    });
    describe('setupAndValidateEnvironment', () => {
        let filesystem;
        beforeEach(() => {
            filesystem = jest.requireMock('../../src/filesystem');
            filesystem.dirExists = jest.fn().mockReturnValue(true);
            // Ensure the mock is properly reset for each test
            fs.existsSync.mockReset();
        });
        it('should report error if CodeQL executable is not found', () => {
            // Setup CodeQL detection to fail
            delete process.env.CODEQL_DIST;
            // Mock execFileSync to throw ENOENT for codeql
            const error = new Error('Command not found');
            error.code = 'ENOENT';
            child_process_1.execFileSync.mockImplementation((_command, args) => {
                if (args === null || args === void 0 ? void 0 : args.includes('version')) {
                    throw error;
                }
                return '';
            });
            // No codeql executable exists
            fs.existsSync.mockReturnValue(false);
            const result = (0, environment_1.setupAndValidateEnvironment)('/path/to/source');
            expect(result.success).toBe(false);
            expect(result.errorMessages).toContain('Failed to find CodeQL executable. Ensure CODEQL_DIST is set and valid, or CodeQL CLI is in PATH.');
            expect(result.errorMessages).toContain('Cannot determine JavaScript extractor root because CodeQL executable was not found.');
        });
        it('should report error when source root does not exist', () => {
            // We're relying on the global mock to return false for '/invalid/source'
            const result = (0, environment_1.setupAndValidateEnvironment)('/invalid/source');
            expect(result.success).toBe(false);
            expect(result.errorMessages).toContain("Project root directory '/invalid/source' does not exist.");
        });
        it('should report error if JS extractor root cannot be resolved even if CodeQL is found', () => {
            // Mock OS platform
            os.platform.mockReturnValue('linux');
            // Setup CodeQL detection
            delete process.env.CODEQL_DIST;
            // Mock execFileSync for version and extractor resolution
            child_process_1.execFileSync.mockImplementation((_command, args) => {
                if (args === null || args === void 0 ? void 0 : args.includes('version')) {
                    return JSON.stringify({ unpackedLocation: '/path/to/codeql_unpacked' });
                }
                if (args === null || args === void 0 ? void 0 : args.includes('extractor')) {
                    throw new Error('Extractor resolution failed');
                }
                return '';
            });
            // Mock fs.existsSync
            fs.existsSync.mockImplementation((p) => {
                if (p === '/path/to/codeql_unpacked/codeql')
                    return true;
                return false;
            });
            const result = (0, environment_1.setupAndValidateEnvironment)('/path/to/source');
            expect(result.success).toBe(false);
            expect(result.codeqlExePath).toBe('/path/to/codeql_unpacked/codeql'); // CodeQL was found
            expect(result.jsExtractorRoot).toBe(''); // But JS extractor root was not
            expect(result.errorMessages).toContain('Failed to determine JavaScript extractor root using the found CodeQL executable.');
        });
        // Test for the specific runtime error condition
        it('should fail validation if CODEQL_DIST is not set and codeql is not in PATH, leading to empty codeqlExePath', () => {
            // Setup CodeQL detection to fail
            delete process.env.CODEQL_DIST;
            // Mock execFileSync to throw ENOENT for codeql
            const error = new Error('Command not found');
            error.code = 'ENOENT';
            child_process_1.execFileSync.mockImplementation((_command, args) => {
                if (args === null || args === void 0 ? void 0 : args.includes('version')) {
                    throw error;
                }
                return '';
            });
            // No codeql executable exists
            fs.existsSync.mockReturnValue(false);
            const result = (0, environment_1.setupAndValidateEnvironment)('/path/to/source');
            expect(result.success).toBe(false);
            expect(result.codeqlExePath).toBe(''); // This is key for the runtime error
            expect(result.errorMessages).toContain('Failed to find CodeQL executable. Ensure CODEQL_DIST is set and valid, or CodeQL CLI is in PATH.');
            expect(result.errorMessages).toContain('Cannot determine JavaScript extractor root because CodeQL executable was not found.');
        });
    });
});
//# sourceMappingURL=environment.test.js.map