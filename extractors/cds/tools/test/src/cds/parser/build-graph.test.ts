import { mkdirSync, writeFileSync } from 'fs';
import { resolve, relative } from 'path';

import * as tmp from 'tmp';

import { buildCdsProjectDependencyGraph } from '../../../../src/cds/parser/graph';

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

describe('buildCdsProjectDependencyGraph - Comprehensive Test Suite', () => {
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

  describe('Multiple Nested Projects with Various Import Types', () => {
    it('should handle complex multi-project structure with cross-project dependencies', () => {
      // Create a complex structure with multiple nested projects
      createComplexMultiProjectStructure(tempDir);

      const dependencyGraph = buildCdsProjectDependencyGraph(tempDir);
      const projectMap = dependencyGraph.projects;

      expect(projectMap.size).toBe(3);

      // Verify main project
      const mainProject = projectMap.get('main-service');
      expect(mainProject).toBeDefined();
      expect(mainProject!.cdsFiles).toHaveLength(2);
      expect(mainProject!.cdsFiles).toContain('main-service/srv/main.cds');
      expect(mainProject!.cdsFiles).toContain('main-service/db/main-schema.cds');
      expect(mainProject!.dependencies).toHaveLength(1);
      expect(mainProject!.dependencies![0].projectDir).toBe('shared-lib');

      // Verify shared library project
      const sharedProject = projectMap.get('shared-lib');
      expect(sharedProject).toBeDefined();
      expect(sharedProject!.cdsFiles).toHaveLength(2);
      expect(sharedProject!.cdsFiles).toContain('shared-lib/common.cds');
      expect(sharedProject!.cdsFiles).toContain('shared-lib/types.cds');
      expect(sharedProject!.dependencies).toHaveLength(0);

      // Verify backend service project
      const backendProject = projectMap.get('backend/service');
      expect(backendProject).toBeDefined();
      expect(backendProject!.cdsFiles).toHaveLength(1);
      expect(backendProject!.cdsFiles).toContain('backend/service/service.cds');
      expect(backendProject!.dependencies).toHaveLength(1);
      expect(backendProject!.dependencies![0].projectDir).toBe('shared-lib');

      // Verify compilation strategy - main service should use project-level compilation
      expect(mainProject!.compilationTargets).toEqual(['db', 'srv']);

      // Verify imports are properly resolved
      const mainServiceImports = mainProject!.imports!.get('main-service/srv/main.cds');
      expect(mainServiceImports).toBeDefined();
      expect(mainServiceImports).toHaveLength(2);

      // Check relative import
      const relativeImport = mainServiceImports!.find(imp => imp.path === '../db/main-schema');
      expect(relativeImport).toBeDefined();
      expect(relativeImport!.isRelative).toBe(true);
      expect(relativeImport!.resolvedPath).toBe('main-service/db/main-schema.cds');

      // Check cross-project import
      const crossProjectImport = mainServiceImports!.find(
        imp => imp.path === '../../shared-lib/common',
      );
      expect(crossProjectImport).toBeDefined();
      expect(crossProjectImport!.isRelative).toBe(true);
      expect(crossProjectImport!.resolvedPath).toBe('shared-lib/common.cds');
    });

    it('should handle deeply nested projects with circular import chains', () => {
      createCircularImportStructure(tempDir);

      const dependencyGraph = buildCdsProjectDependencyGraph(tempDir);
      const projectMap = dependencyGraph.projects;

      expect(projectMap.size).toBe(3);

      // Verify all projects are detected
      expect(projectMap.has('project-a')).toBe(true);
      expect(projectMap.has('project-b/nested')).toBe(true);
      expect(projectMap.has('project-c/deeply/nested')).toBe(true);

      // Check that dependencies are tracked correctly despite circular references
      const projectA = projectMap.get('project-a');
      const projectB = projectMap.get('project-b/nested');
      const projectC = projectMap.get('project-c/deeply/nested');

      expect(projectA!.dependencies).toHaveLength(1);
      expect(projectA!.dependencies![0].projectDir).toBe('project-b/nested');

      expect(projectB!.dependencies).toHaveLength(1);
      expect(projectB!.dependencies![0].projectDir).toBe('project-c/deeply/nested');

      expect(projectC!.dependencies).toHaveLength(1);
      expect(projectC!.dependencies![0].projectDir).toBe('project-a');
    });

    it('should handle module imports with package.json dependencies', () => {
      createModuleImportStructure(tempDir);

      const dependencyGraph = buildCdsProjectDependencyGraph(tempDir);
      const projectMap = dependencyGraph.projects;

      expect(projectMap.size).toBe(1);
      const project = projectMap.get('cap-app');
      expect(project).toBeDefined();

      // Verify package.json is loaded
      expect(project!.packageJson).toBeDefined();
      expect(project!.packageJson!.dependencies).toHaveProperty('@sap/cds');
      expect(project!.packageJson!.devDependencies).toHaveProperty('@sap/hdi-deploy');

      // Verify module imports are tracked
      const serviceImports = project!.imports!.get('cap-app/srv/service.cds');
      expect(serviceImports).toBeDefined();
      expect(serviceImports).toHaveLength(2);

      // Check @sap/cds import
      const cdsImport = serviceImports!.find(imp => imp.path === '@sap/cds/common');
      expect(cdsImport).toBeDefined();
      expect(cdsImport!.isModule).toBe(true);
      expect(cdsImport!.isRelative).toBe(false);

      // Check relative import
      const relativeImport = serviceImports!.find(imp => imp.path === '../db/schema');
      expect(relativeImport).toBeDefined();
      expect(relativeImport!.isRelative).toBe(true);
    });

    it('should handle malformed imports gracefully', () => {
      createMalformedImportStructure(tempDir);

      const dependencyGraph = buildCdsProjectDependencyGraph(tempDir);
      const projectMap = dependencyGraph.projects;

      expect(projectMap.size).toBe(1);
      const project = projectMap.get('test-project');
      expect(project).toBeDefined();

      // Even with malformed imports, the project should still be processed
      expect(project!.cdsFiles).toHaveLength(2);
      expect(project!.imports!.get('test-project/service.cds')).toBeDefined();

      // The malformed import should not crash the parser
      const imports = project!.imports!.get('test-project/service.cds')!;
      expect(imports).toHaveLength(2); // Both imports should be processed, even if one causes resolution errors
      expect(imports[0].path).toBe('./schema');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty source directory', () => {
      const dependencyGraph = buildCdsProjectDependencyGraph(tempDir);
      const projectMap = dependencyGraph.projects;
      expect(projectMap.size).toBe(0);
    });

    it('should handle source directory with non-CDS projects', () => {
      // Create some directories that look like projects but aren't CDS projects
      mkdirSync(validateSafePath(tempDir, 'regular-js-project'), { recursive: true });
      writeFileSync(
        validateSafePath(tempDir, 'regular-js-project', 'package.json'),
        JSON.stringify({ name: 'regular-js', dependencies: { express: '^4.0.0' } }),
      );
      writeFileSync(
        validateSafePath(tempDir, 'regular-js-project', 'index.js'),
        'console.log("hello");',
      );

      mkdirSync(validateSafePath(tempDir, 'empty-dir'), { recursive: true });

      const dependencyGraph = buildCdsProjectDependencyGraph(tempDir);
      const projectMap = dependencyGraph.projects;
      expect(projectMap.size).toBe(0);
    });

    it('should handle debug-parser mode correctly', () => {
      createSimpleProject(tempDir);

      const dependencyGraph = buildCdsProjectDependencyGraph(tempDir);
      const projectMap = dependencyGraph.projects;

      // In debug mode, should return normal project map without debug signals
      // (debug handling is now responsibility of cds-extractor.ts)
      expect(projectMap.size).toBe(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((projectMap as any).__debugParserSuccess).toBeUndefined();
      expect(projectMap.has('simple-project')).toBe(true);
    });

    it('should handle debug-parser mode with empty project map', () => {
      const dependencyGraph = buildCdsProjectDependencyGraph(tempDir);
      const projectMap = dependencyGraph.projects;

      // In debug mode with no projects, should just return empty map (no special signal in the actual implementation)
      expect(projectMap.size).toBe(0);
    });

    it('should handle errors in determining files to compile gracefully', () => {
      // Create a project where determineCdsFilesToCompile might fail
      createProjectWithCompilationIssues(tempDir);

      const dependencyGraph = buildCdsProjectDependencyGraph(tempDir);
      const projectMap = dependencyGraph.projects;

      expect(projectMap.size).toBe(1);
      const project = projectMap.get('problematic-project');
      expect(project).toBeDefined();

      // Should fall back to compiling all files on error
      expect(project!.compilationTargets).toEqual(['service.cds']);
    });

    it('should handle import resolution errors gracefully', () => {
      createProjectWithResolutionErrors(tempDir);

      const dependencyGraph = buildCdsProjectDependencyGraph(tempDir);
      const projectMap = dependencyGraph.projects;

      expect(projectMap.size).toBe(1);
      const project = projectMap.get('resolution-error-project');
      expect(project).toBeDefined();

      // Should still process the project despite resolution errors
      expect(project!.cdsFiles).toHaveLength(1);
      expect(project!.imports!.get('resolution-error-project/service.cds')).toBeDefined();
    });
  });

  describe('Project-aware Compilation Features', () => {
    it('should detect CAP project structure and use project-level compilation', () => {
      createTypicalCAPProject(tempDir);

      const dependencyGraph = buildCdsProjectDependencyGraph(tempDir);
      const projectMap = dependencyGraph.projects;

      expect(projectMap.size).toBe(1);
      const project = projectMap.get('typical-cap-app');
      expect(project).toBeDefined();

      // Should use project-level compilation for CAP projects
      expect(project!.compilationTargets).toEqual(['db', 'srv', 'app']);

      // Verify all CDS files are found
      expect(project!.cdsFiles).toHaveLength(4);
      expect(project!.cdsFiles).toContain('typical-cap-app/db/schema.cds');
      expect(project!.cdsFiles).toContain('typical-cap-app/srv/service.cds');
      expect(project!.cdsFiles).toContain('typical-cap-app/srv/handlers.cds');
      expect(project!.cdsFiles).toContain('typical-cap-app/app/fiori.cds');
    });

    it('should handle non-CAP projects with individual file compilation', () => {
      createNonCAPProject(tempDir);

      const dependencyGraph = buildCdsProjectDependencyGraph(tempDir);
      const projectMap = dependencyGraph.projects;

      expect(projectMap.size).toBe(1);
      const project = projectMap.get('simple-cds-project');
      expect(project).toBeDefined();

      // Per ProjectCompilationOnly spec: Non-CAP projects should compile all files
      expect(project!.compilationTargets).toEqual(['main.cds', 'imported.cds']);
    });
  });

  // Helper functions to create test structures
  function createComplexMultiProjectStructure(baseDir: string) {
    // Main service project (CAP structure)
    const mainServiceDir = validateSafePath(baseDir, 'main-service');
    mkdirSync(mainServiceDir, { recursive: true });
    mkdirSync(validateSafePath(mainServiceDir, 'srv'), { recursive: true });
    mkdirSync(validateSafePath(mainServiceDir, 'db'), { recursive: true });

    writeFileSync(
      validateSafePath(mainServiceDir, 'package.json'),
      JSON.stringify({
        name: 'main-service',
        dependencies: { '@sap/cds': '^7.0.0' },
      }),
    );

    writeFileSync(
      validateSafePath(mainServiceDir, 'srv', 'main.cds'),
      `using { Item } from '../db/main-schema';
using { common } from '../../shared-lib/common';

service MainService {
  entity Items as projection on Item;
}`,
    );

    writeFileSync(
      validateSafePath(mainServiceDir, 'db', 'main-schema.cds'),
      `namespace schema;
using { BaseEntity } from '../../shared-lib/types';

entity Item : BaseEntity {
  name: String;
}`,
    );

    // Shared library project
    const sharedLibDir = validateSafePath(baseDir, 'shared-lib');
    mkdirSync(sharedLibDir, { recursive: true });

    writeFileSync(
      validateSafePath(sharedLibDir, 'package.json'),
      JSON.stringify({
        name: 'shared-lib',
        dependencies: { '@sap/cds': '^7.0.0' },
      }),
    );

    writeFileSync(
      validateSafePath(sharedLibDir, 'common.cds'),
      `using { BaseEntity } from './types';

context common {
  type Status : String enum { active; inactive; }
}`,
    );

    writeFileSync(
      validateSafePath(sharedLibDir, 'types.cds'),
      `context types {
  aspect BaseEntity {
    ID: UUID;
    createdAt: Timestamp;
  }
}`,
    );

    // Backend service project (nested)
    const backendServiceDir = validateSafePath(baseDir, 'backend', 'service');
    mkdirSync(backendServiceDir, { recursive: true });

    writeFileSync(
      validateSafePath(backendServiceDir, 'package.json'),
      JSON.stringify({
        name: 'backend-service',
        dependencies: { '@sap/cds': '^7.0.0' },
      }),
    );

    writeFileSync(
      validateSafePath(backendServiceDir, 'service.cds'),
      `using { common } from '../../shared-lib/common';

service BackendService {
  action processData() returns String;
}`,
    );
  }

  function createCircularImportStructure(baseDir: string) {
    // Project A
    const projectADir = validateSafePath(baseDir, 'project-a');
    mkdirSync(projectADir, { recursive: true });
    writeFileSync(
      validateSafePath(projectADir, 'package.json'),
      JSON.stringify({
        name: 'project-a',
        dependencies: { '@sap/cds': '^7.0.0' },
      }),
    );
    writeFileSync(
      validateSafePath(projectADir, 'a.cds'),
      `using { ServiceB } from '../project-b/nested/b';
service ServiceA {}`,
    );

    // Project B (nested)
    const projectBDir = validateSafePath(baseDir, 'project-b', 'nested');
    mkdirSync(projectBDir, { recursive: true });
    writeFileSync(
      validateSafePath(projectBDir, 'package.json'),
      JSON.stringify({
        name: 'project-b',
        dependencies: { '@sap/cds': '^7.0.0' },
      }),
    );
    writeFileSync(
      validateSafePath(projectBDir, 'b.cds'),
      `using { ServiceC } from '../../project-c/deeply/nested/c';
service ServiceB {}`,
    );

    // Project C (deeply nested)
    const projectCDir = validateSafePath(baseDir, 'project-c', 'deeply', 'nested');
    mkdirSync(projectCDir, { recursive: true });
    writeFileSync(
      validateSafePath(projectCDir, 'package.json'),
      JSON.stringify({
        name: 'project-c',
        dependencies: { '@sap/cds': '^7.0.0' },
      }),
    );
    writeFileSync(
      validateSafePath(projectCDir, 'c.cds'),
      `using { ServiceA } from '../../../project-a/a';
service ServiceC {}`,
    );
  }

  function createModuleImportStructure(baseDir: string) {
    const projectDir = validateSafePath(baseDir, 'cap-app');
    mkdirSync(projectDir, { recursive: true });
    mkdirSync(validateSafePath(projectDir, 'srv'), { recursive: true });
    mkdirSync(validateSafePath(projectDir, 'db'), { recursive: true });

    writeFileSync(
      validateSafePath(projectDir, 'package.json'),
      JSON.stringify({
        name: 'cap-app',
        dependencies: {
          '@sap/cds': '^7.0.0',
          '@sap/cds-odata-v2-adapter': '^1.0.0',
        },
        devDependencies: {
          '@sap/hdi-deploy': '^4.0.0',
        },
      }),
    );

    writeFileSync(
      validateSafePath(projectDir, 'srv', 'service.cds'),
      `using { Currency, managed } from '@sap/cds/common';
using { Book } from '../db/schema';

service CatalogService {
  entity Books as projection on Book;
}`,
    );

    writeFileSync(
      validateSafePath(projectDir, 'db', 'schema.cds'),
      `using { Currency, managed } from '@sap/cds/common';

entity Book : managed {
  key ID: Integer;
  title: String;
  price: Decimal(9,2);
  currency: Currency;
}`,
    );
  }

  function createMalformedImportStructure(baseDir: string) {
    const projectDir = validateSafePath(baseDir, 'test-project');
    mkdirSync(projectDir, { recursive: true });

    writeFileSync(
      validateSafePath(projectDir, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        dependencies: { '@sap/cds': '^7.0.0' },
      }),
    );

    // Service with both valid and malformed imports
    writeFileSync(
      validateSafePath(projectDir, 'service.cds'),
      `using { Item } from './schema';
using { NonExistent } from './nonexistent-file-that-will-cause-error';

service TestService {
  entity Items as projection on Item;
}`,
    );

    writeFileSync(
      validateSafePath(projectDir, 'schema.cds'),
      `entity Item {
  ID: Integer;
  name: String;
}`,
    );
  }

  function createSimpleProject(baseDir: string) {
    const projectDir = validateSafePath(baseDir, 'simple-project');
    mkdirSync(projectDir, { recursive: true });

    writeFileSync(
      validateSafePath(projectDir, 'package.json'),
      JSON.stringify({
        name: 'simple-project',
        dependencies: { '@sap/cds': '^7.0.0' },
      }),
    );

    writeFileSync(
      validateSafePath(projectDir, 'service.cds'),
      `service SimpleService {
  entity Items {
    ID: Integer;
    name: String;
  }
}`,
    );
  }

  function createProjectWithCompilationIssues(baseDir: string) {
    const projectDir = validateSafePath(baseDir, 'problematic-project');
    mkdirSync(projectDir, { recursive: true });

    writeFileSync(
      validateSafePath(projectDir, 'package.json'),
      JSON.stringify({
        name: 'problematic-project',
        dependencies: { '@sap/cds': '^7.0.0' },
      }),
    );

    // Create files that might cause issues in compilation determination
    writeFileSync(validateSafePath(projectDir, 'service.cds'), `service ProblematicService {}`);
  }

  function createProjectWithResolutionErrors(baseDir: string) {
    const projectDir = validateSafePath(baseDir, 'resolution-error-project');
    mkdirSync(projectDir, { recursive: true });

    writeFileSync(
      validateSafePath(projectDir, 'package.json'),
      JSON.stringify({
        name: 'resolution-error-project',
        dependencies: { '@sap/cds': '^7.0.0' },
      }),
    );

    // Service that imports from paths that will cause resolution errors
    writeFileSync(
      validateSafePath(projectDir, 'service.cds'),
      `using { NonExistent } from '../../../../../../../absolute/path/that/does/not/exist';
service ErrorService {}`,
    );
  }

  function createTypicalCAPProject(baseDir: string) {
    const projectDir = validateSafePath(baseDir, 'typical-cap-app');
    mkdirSync(projectDir, { recursive: true });
    mkdirSync(validateSafePath(projectDir, 'db'), { recursive: true });
    mkdirSync(validateSafePath(projectDir, 'srv'), { recursive: true });
    mkdirSync(validateSafePath(projectDir, 'app'), { recursive: true });

    writeFileSync(
      validateSafePath(projectDir, 'package.json'),
      JSON.stringify({
        name: 'typical-cap-app',
        dependencies: { '@sap/cds': '^7.0.0' },
      }),
    );

    writeFileSync(
      validateSafePath(projectDir, 'db', 'schema.cds'),
      `namespace schema;
entity Book {
  key ID: Integer;
  title: String;
  author: String;
}`,
    );

    writeFileSync(
      validateSafePath(projectDir, 'srv', 'service.cds'),
      `using { Book } from '../db/schema';
service CatalogService {
  entity Books as projection on Book;
}`,
    );

    writeFileSync(
      validateSafePath(projectDir, 'srv', 'handlers.cds'),
      `using { CatalogService } from './service';
// Service handlers and extensions`,
    );

    writeFileSync(
      validateSafePath(projectDir, 'app', 'fiori.cds'),
      `using CatalogService from '../srv/service';
// Fiori annotations`,
    );
  }

  function createNonCAPProject(baseDir: string) {
    const projectDir = validateSafePath(baseDir, 'simple-cds-project');
    mkdirSync(projectDir, { recursive: true });

    // Create a package.json WITHOUT @sap/cds dependency to make it clearly non-CAP
    writeFileSync(
      validateSafePath(projectDir, 'package.json'),
      JSON.stringify({
        name: 'simple-cds-project',
        dependencies: {
          lodash: '^4.0.0', // Use a different dependency
        },
      }),
    );

    writeFileSync(
      validateSafePath(projectDir, 'main.cds'),
      `using { Item } from './imported';
service MainService {
  entity Items as projection on Item;
}`,
    );

    writeFileSync(
      validateSafePath(projectDir, 'imported.cds'),
      `namespace model;
entity Item {
  ID: Integer;
  name: String;
}`,
    );
  }
});
