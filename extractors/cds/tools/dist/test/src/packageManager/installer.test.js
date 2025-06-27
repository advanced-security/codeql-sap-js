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
const path = __importStar(require("path"));
const packageManager_1 = require("../../../src/packageManager");
// Mock dependencies
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
}));
jest.mock('path', () => ({
    ...jest.requireActual('path'),
    dirname: jest.fn(),
    join: jest.fn((...paths) => paths.join('/')),
    resolve: jest.fn((...paths) => paths.join('/')),
}));
jest.mock('child_process', () => ({
    execFileSync: jest.fn(),
    execSync: jest.fn(),
}));
jest.mock('../../../src/diagnostics', () => ({
    addDependencyDiagnostic: jest.fn(),
    addPackageJsonParsingDiagnostic: jest.fn(),
    DiagnosticSeverity: {
        Warning: 'warning',
        Error: 'error',
    },
}));
jest.mock('../../../src/logging', () => ({
    cdsExtractorLog: jest.fn(),
}));
// Mock the version resolver
jest.mock('../../../src/packageManager/versionResolver', () => ({
    resolveCdsVersions: jest.fn(),
}));
describe('installer', () => {
    // Helper function to create a minimal mock dependency graph
    const createMockDependencyGraph = (projects) => {
        const projectsMap = new Map();
        projects.forEach(({ projectDir, packageJson }) => {
            const enhancedProject = {
                id: `project-${projectDir}`,
                projectDir,
                cdsFiles: [`${projectDir}/src/file.cds`],
                cdsFilesToCompile: [`${projectDir}/src/file.cds`],
                expectedOutputFiles: [`${projectDir}/src/file.json`],
                packageJson,
                status: 'discovered',
                compilationTasks: [],
                timestamps: {
                    discovered: new Date(),
                },
            };
            projectsMap.set(projectDir, enhancedProject);
        });
        return {
            id: 'test-graph',
            sourceRootDir: '/source',
            scriptDir: '/script',
            projects: projectsMap,
            globalCacheDirectories: new Map(),
            fileCache: {
                fileContents: new Map(),
                packageJsonCache: new Map(),
                cdsParseCache: new Map(),
            },
            config: {
                maxRetryAttempts: 3,
                enableDetailedLogging: false,
                generateDebugOutput: false,
                compilationTimeoutMs: 30000,
            },
            debugInfo: {},
            statusSummary: {
                totalProjects: projects.length,
                totalCdsFiles: projects.length,
                totalCompilationTasks: 0,
                successfulCompilations: 0,
                failedCompilations: 0,
                skippedCompilations: 0,
                retriedCompilations: 0,
                jsonFilesGenerated: 0,
                overallSuccess: true,
                criticalErrors: [],
                warnings: [],
                performance: {
                    totalDurationMs: 0,
                    parsingDurationMs: 100,
                    compilationDurationMs: 0,
                    extractionDurationMs: 0,
                },
            },
            errors: {
                critical: [],
                warnings: [],
            },
            currentPhase: 'parsing',
        };
    };
    beforeEach(() => {
        jest.clearAllMocks();
        // Setup default mocks
        path.join.mockImplementation((...paths) => paths.join('/'));
        path.resolve.mockImplementation((...paths) => paths.join('/'));
    });
    describe('installDependencies', () => {
        beforeEach(() => {
            // Mock file system operations
            fs.existsSync.mockReturnValue(false);
            fs.mkdirSync.mockReturnValue(undefined);
            fs.writeFileSync.mockReturnValue(undefined);
            childProcess.execFileSync.mockReturnValue('');
            // Mock version resolver
            const mockResolveCdsVersions = jest.mocked(jest.requireMock('../../../src/packageManager/versionResolver').resolveCdsVersions);
            mockResolveCdsVersions.mockReturnValue({
                resolvedCdsVersion: '6.1.3',
                resolvedCdsDkVersion: '6.0.0',
                cdsExactMatch: true,
                cdsDkExactMatch: true,
            });
        });
        it('should install dependencies successfully', () => {
            const dependencyGraph = createMockDependencyGraph([
                {
                    projectDir: '/project1',
                    packageJson: {
                        name: 'project1',
                        dependencies: { '@sap/cds': '6.1.3' },
                        devDependencies: { '@sap/cds-dk': '6.0.0' },
                    },
                },
            ]);
            const result = (0, packageManager_1.installDependencies)(dependencyGraph, '/source', '/codeql');
            expect(fs.mkdirSync).toHaveBeenCalledWith('/source/.cds-extractor-cache', {
                recursive: true,
            });
            expect(fs.writeFileSync).toHaveBeenCalled();
            expect(childProcess.execFileSync).toHaveBeenCalledWith('npm', ['install', '--quiet', '--no-audit', '--no-fund'], expect.objectContaining({ cwd: expect.stringContaining('cds-') }));
            expect(result.size).toBe(1);
        });
        it('should handle cache directory creation failure', () => {
            fs.mkdirSync.mockImplementation(() => {
                throw new Error('Permission denied');
            });
            const dependencyGraph = createMockDependencyGraph([
                {
                    projectDir: '/project1',
                    packageJson: { name: 'project1', dependencies: { '@sap/cds': '6.1.3' } },
                },
            ]);
            const result = (0, packageManager_1.installDependencies)(dependencyGraph, '/source', '/codeql');
            // Should return empty map since cache creation failed
            expect(result.size).toBe(0);
        });
        it('should use existing cached dependencies', () => {
            // Mock that node_modules already exists - need to handle cache dir structure
            fs.existsSync.mockImplementation((path) => {
                // Return true for cache root directory
                if (path === '/source/.cds-extractor-cache') {
                    return true;
                }
                // Return true for the specific cache directory (cds-<hash>)
                if (path.includes('.cds-extractor-cache/cds-') && !path.includes('node_modules')) {
                    return true;
                }
                // Return true for the specific node_modules paths that the code checks
                if (path.includes('.cds-extractor-cache/cds-') && path.endsWith('node_modules/@sap/cds')) {
                    return true;
                }
                if (path.includes('.cds-extractor-cache/cds-') &&
                    path.endsWith('node_modules/@sap/cds-dk')) {
                    return true;
                }
                return false;
            });
            const dependencyGraph = createMockDependencyGraph([
                {
                    projectDir: '/project1',
                    packageJson: {
                        name: 'project1',
                        dependencies: { '@sap/cds': '6.1.3' },
                        devDependencies: { '@sap/cds-dk': '6.0.0' },
                    },
                },
            ]);
            const result = (0, packageManager_1.installDependencies)(dependencyGraph, '/source', '/codeql');
            // Should not call npm install since cache exists
            expect(childProcess.execFileSync).not.toHaveBeenCalledWith('npm', ['install', '--quiet', '--no-audit', '--no-fund'], expect.any(Object));
            expect(result.size).toBe(1);
        });
        it('should handle npm install failures gracefully', () => {
            childProcess.execFileSync.mockImplementation((command) => {
                if (command === 'npm') {
                    throw new Error('npm install failed');
                }
                return '';
            });
            const dependencyGraph = createMockDependencyGraph([
                {
                    projectDir: '/project1',
                    packageJson: {
                        name: 'project1',
                        dependencies: { '@sap/cds': '6.1.3' },
                        devDependencies: { '@sap/cds-dk': '6.0.0' },
                    },
                },
            ]);
            const result = (0, packageManager_1.installDependencies)(dependencyGraph, '/source', '/codeql');
            // Should skip failed combinations
            expect(result.size).toBe(0);
        });
        it('should handle empty dependency graph', () => {
            const dependencyGraph = createMockDependencyGraph([]);
            const result = (0, packageManager_1.installDependencies)(dependencyGraph, '/source', '/codeql');
            expect(result.size).toBe(0);
        });
        it('should reuse cache for projects with different version specs but same resolved versions', () => {
            // Mock version resolver to return the same resolved versions for different specs
            const mockResolveCdsVersions = jest.mocked(jest.requireMock('../../../src/packageManager/versionResolver').resolveCdsVersions);
            mockResolveCdsVersions.mockReturnValue({
                resolvedCdsVersion: '6.1.3',
                resolvedCdsDkVersion: '6.0.0',
                cdsExactMatch: false,
                cdsDkExactMatch: false,
            });
            const dependencyGraph = createMockDependencyGraph([
                {
                    projectDir: '/project1',
                    packageJson: {
                        name: 'project1',
                        dependencies: { '@sap/cds': '^6.1.0' },
                        devDependencies: { '@sap/cds-dk': '^6.0.0' },
                    },
                },
                {
                    projectDir: '/project2',
                    packageJson: {
                        name: 'project2',
                        dependencies: { '@sap/cds': '~6.1.0' },
                        devDependencies: { '@sap/cds-dk': '~6.0.0' },
                    },
                },
                {
                    projectDir: '/project3',
                    packageJson: {
                        name: 'project3',
                        dependencies: { '@sap/cds': 'latest' },
                        devDependencies: { '@sap/cds-dk': 'latest' },
                    },
                },
            ]);
            const result = (0, packageManager_1.installDependencies)(dependencyGraph, '/source', '/codeql');
            // Should create only one cache directory since all resolve to the same versions
            expect(fs.mkdirSync).toHaveBeenCalledWith('/source/.cds-extractor-cache', {
                recursive: true,
            });
            // Should only write one package.json (since only one cache dir is created)
            expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
            // Should only run npm install once
            expect(childProcess.execFileSync).toHaveBeenCalledTimes(1);
            expect(childProcess.execFileSync).toHaveBeenCalledWith('npm', ['install', '--quiet', '--no-audit', '--no-fund'], expect.objectContaining({ cwd: expect.stringContaining('cds-') }));
            // All three projects should be mapped to cache directories
            expect(result.size).toBe(3);
            // All projects should use the same cache directory
            const cacheDirs = Array.from(result.values());
            expect(new Set(cacheDirs).size).toBe(1); // Only one unique cache directory
        });
        it('should create separate caches for projects with different resolved versions', () => {
            const mockResolveCdsVersions = jest.mocked(jest.requireMock('../../../src/packageManager/versionResolver').resolveCdsVersions);
            // Mock different return values based on input
            mockResolveCdsVersions.mockImplementation((cdsVersion, _cdsDkVersion) => {
                if (cdsVersion === '6.1.3') {
                    return {
                        resolvedCdsVersion: '6.1.3',
                        resolvedCdsDkVersion: '6.0.0',
                        cdsExactMatch: true,
                        cdsDkExactMatch: true,
                    };
                }
                else {
                    return {
                        resolvedCdsVersion: '7.0.0',
                        resolvedCdsDkVersion: '7.0.0',
                        cdsExactMatch: true,
                        cdsDkExactMatch: true,
                    };
                }
            });
            const dependencyGraph = createMockDependencyGraph([
                {
                    projectDir: '/project1',
                    packageJson: {
                        name: 'project1',
                        dependencies: { '@sap/cds': '6.1.3' },
                        devDependencies: { '@sap/cds-dk': '6.0.0' },
                    },
                },
                {
                    projectDir: '/project2',
                    packageJson: {
                        name: 'project2',
                        dependencies: { '@sap/cds': '7.0.0' },
                        devDependencies: { '@sap/cds-dk': '7.0.0' },
                    },
                },
            ]);
            const result = (0, packageManager_1.installDependencies)(dependencyGraph, '/source', '/codeql');
            // Should create two separate cache directories
            expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
            expect(childProcess.execFileSync).toHaveBeenCalledTimes(2);
            // Both projects should be mapped
            expect(result.size).toBe(2);
            // Projects should use different cache directories
            const cacheDirs = Array.from(result.values());
            expect(new Set(cacheDirs).size).toBe(2); // Two unique cache directories
        });
    });
});
//# sourceMappingURL=installer.test.js.map