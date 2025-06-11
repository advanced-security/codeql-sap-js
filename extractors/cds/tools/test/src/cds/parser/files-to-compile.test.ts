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

describe('determineCdsFilesToCompile', () => {
  let tempDir: string;
  let sourceRoot: string;
  let tmpCleanup: (() => void) | undefined;

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

    const result = determineCdsFilesToCompile(sourceRoot, project);

    expect(result).toEqual(['service.cds']);
  });

  it('should return all files when there are no imports', () => {
    const project = {
      projectDir: '.',
      cdsFiles: ['service1.cds', 'service2.cds'],
      imports: new Map(),
    };

    const result = determineCdsFilesToCompile(sourceRoot, project);

    expect(result).toEqual(['service1.cds', 'service2.cds']);
  });

  it('should return only root files for non-CAP projects with imports', () => {
    // Create test CDS files in a flat structure (not CAP-like)
    writeFileSync(validateSafePath(sourceRoot, 'service.cds'), 'using from "./schema";');
    writeFileSync(validateSafePath(sourceRoot, 'schema.cds'), 'entity Test {}');

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

    const result = determineCdsFilesToCompile(sourceRoot, project);

    // For non-CAP projects, should use the old behavior
    expect(result).toEqual(['service.cds']);
    expect(result).not.toContain('schema.cds');
  });

  it('should use project-level compilation for CAP projects with srv and db directories', () => {
    // Create test CDS files
    mkdirSync(validateSafePath(sourceRoot, 'srv'), { recursive: true });
    mkdirSync(validateSafePath(sourceRoot, 'db'), { recursive: true });
    writeFileSync(validateSafePath(sourceRoot, 'srv/service.cds'), 'using from "../db/schema";');
    writeFileSync(validateSafePath(sourceRoot, 'db/schema.cds'), 'entity Test {}');

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

    const result = determineCdsFilesToCompile(sourceRoot, project);

    // For CAP projects, should use project-level compilation
    expect(result).toEqual(['__PROJECT_LEVEL_COMPILATION__']);
  });

  it('should use project-level compilation for CAP projects with multiple services', () => {
    // Create test CDS files
    mkdirSync(validateSafePath(sourceRoot, 'srv'), { recursive: true });
    mkdirSync(validateSafePath(sourceRoot, 'db'), { recursive: true });
    writeFileSync(validateSafePath(sourceRoot, 'srv/service1.cds'), 'using from "../db/schema";');
    writeFileSync(validateSafePath(sourceRoot, 'srv/service2.cds'), 'using from "../db/schema";');
    writeFileSync(validateSafePath(sourceRoot, 'db/schema.cds'), 'entity Test {}');

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

    const result = determineCdsFilesToCompile(sourceRoot, project);

    // For CAP projects, should use project-level compilation
    expect(result).toEqual(['__PROJECT_LEVEL_COMPILATION__']);
  });

  it('should return empty array when project has no CDS files', () => {
    const project = {
      projectDir: '.',
      cdsFiles: [],
      imports: new Map(),
    };

    const result = determineCdsFilesToCompile(sourceRoot, project);

    expect(result).toEqual([]);
  });

  it('should fall back to all files when no imports map is provided', () => {
    const project = {
      projectDir: '.',
      cdsFiles: ['service1.cds', 'service2.cds'],
    };

    const result = determineCdsFilesToCompile(sourceRoot, project);

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

    const result = determineCdsFilesToCompile(sourceRoot, project);

    // In a circular dependency scenario, the function should still identify that
    // both files are imported and fall back to compiling all files
    expect(result).toEqual(['file1.cds', 'file2.cds']);
  });
});
