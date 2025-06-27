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
const fs_1 = require("fs");
const path_1 = require("path");
const tmp = __importStar(require("tmp"));
const functions_1 = require("../../../../src/cds/parser/functions");
/**
 * Validates that a path is safe to use within a base directory.
 * Prevents path traversal attacks by ensuring the resolved path stays within the base directory.
 */
function validateSafePath(basePath, ...pathSegments) {
    const resolvedBase = (0, path_1.resolve)(basePath);
    const targetPath = (0, path_1.resolve)(basePath, ...pathSegments);
    // Check if the resolved target path is within the base directory
    const relativePath = (0, path_1.relative)(resolvedBase, targetPath);
    if (relativePath.startsWith('..') || relativePath.includes('..')) {
        throw new Error(`Path traversal detected: ${pathSegments.join('/')}`);
    }
    return targetPath;
}
describe('determineCdsFilesToCompile', () => {
    let tempDir;
    let sourceRoot;
    let tmpCleanup;
    beforeEach(() => {
        // Create a secure temporary directory for each test
        const tmpObj = tmp.dirSync({ unsafeCleanup: true });
        tempDir = tmpObj.name;
        sourceRoot = tempDir;
        tmpCleanup = tmpObj.removeCallback;
    });
    afterEach(() => {
        // Clean up temporary directory using tmp library's cleanup function
        if (tmpCleanup) {
            tmpCleanup();
        }
    });
    it('should return all files when there is only one CDS file', () => {
        const project = {
            projectDir: '.',
            cdsFiles: ['service.cds'],
            imports: new Map(),
        };
        const result = (0, functions_1.determineCdsFilesToCompile)(sourceRoot, project);
        expect(result).toEqual(['service.cds']);
    });
    it('should return all files when there are no imports', () => {
        const project = {
            projectDir: '.',
            cdsFiles: ['service1.cds', 'service2.cds'],
            imports: new Map(),
        };
        const result = (0, functions_1.determineCdsFilesToCompile)(sourceRoot, project);
        expect(result).toEqual(['service1.cds', 'service2.cds']);
    });
    it('should return only root files for non-CAP projects with imports', () => {
        // Create test CDS files in a flat structure (not CAP-like)
        (0, fs_1.writeFileSync)(validateSafePath(sourceRoot, 'service.cds'), 'using from "./schema";');
        (0, fs_1.writeFileSync)(validateSafePath(sourceRoot, 'schema.cds'), 'entity Test {}');
        const project = {
            projectDir: '.',
            cdsFiles: ['service.cds', 'schema.cds'],
            imports: new Map([
                [
                    'service.cds',
                    [
                        {
                            resolvedPath: 'schema.cds',
                            path: './schema',
                            isRelative: true,
                            isModule: false,
                            statement: 'using from "./schema";',
                        },
                    ],
                ],
            ]),
        };
        const result = (0, functions_1.determineCdsFilesToCompile)(sourceRoot, project);
        // For non-CAP projects, should use the old behavior
        expect(result).toEqual(['service.cds']);
        expect(result).not.toContain('schema.cds');
    });
    it('should use project-level compilation for CAP projects with srv and db directories', () => {
        // Create test CDS files
        (0, fs_1.mkdirSync)(validateSafePath(sourceRoot, 'srv'), { recursive: true });
        (0, fs_1.mkdirSync)(validateSafePath(sourceRoot, 'db'), { recursive: true });
        (0, fs_1.writeFileSync)(validateSafePath(sourceRoot, 'srv/service.cds'), 'using from "../db/schema";');
        (0, fs_1.writeFileSync)(validateSafePath(sourceRoot, 'db/schema.cds'), 'entity Test {}');
        const project = {
            projectDir: '.',
            cdsFiles: ['srv/service.cds', 'db/schema.cds'],
            imports: new Map([
                [
                    'srv/service.cds',
                    [
                        {
                            resolvedPath: 'db/schema.cds',
                            path: '../db/schema',
                            isRelative: true,
                            isModule: false,
                            statement: 'using from "../db/schema";',
                        },
                    ],
                ],
            ]),
        };
        const result = (0, functions_1.determineCdsFilesToCompile)(sourceRoot, project);
        // For CAP projects, should use project-level compilation
        expect(result).toEqual(['__PROJECT_LEVEL_COMPILATION__']);
    });
    it('should use project-level compilation for CAP projects with multiple services', () => {
        // Create test CDS files
        (0, fs_1.mkdirSync)(validateSafePath(sourceRoot, 'srv'), { recursive: true });
        (0, fs_1.mkdirSync)(validateSafePath(sourceRoot, 'db'), { recursive: true });
        (0, fs_1.writeFileSync)(validateSafePath(sourceRoot, 'srv/service1.cds'), 'using from "../db/schema";');
        (0, fs_1.writeFileSync)(validateSafePath(sourceRoot, 'srv/service2.cds'), 'using from "../db/schema";');
        (0, fs_1.writeFileSync)(validateSafePath(sourceRoot, 'db/schema.cds'), 'entity Test {}');
        const project = {
            projectDir: '.',
            cdsFiles: ['srv/service1.cds', 'srv/service2.cds', 'db/schema.cds'],
            imports: new Map([
                [
                    'srv/service1.cds',
                    [
                        {
                            resolvedPath: 'db/schema.cds',
                            path: '../db/schema',
                            isRelative: true,
                            isModule: false,
                            statement: 'using from "../db/schema";',
                        },
                    ],
                ],
                [
                    'srv/service2.cds',
                    [
                        {
                            resolvedPath: 'db/schema.cds',
                            path: '../db/schema',
                            isRelative: true,
                            isModule: false,
                            statement: 'using from "../db/schema";',
                        },
                    ],
                ],
            ]),
        };
        const result = (0, functions_1.determineCdsFilesToCompile)(sourceRoot, project);
        // For CAP projects, should use project-level compilation
        expect(result).toEqual(['__PROJECT_LEVEL_COMPILATION__']);
    });
    it('should return empty array when project has no CDS files', () => {
        const project = {
            projectDir: '.',
            cdsFiles: [],
            imports: new Map(),
        };
        const result = (0, functions_1.determineCdsFilesToCompile)(sourceRoot, project);
        expect(result).toEqual([]);
    });
    it('should fall back to all files when no imports map is provided', () => {
        const project = {
            projectDir: '.',
            cdsFiles: ['service1.cds', 'service2.cds'],
        };
        const result = (0, functions_1.determineCdsFilesToCompile)(sourceRoot, project);
        expect(result).toEqual(['service1.cds', 'service2.cds']);
    });
    it('should handle projects with no root files by returning all files', () => {
        // Create a project where all files are imported by each other (circular)
        const project = {
            projectDir: '.',
            cdsFiles: ['file1.cds', 'file2.cds'],
            imports: new Map([
                [
                    'file1.cds',
                    [
                        {
                            resolvedPath: 'file2.cds',
                            path: './file2',
                            isRelative: true,
                            isModule: false,
                            statement: 'using from "./file2";',
                        },
                    ],
                ],
                [
                    'file2.cds',
                    [
                        {
                            resolvedPath: 'file1.cds',
                            path: './file1',
                            isRelative: true,
                            isModule: false,
                            statement: 'using from "./file1";',
                        },
                    ],
                ],
            ]),
        };
        const result = (0, functions_1.determineCdsFilesToCompile)(sourceRoot, project);
        // In a circular dependency scenario, the function should still identify that
        // both files are imported and fall back to compiling all files
        expect(result).toEqual(['file1.cds', 'file2.cds']);
    });
});
//# sourceMappingURL=files-to-compile.test.js.map