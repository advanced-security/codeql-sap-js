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
describe('Project-aware compilation for CAP projects', () => {
    let tempDir;
    let tmpCleanup;
    beforeEach(() => {
        // Create a secure temporary directory for each test
        const tmpObj = tmp.dirSync({ unsafeCleanup: true });
        tempDir = tmpObj.name;
        tmpCleanup = tmpObj.removeCallback;
    });
    afterEach(() => {
        // Clean up temporary directory using tmp library's cleanup function
        if (tmpCleanup) {
            tmpCleanup();
        }
    });
    it('should use project-level compilation for log injection test case structure', () => {
        // Create the log injection test case structure
        const projectPath = validateSafePath(tempDir, 'log-injection-without-protocol-none');
        (0, fs_1.mkdirSync)(projectPath, { recursive: true });
        (0, fs_1.mkdirSync)(validateSafePath(projectPath, 'db'), { recursive: true });
        (0, fs_1.mkdirSync)(validateSafePath(projectPath, 'srv'), { recursive: true });
        // Create package.json with CAP dependencies
        (0, fs_1.writeFileSync)(validateSafePath(projectPath, 'package.json'), JSON.stringify({
            name: 'log-injection-test',
            dependencies: {
                '@sap/cds': '^7.0.0',
            },
        }));
        // Create CDS files
        (0, fs_1.writeFileSync)(validateSafePath(projectPath, 'db', 'schema.cds'), `namespace advanced_security.log_injection.sample_entities;

entity Entity1 {
  Attribute1 : String(100);
  Attribute2 : String(100)
}

entity Entity2 {
  Attribute3 : String(100);
  Attribute4 : String(100)
}`);
        (0, fs_1.writeFileSync)(validateSafePath(projectPath, 'srv', 'service1.cds'), `using { advanced_security.log_injection.sample_entities as db_schema } from '../db/schema';

service Service1 @(path: '/service-1') {
  entity Service1Entity as projection on db_schema.Entity1 excluding { Attribute2 }
  
  action send1 (
    messageToPass : String
  ) returns String;
}`);
        (0, fs_1.writeFileSync)(validateSafePath(projectPath, 'srv', 'service2.cds'), `using { advanced_security.log_injection.sample_entities as db_schema } from '../db/schema';

service Service2 @(path: '/service-2') {
  entity Service2Entity as projection on db_schema.Entity2
}`);
        // Set up the project structure relative to tempDir
        const relativeProjectPath = 'log-injection-without-protocol-none';
        const project = {
            projectDir: relativeProjectPath,
            cdsFiles: [
                'log-injection-without-protocol-none/db/schema.cds',
                'log-injection-without-protocol-none/srv/service1.cds',
                'log-injection-without-protocol-none/srv/service2.cds',
            ],
            imports: new Map([
                [
                    'log-injection-without-protocol-none/srv/service1.cds',
                    [
                        {
                            resolvedPath: 'log-injection-without-protocol-none/db/schema.cds',
                            path: '../db/schema',
                            isRelative: true,
                            isModule: false,
                            statement: "using { advanced_security.log_injection.sample_entities as db_schema } from '../db/schema';",
                        },
                    ],
                ],
                [
                    'log-injection-without-protocol-none/srv/service2.cds',
                    [
                        {
                            resolvedPath: 'log-injection-without-protocol-none/db/schema.cds',
                            path: '../db/schema',
                            isRelative: true,
                            isModule: false,
                            statement: "using { advanced_security.log_injection.sample_entities as db_schema } from '../db/schema';",
                        },
                    ],
                ],
            ]),
        };
        const result = (0, functions_1.determineCdsFilesToCompile)(tempDir, project);
        // The result should indicate project-level compilation
        expect(result).toEqual(['__PROJECT_LEVEL_COMPILATION__']);
        // This verifies that db/schema.cds will be compiled as part of the project
        // rather than being skipped because it's imported by other files
    });
    it('should still use individual file compilation for simple projects without CAP structure', () => {
        // Create a simple project without typical CAP structure
        const simpleProjectPath = validateSafePath(tempDir, 'simple-project');
        (0, fs_1.mkdirSync)(simpleProjectPath, { recursive: true });
        // Create CDS files in flat structure
        (0, fs_1.writeFileSync)(validateSafePath(simpleProjectPath, 'main.cds'), `using from "./model";

service MainService {
  entity Items as projection on model.Item;
}`);
        (0, fs_1.writeFileSync)(validateSafePath(simpleProjectPath, 'model.cds'), `namespace model;

entity Item {
  id : Integer;
  name : String;
}`);
        const project = {
            projectDir: 'simple-project',
            cdsFiles: ['simple-project/main.cds', 'simple-project/model.cds'],
            imports: new Map([
                [
                    'simple-project/main.cds',
                    [
                        {
                            resolvedPath: 'simple-project/model.cds',
                            path: './model',
                            isRelative: true,
                            isModule: false,
                            statement: 'using from "./model";',
                        },
                    ],
                ],
            ]),
        };
        const result = (0, functions_1.determineCdsFilesToCompile)(tempDir, project);
        // Should use the old behavior for non-CAP projects
        expect(result).toEqual(['simple-project/main.cds']);
        expect(result).not.toContain('simple-project/model.cds');
    });
});
//# sourceMappingURL=project-aware-compilation.test.js.map