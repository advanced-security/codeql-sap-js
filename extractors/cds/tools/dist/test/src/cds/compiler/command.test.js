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
const compiler_1 = require("../../../../src/cds/compiler");
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
describe('cds compiler command', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset the command cache between tests to ensure clean state
        (0, compiler_1.resetCdsCommandCache)();
    });
    describe('determineCdsCommand', () => {
        it('should return "cds" when cds command is available', () => {
            // Mock successful execution of "cds --version"
            childProcess.execFileSync.mockImplementation(() => Buffer.from('4.6.0'));
            // Execute
            const result = (0, compiler_1.determineCdsCommand)(undefined, '/mock/source/root');
            // Verify
            expect(result).toBe('cds');
            expect(childProcess.execFileSync).toHaveBeenCalledWith('sh', ['-c', 'cds --version'], {
                encoding: 'utf8',
                stdio: 'pipe',
                timeout: 5000,
                cwd: '/mock/source/root',
                env: expect.objectContaining({
                    CODEQL_EXTRACTOR_CDS_WIP_DATABASE: undefined,
                    CODEQL_RUNNER: undefined,
                }),
            });
        });
        it('should return "npx -y --package @sap/cds-dk cds" when cds command is not available', () => {
            // Mock failed execution for "cds --version" but success for npx
            childProcess.execFileSync.mockImplementation((_command, args) => {
                const fullCommand = args.join(' ');
                if (fullCommand === '-c cds --version') {
                    throw new Error('Command not found');
                }
                // The shell-quote library escapes the command, so it becomes quoted
                if (fullCommand === "-c 'npx -y --package @sap/cds-dk cds' --version") {
                    return Buffer.from('6.1.3');
                }
                throw new Error('Unexpected command');
            });
            // Execute
            const result = (0, compiler_1.determineCdsCommand)(undefined, '/mock/source/root');
            // Verify
            expect(result).toBe('npx -y --package @sap/cds-dk cds');
            // Should have tried both commands
            expect(childProcess.execFileSync).toHaveBeenCalledWith('sh', ['-c', 'cds --version'], {
                encoding: 'utf8',
                stdio: 'pipe',
                timeout: 5000,
                cwd: '/mock/source/root',
                env: expect.objectContaining({
                    CODEQL_EXTRACTOR_CDS_WIP_DATABASE: undefined,
                    CODEQL_RUNNER: undefined,
                }),
            });
            expect(childProcess.execFileSync).toHaveBeenCalledWith('sh', ['-c', "'npx -y --package @sap/cds-dk cds' --version"], {
                encoding: 'utf8',
                stdio: 'pipe',
                timeout: 5000,
                cwd: '/mock/source/root',
                env: expect.objectContaining({
                    CODEQL_EXTRACTOR_CDS_WIP_DATABASE: undefined,
                    CODEQL_RUNNER: undefined,
                }),
            });
        });
        it('should cache command test results to avoid duplicate work', () => {
            // Mock successful execution of "cds --version"
            childProcess.execFileSync.mockImplementation(() => Buffer.from('4.6.0'));
            // Execute twice
            const result1 = (0, compiler_1.determineCdsCommand)(undefined, '/mock/source/root');
            const result2 = (0, compiler_1.determineCdsCommand)(undefined, '/mock/source/root');
            // Verify both calls return the same result
            expect(result1).toBe('cds');
            expect(result2).toBe('cds');
            // Verify execFileSync was called minimal times (once for cds during cache initialization)
            expect(childProcess.execFileSync).toHaveBeenCalledTimes(1);
        });
    });
});
//# sourceMappingURL=command.test.js.map