import { mkdirSync, writeFileSync } from 'fs';
import { resolve, relative } from 'path';

import * as tmp from 'tmp';

import { determineCdsFilesToCompile } from '../../../../src/cds/parser/functions';

/**
 * Validates that a path is safe to use within a base directory.
 * Prevents path traversal attacks by ensuring the resolved path stays within the base directory.
 */
function validateSafePath(basePath: string, ...pathSegments: string[]): string {
  const resolvedBase = resolve(basePath);
  const targetPath = resolve(basePath, ...pathSegments);

  // Check if the resolved target path is within the base directory
  const relativePath = relative(resolvedBase, targetPath);
  if (relativePath.startsWith('..') || relativePath.includes('..')) {
    throw new Error(`Path traversal detected: ${pathSegments.join('/')}`);
  }

  return targetPath;
}

describe('Project-aware compilation for CAP projects', () => {
  let tempDir: string;
  let tmpCleanup: (() => void) | undefined;

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
    mkdirSync(projectPath, { recursive: true });
    mkdirSync(validateSafePath(projectPath, 'db'), { recursive: true });
    mkdirSync(validateSafePath(projectPath, 'srv'), { recursive: true });

    // Create package.json with CAP dependencies
    writeFileSync(
      validateSafePath(projectPath, 'package.json'),
      JSON.stringify({
        name: 'log-injection-test',
        dependencies: {
          '@sap/cds': '^7.0.0',
        },
      }),
    );

    // Create CDS files
    writeFileSync(
      validateSafePath(projectPath, 'db', 'schema.cds'),
      `namespace advanced_security.log_injection.sample_entities;

entity Entity1 {
  Attribute1 : String(100);
  Attribute2 : String(100)
}

entity Entity2 {
  Attribute3 : String(100);
  Attribute4 : String(100)
}`,
    );

    writeFileSync(
      validateSafePath(projectPath, 'srv', 'service1.cds'),
      `using { advanced_security.log_injection.sample_entities as db_schema } from '../db/schema';

service Service1 @(path: '/service-1') {
  entity Service1Entity as projection on db_schema.Entity1 excluding { Attribute2 }
  
  action send1 (
    messageToPass : String
  ) returns String;
}`,
    );

    writeFileSync(
      validateSafePath(projectPath, 'srv', 'service2.cds'),
      `using { advanced_security.log_injection.sample_entities as db_schema } from '../db/schema';

service Service2 @(path: '/service-2') {
  entity Service2Entity as projection on db_schema.Entity2
}`,
    );

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
              statement:
                "using { advanced_security.log_injection.sample_entities as db_schema } from '../db/schema';",
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
              statement:
                "using { advanced_security.log_injection.sample_entities as db_schema } from '../db/schema';",
            },
          ],
        ],
      ]),
    };

    const result = determineCdsFilesToCompile(tempDir, project);

    // The result should indicate project-level compilation with CAP directories
    expect(result.compilationTargets).toEqual(['db', 'srv']); // Per ProjectCompilationOnly spec
    expect(result.expectedOutputFile).toEqual('log-injection-without-protocol-none/model.cds.json'); // Project-relative path per spec

    // This verifies that db/schema.cds will be compiled as part of the project
    // rather than being skipped because it's imported by other files
  });

  it('should still use individual file compilation for simple projects without CAP structure', () => {
    // Create a simple project without typical CAP structure
    const simpleProjectPath = validateSafePath(tempDir, 'simple-project');
    mkdirSync(simpleProjectPath, { recursive: true });

    // Create CDS files in flat structure
    writeFileSync(
      validateSafePath(simpleProjectPath, 'main.cds'),
      `using from "./model";

service MainService {
  entity Items as projection on model.Item;
}`,
    );

    writeFileSync(
      validateSafePath(simpleProjectPath, 'model.cds'),
      `namespace model;

entity Item {
  id : Integer;
  name : String;
}`,
    );

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

    const result = determineCdsFilesToCompile(tempDir, project);

    // Should compile all files for non-CAP projects (per ProjectCompilationOnly spec)
    expect(result.compilationTargets).toEqual(['main.cds', 'model.cds']); // All files in project
    expect(result.expectedOutputFile).toEqual('simple-project/model.cds.json'); // Project-relative path per spec
  });
});
