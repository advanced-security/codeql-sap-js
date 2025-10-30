import { join } from 'path';

import mockFs from 'mock-fs';

import { buildCdsProjectDependencyGraph } from '../../../../src/cds/parser';
import {
  determineCdsFilesForProjectDir,
  determineCdsProjectsUnderSourceDir,
  extractCdsImports,
  isLikelyCdsProject,
} from '../../../../src/cds/parser/functions';

// Re-create sample project structures with a focus on common patterns found in the codeql-sap-js repository
// Source directory for tests
const SOURCE_ROOT = '/source';

/**
 * Creates a mock file system with CDS projects based on actual patterns found in the repository
 */
function createMockFileSystemFromActualRepoPatterns() {
  // Create a complex mock file system based on real repository patterns
  return mockFs({
    [SOURCE_ROOT]: {
      test: {
        queries: {
          loginjection: {
            'log-injection-without-protocol-none': {
              'package.json': JSON.stringify({
                name: 'log-injection-without-protocol-none',
                dependencies: {
                  '@sap/cds': '^6.0.0',
                  '@sap/cds-dk': '^6.0.0',
                },
              }),
              'schema.cds': `
                namespace test.loginjection;
                
                entity Log {
                  key ID : Integer;
                  message : String;
                  timestamp : DateTime;
                }
              `,
              srv: {
                'service.cds': `
                  using test.loginjection from '../schema';
                  
                  service LogService {
                    entity Logs as projection on loginjection.Log;
                  }
                `,
              },
            },
            'log-injection-with-service1-protocol-none': {
              'package.json': JSON.stringify({
                name: 'log-injection-with-service1-protocol-none',
                dependencies: {
                  '@sap/cds': '^6.0.0',
                  '@sap/cds-dk': '^6.0.0',
                },
              }),
              'schema.cds': `
                namespace test.loginjection.service1;
                
                entity Log {
                  key ID : Integer;
                  message : String;
                  timestamp : DateTime;
                }
              `,
              srv: {
                'service.cds': `
                  using test.loginjection.service1 from '../schema';
                  
                  @protocol: 'none'
                  service LogService {
                    entity Logs as projection on service1.Log;
                  }
                `,
              },
            },
            'log-injection-with-complete-protocol-none': {
              'package.json': JSON.stringify({
                name: 'log-injection-with-complete-protocol-none',
                dependencies: {
                  '@sap/cds': '^6.0.0',
                  '@sap/cds-dk': '^6.0.0',
                },
              }),
              'schema.cds': `
                namespace test.loginjection.complete;
                
                using { managed } from '@sap/cds/common';
                
                entity Log : managed {
                  key ID : Integer;
                  message : String;
                }
              `,
              srv: {
                'service.cds': `
                  using test.loginjection.complete from '../schema';
                  using from './other-service';
                  
                  @protocol: 'none'
                  service LogService {
                    entity Logs as projection on complete.Log;
                  }
                `,
                'other-service.cds': `
                  namespace test.loginjection.other;
                  
                  entity AuditLog {
                    key ID : Integer;
                    action : String;
                  }
                `,
              },
            },
          },
          'bad-authn-authz': {
            'nonprod-authn-strategy': {
              'mocked-authentication': {
                'package.json': JSON.stringify({
                  name: 'mocked-authentication',
                  dependencies: {
                    '@sap/cds': '^6.0.0',
                    '@sap/cds-dk': '^6.0.0',
                  },
                }),
                'schema.cds': `
                  namespace test.authn;
                  
                  entity User {
                    key ID : String;
                    name : String;
                    role : String;
                  }
                `,
                srv: {
                  'service.cds': `
                    using test.authn from '../schema';
                    
                    @requires: 'authenticated-user'
                    service AuthService {
                      entity Users as projection on authn.User;
                    }
                  `,
                },
              },
            },
          },
          sqli: {
            'sqli-cds-entity': {
              'package.json': JSON.stringify({
                name: 'sqli-cds-entity',
                dependencies: {
                  '@sap/cds': '^6.0.0',
                  '@sap/cds-dk': '^6.0.0',
                },
              }),
              'schema.cds': `
                namespace test.sqli;
                
                entity Product {
                  key ID : Integer;
                  name : String;
                  price : Decimal;
                }
              `,
              srv: {
                'service.cds': `
                  using test.sqli from '../schema';
                  
                  service ProductService {
                    entity Products as projection on sqli.Product;
                  }
                `,
              },
            },
          },
        },
      },
    },
  });
}

describe('CDS Parser Self-Test Suite', () => {
  afterEach(() => {
    mockFs.restore();
  });

  describe('buildCdsProjectDependencyGraph - Repository Patterns', () => {
    beforeEach(() => {
      createMockFileSystemFromActualRepoPatterns();
    });

    test('should detect all CDS projects in the test repository structure', () => {
      const dependencyGraph = buildCdsProjectDependencyGraph(SOURCE_ROOT);
      const projectMap = dependencyGraph.projects;

      // Check the number of detected projects
      expect(projectMap.size).toBe(5);

      // Check that expected projects are detected
      const projectDirs = Array.from(projectMap.keys());
      expect(projectDirs).toContain(
        'test/queries/loginjection/log-injection-without-protocol-none',
      );
      expect(projectDirs).toContain(
        'test/queries/loginjection/log-injection-with-service1-protocol-none',
      );
      expect(projectDirs).toContain(
        'test/queries/loginjection/log-injection-with-complete-protocol-none',
      );
      expect(projectDirs).toContain(
        'test/queries/bad-authn-authz/nonprod-authn-strategy/mocked-authentication',
      );
      expect(projectDirs).toContain('test/queries/sqli/sqli-cds-entity');
    });

    test('should correctly identify CDS files for each project', () => {
      const dependencyGraph = buildCdsProjectDependencyGraph(SOURCE_ROOT);
      const projectMap = dependencyGraph.projects;

      // Check CDS files for the log-injection-without-protocol-none project
      const project1 = projectMap.get(
        'test/queries/loginjection/log-injection-without-protocol-none',
      );
      expect(project1).toBeDefined();
      expect(project1?.cdsFiles.length).toBe(2);
      expect(project1?.cdsFiles).toContain(
        'test/queries/loginjection/log-injection-without-protocol-none/schema.cds',
      );
      expect(project1?.cdsFiles).toContain(
        'test/queries/loginjection/log-injection-without-protocol-none/srv/service.cds',
      );

      // Check CDS files for the log-injection-with-complete-protocol-none project
      const project2 = projectMap.get(
        'test/queries/loginjection/log-injection-with-complete-protocol-none',
      );
      expect(project2).toBeDefined();
      expect(project2?.cdsFiles.length).toBe(3);
      expect(project2?.cdsFiles).toContain(
        'test/queries/loginjection/log-injection-with-complete-protocol-none/schema.cds',
      );
      expect(project2?.cdsFiles).toContain(
        'test/queries/loginjection/log-injection-with-complete-protocol-none/srv/service.cds',
      );
      expect(project2?.cdsFiles).toContain(
        'test/queries/loginjection/log-injection-with-complete-protocol-none/srv/other-service.cds',
      );
    });

    test('should correctly identify package.json for each project', () => {
      const dependencyGraph = buildCdsProjectDependencyGraph(SOURCE_ROOT);
      const projectMap = dependencyGraph.projects;

      // Check package.json for projects
      const projectDirs = Array.from(projectMap.keys());
      for (const dir of projectDirs) {
        const project = projectMap.get(dir);
        expect(project?.packageJson).toBeDefined();
        expect(project?.packageJson?.dependencies?.['@sap/cds']).toBe('^6.0.0');
        expect(project?.packageJson?.dependencies?.['@sap/cds-dk']).toBe('^6.0.0');
      }
    });

    test('should identify project dependencies through import statements', () => {
      // Create a more complex file system with cross-project dependencies
      mockFs.restore();

      // Create a file system with inter-project dependencies
      mockFs({
        [SOURCE_ROOT]: {
          'common-lib': {
            'package.json': JSON.stringify({
              name: 'common-lib',
              dependencies: {
                '@sap/cds': '^6.0.0',
              },
            }),
            'common.cds': `
              namespace common;
              
              entity BaseEntity {
                key ID : UUID;
                createdAt : DateTime;
                createdBy : String;
              }
            `,
          },
          'app-service': {
            'package.json': JSON.stringify({
              name: 'app-service',
              dependencies: {
                '@sap/cds': '^6.0.0',
                '@sap/cds-dk': '^6.0.0',
              },
            }),
            'schema.cds': `
              namespace app;
              
              using { common } from '../common-lib/common';
              
              entity Product : common.BaseEntity {
                name : String;
                price : Decimal;
              }
            `,
            srv: {
              'service.cds': `
                using app from '../schema';
                
                service ProductService {
                  entity Products as projection on app.Product;
                }
              `,
            },
          },
        },
      });

      const dependencyGraph = buildCdsProjectDependencyGraph(SOURCE_ROOT);
      const projectMap = dependencyGraph.projects;

      // Verify that app-service depends on common-lib
      const appService = projectMap.get('app-service');
      expect(appService).toBeDefined();
      expect(appService?.dependencies?.length).toBe(1);

      const commonLib = projectMap.get('common-lib');
      expect(commonLib).toBeDefined();

      expect(appService?.dependencies?.[0]?.projectDir).toBe(commonLib?.projectDir);
    });
  });

  describe('determineCdsProjectsUnderSourceDir - Repository Patterns', () => {
    beforeEach(() => {
      createMockFileSystemFromActualRepoPatterns();
    });

    test('should detect all CDS projects in the repository structure', () => {
      const projectDirs = determineCdsProjectsUnderSourceDir(SOURCE_ROOT);

      // Check that expected projects are detected
      expect(projectDirs).toContain(
        'test/queries/loginjection/log-injection-without-protocol-none',
      );
      expect(projectDirs).toContain(
        'test/queries/loginjection/log-injection-with-service1-protocol-none',
      );
      expect(projectDirs).toContain(
        'test/queries/loginjection/log-injection-with-complete-protocol-none',
      );
      expect(projectDirs).toContain(
        'test/queries/bad-authn-authz/nonprod-authn-strategy/mocked-authentication',
      );
      expect(projectDirs).toContain('test/queries/sqli/sqli-cds-entity');

      // Should be 5 projects in total (all from our mock setup)
      expect(projectDirs.length).toBe(5);
    });

    test('should throw error if source root directory does not exist', () => {
      expect(() => determineCdsProjectsUnderSourceDir('/non-existent')).toThrow(
        "Source root directory '/non-existent' does not exist.",
      );
    });
  });

  describe('determineCdsFilesForProjectDir - Repository Patterns', () => {
    beforeEach(() => {
      createMockFileSystemFromActualRepoPatterns();
    });

    test('should find all CDS files for a project directory', () => {
      const projectDir = join(
        SOURCE_ROOT,
        'test/queries/loginjection/log-injection-with-complete-protocol-none',
      );
      const cdsFiles = determineCdsFilesForProjectDir(SOURCE_ROOT, projectDir);

      // Should find 3 CDS files
      expect(cdsFiles.length).toBe(3);
      expect(cdsFiles).toContain(
        'test/queries/loginjection/log-injection-with-complete-protocol-none/schema.cds',
      );
      expect(cdsFiles).toContain(
        'test/queries/loginjection/log-injection-with-complete-protocol-none/srv/service.cds',
      );
      expect(cdsFiles).toContain(
        'test/queries/loginjection/log-injection-with-complete-protocol-none/srv/other-service.cds',
      );
    });

    test('should throw error if projectDir is not a subdirectory of sourceRootDir', () => {
      expect(() => determineCdsFilesForProjectDir(SOURCE_ROOT, '/another-dir')).toThrow(
        'projectDir must be a subdirectory of sourceRootDir or equal to sourceRootDir.',
      );
    });

    test('should throw error if sourceRootDir or projectDir is not provided', () => {
      expect(() => determineCdsFilesForProjectDir('', '/test')).toThrow(
        "Unable to determine CDS files for project dir '/test'; both sourceRootDir and projectDir must be provided.",
      );
    });
  });

  describe('extractCdsImports - Repository Patterns', () => {
    beforeEach(() => {
      createMockFileSystemFromActualRepoPatterns();
    });

    test('should extract module imports correctly', () => {
      const filePath = join(
        SOURCE_ROOT,
        'test/queries/loginjection/log-injection-with-complete-protocol-none/schema.cds',
      );
      const imports = extractCdsImports(filePath);

      expect(imports.length).toBe(1);
      expect(imports[0].path).toBe('@sap/cds/common');
      expect(imports[0].isModule).toBe(true);
      expect(imports[0].isRelative).toBe(false);
    });

    test('should extract relative imports correctly', () => {
      // Re-create the mock file system with a specific content to ensure consistent importing
      mockFs.restore();

      mockFs({
        [SOURCE_ROOT]: {
          test: {
            queries: {
              loginjection: {
                'log-injection-with-complete-protocol-none': {
                  'schema.cds': `namespace test.loginjection.complete;`,
                  srv: {
                    'service.cds': `
                      using test.loginjection.complete from '../schema';
                      using other from './other-service';
                      
                      service LogService {}
                    `,
                    'other-service.cds': `namespace test.loginjection.other;`,
                  },
                },
              },
            },
          },
        },
      });

      const filePath = join(
        SOURCE_ROOT,
        'test/queries/loginjection/log-injection-with-complete-protocol-none/srv/service.cds',
      );
      const imports = extractCdsImports(filePath);

      expect(imports.length).toBe(2);
      expect(imports[0].path).toBe('../schema');
      expect(imports[0].isRelative).toBe(true);
      expect(imports[0].isModule).toBe(false);

      expect(imports[1].path).toBe('./other-service');
      expect(imports[1].isRelative).toBe(true);
      expect(imports[1].isModule).toBe(false);
    });

    test('should throw error for non-existent files', () => {
      expect(() => extractCdsImports('/non-existent.cds')).toThrow(
        'File does not exist: /non-existent.cds',
      );
    });
  });

  describe('isLikelyCdsProject - Repository Patterns', () => {
    beforeEach(() => {
      createMockFileSystemFromActualRepoPatterns();
    });

    test('should identify directories with package.json containing CDS dependencies as CDS projects', () => {
      const dir = join(
        SOURCE_ROOT,
        'test/queries/loginjection/log-injection-without-protocol-none',
      );
      expect(isLikelyCdsProject(dir)).toBe(true);
    });

    test('should identify directories with .cds files as CDS projects', () => {
      // Create a directory with only .cds files and no package.json
      mockFs.restore();

      mockFs({
        '/cds-only-project': {
          'schema.cds': `
            namespace test;
            
            entity Test {
              key ID : Integer;
            }
          `,
        },
      });

      expect(isLikelyCdsProject('/cds-only-project')).toBe(true);
    });

    test('should not identify directories without package.json or .cds files as CDS projects', () => {
      mockFs.restore();

      mockFs({
        '/not-a-cds-project': {
          'file.txt': 'This is not a CDS project',
        },
      });

      expect(isLikelyCdsProject('/not-a-cds-project')).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty source directory gracefully', () => {
      mockFs({
        '/empty': {},
      });

      const dependencyGraph = buildCdsProjectDependencyGraph('/empty');
      const projectMap = dependencyGraph.projects;
      expect(projectMap.size).toBe(0);
    });

    test('should handle source directory with no CDS projects gracefully', () => {
      mockFs({
        '/no-cds': {
          'package.json': JSON.stringify({
            name: 'not-a-cds-project',
            dependencies: {
              express: '^4.17.1',
            },
          }),
          'app.js': 'console.log("Hello world");',
        },
      });

      const dependencyGraph = buildCdsProjectDependencyGraph('/no-cds');
      const projectMap = dependencyGraph.projects;
      expect(projectMap.size).toBe(0);
    });

    test('should handle debug output mode correctly', () => {
      createMockFileSystemFromActualRepoPatterns();

      // Mock the debug output directory
      mockFs.restore();

      mockFs({
        [SOURCE_ROOT]: {
          test: {
            queries: {
              loginjection: {
                'log-injection-without-protocol-none': {
                  'package.json': JSON.stringify({
                    name: 'log-injection-without-protocol-none',
                    dependencies: {
                      '@sap/cds': '^6.0.0',
                    },
                  }),
                  'schema.cds': 'namespace test;',
                },
              },
            },
          },
        },
        '/script-dir': {
          out: {
            debug: {},
          },
        },
      });

      const dependencyGraph = buildCdsProjectDependencyGraph(SOURCE_ROOT);
      const projectMap = dependencyGraph.projects;
      expect(projectMap.size).toBe(1);

      // The debug file would be created, but we can't easily test that with mockFs
    });
  });

  describe('Complex project structures with nested dependencies', () => {
    test('should handle complex project structures with multiple levels of dependencies', () => {
      mockFs.restore();

      mockFs({
        [SOURCE_ROOT]: {
          'base-lib': {
            'package.json': JSON.stringify({
              name: 'base-lib',
              dependencies: {
                '@sap/cds': '^6.0.0',
              },
            }),
            'base.cds': `
              namespace base;
              
              entity BaseEntity {
                key ID : UUID;
              }
            `,
          },
          'common-lib': {
            'package.json': JSON.stringify({
              name: 'common-lib',
              dependencies: {
                '@sap/cds': '^6.0.0',
              },
            }),
            'common.cds': `
              namespace common;
              
              using { base } from '../base-lib/base';
              
              entity CommonEntity : base.BaseEntity {
                name : String;
              }
            `,
          },
          'app-service': {
            'package.json': JSON.stringify({
              name: 'app-service',
              dependencies: {
                '@sap/cds': '^6.0.0',
                '@sap/cds-dk': '^6.0.0',
              },
            }),
            'schema.cds': `
              namespace app;
              
              using { common } from '../common-lib/common';
              
              entity AppEntity : common.CommonEntity {
                description : String;
              }
            `,
            srv: {
              'service.cds': `
                using app from '../schema';
                
                service AppService {
                  entity Apps as projection on app.AppEntity;
                }
              `,
            },
          },
        },
      });

      const dependencyGraph = buildCdsProjectDependencyGraph(SOURCE_ROOT);
      const projectMap = dependencyGraph.projects;

      // Check the number of detected projects
      expect(projectMap.size).toBe(3);

      // Get projects
      const baseLib = projectMap.get('base-lib');
      const commonLib = projectMap.get('common-lib');
      const appService = projectMap.get('app-service');

      expect(baseLib).toBeDefined();
      expect(commonLib).toBeDefined();
      expect(appService).toBeDefined();

      // Check dependencies
      expect(commonLib?.dependencies?.length).toBe(1);
      expect(commonLib?.dependencies?.[0]?.projectDir).toBe(baseLib?.projectDir);

      expect(appService?.dependencies?.length).toBe(1);
      expect(appService?.dependencies?.[0]?.projectDir).toBe(commonLib?.projectDir);
    });
  });

  describe('Circular Dependencies Between CDS Projects', () => {
    test('should handle circular dependencies gracefully', () => {
      mockFs.restore();

      // Create a file system with circular dependencies
      mockFs({
        [SOURCE_ROOT]: {
          'project-a': {
            'package.json': JSON.stringify({
              name: 'project-a',
              dependencies: {
                '@sap/cds': '^6.0.0',
              },
            }),
            'a.cds': `
              namespace a;
              
              using { b } from '../project-b/b';
              
              entity EntityA {
                key ID : UUID;
                refToB : Association to b.EntityB;
              }
            `,
          },
          'project-b': {
            'package.json': JSON.stringify({
              name: 'project-b',
              dependencies: {
                '@sap/cds': '^6.0.0',
              },
            }),
            'b.cds': `
              namespace b;
              
              using { a } from '../project-a/a';
              
              entity EntityB {
                key ID : UUID;
                refToA : Association to a.EntityA;
              }
            `,
          },
        },
      });

      // The parser should handle circular dependencies without infinite loops
      const dependencyGraph = buildCdsProjectDependencyGraph(SOURCE_ROOT);
      const projectMap = dependencyGraph.projects;

      // We should detect both projects
      expect(projectMap.size).toBe(2);

      const projectA = projectMap.get('project-a');
      const projectB = projectMap.get('project-b');

      // Both projects should be defined
      expect(projectA).toBeDefined();
      expect(projectB).toBeDefined();

      // Both projects should have dependencies on each other
      expect(projectA?.dependencies?.length).toBe(1);
      expect(projectA?.dependencies?.[0]?.projectDir).toBe(projectB?.projectDir);

      expect(projectB?.dependencies?.length).toBe(1);
      expect(projectB?.dependencies?.[0]?.projectDir).toBe(projectA?.projectDir);
    });
  });

  describe('Deeply Nested Project Structures', () => {
    test('should handle deeply nested project structures with multiple imports', () => {
      mockFs.restore();

      // Create a complex file system with multiple levels of nested imports
      mockFs({
        [SOURCE_ROOT]: {
          'root-app': {
            'package.json': JSON.stringify({
              name: 'root-app',
              dependencies: {
                '@sap/cds': '^6.0.0',
              },
            }),
            'schema.cds': `
              namespace root;
              
              // Import multiple modules to test complex dependency graphs
              using { ui5 } from '../ui5-models/model';
              using { common } from '../common-lib/common';
              
              entity RootEntity {
                key ID : String;
                uiComponent : ui5.Component;
                commonField : common.StatusType;
              }
            `,
            srv: {
              'service.cds': `
                using root from '../schema';
                using { service } from '../../services/api/service';
                
                service RootService {
                  entity Root as projection on root.RootEntity;
                  entity ExternalServices as projection on service.Services;
                }
              `,
            },
          },
          'common-lib': {
            'package.json': JSON.stringify({
              name: 'common-lib',
              dependencies: {
                '@sap/cds': '^6.0.0',
              },
            }),
            'common.cds': `
              namespace common;
              
              // Common types used across multiple projects
              type StatusType : String enum {
                Open; Closed; InProgress;
              }
              
              entity BaseEntity {
                key ID : UUID;
                createdAt : DateTime;
                modifiedAt : DateTime;
              }
            `,
          },
          'ui5-models': {
            'package.json': JSON.stringify({
              name: 'ui5-models',
              dependencies: {
                '@sap/cds': '^6.0.0',
              },
            }),
            'model.cds': `
              namespace ui5;
              
              using { common } from '../common-lib/common';
              
              entity Component : common.BaseEntity {
                name : String;
                version : String;
                dependencies : Association to many Dependency;
              }
              
              entity Dependency {
                key name : String;
                version : String;
              }
            `,
          },
          services: {
            api: {
              'package.json': JSON.stringify({
                name: 'service-api',
                dependencies: {
                  '@sap/cds': '^6.0.0',
                },
              }),
              'service.cds': `
                namespace service;
                
                using { common } from '../../common-lib/common';
                
                entity Services : common.BaseEntity {
                  name : String;
                  url : String;
                  status : common.StatusType;
                }
              `,
            },
          },
        },
      });

      const dependencyGraph = buildCdsProjectDependencyGraph(SOURCE_ROOT);
      const projectMap = dependencyGraph.projects;

      // We should detect all four projects
      expect(projectMap.size).toBe(4);

      // Verify that root-app has dependencies on all other projects
      const rootApp = projectMap.get('root-app');
      const commonLib = projectMap.get('common-lib');
      const ui5Models = projectMap.get('ui5-models');
      const serviceApi = projectMap.get('services/api');

      expect(rootApp).toBeDefined();
      expect(commonLib).toBeDefined();
      expect(ui5Models).toBeDefined();
      expect(serviceApi).toBeDefined();

      // Check dependencies: root-app depends on ui5-models, common-lib, and services/api
      expect(rootApp?.dependencies?.length).toBe(3);
      expect(rootApp?.dependencies?.map(dep => dep.projectDir)).toContain(ui5Models?.projectDir);
      expect(rootApp?.dependencies?.map(dep => dep.projectDir)).toContain(commonLib?.projectDir);
      expect(rootApp?.dependencies?.map(dep => dep.projectDir)).toContain(serviceApi?.projectDir);

      // ui5-models depends on common-lib
      expect(ui5Models?.dependencies?.length).toBe(1);
      expect(ui5Models?.dependencies?.[0]?.projectDir).toBe(commonLib?.projectDir);

      // services/api depends on common-lib
      expect(serviceApi?.dependencies?.length).toBe(1);
      expect(serviceApi?.dependencies?.[0]?.projectDir).toBe(commonLib?.projectDir);

      // common-lib has no dependencies
      expect(commonLib?.dependencies?.length).toBe(0);
    });
  });

  describe('Handling Malformed CDS Files', () => {
    test('should handle malformed CDS files gracefully', () => {
      mockFs.restore();

      // Create a file system with some malformed CDS files
      mockFs({
        [SOURCE_ROOT]: {
          'valid-project': {
            'package.json': JSON.stringify({
              name: 'valid-project',
              dependencies: {
                '@sap/cds': '^6.0.0',
              },
            }),
            'valid.cds': `
              namespace valid;
              
              entity ValidEntity {
                key ID : UUID;
                name : String;
              }
            `,
            'malformed.cds': `
              namespace malformed
              
              // Missing semicolon after namespace
              entity MalformedEntity {
                key ID : UUID;
                // Unclosed entity
            `,
            'empty.cds': '', // Empty file
            'invalid-imports.cds': `
              namespace invalid;
              
              // Malformed using statement (missing from)
              using { common };
              
              // Malformed using statement (missing closing quote)
              using { other } from '../other;
              
              entity Entity {
                key ID : UUID;
              }
            `,
          },
        },
      });

      // The parser should still identify the project and valid files
      const dependencyGraph = buildCdsProjectDependencyGraph(SOURCE_ROOT);
      const projectMap = dependencyGraph.projects;

      // The project should still be detected
      expect(projectMap.size).toBe(1);

      const validProject = projectMap.get('valid-project');
      expect(validProject).toBeDefined();

      // All CDS files should be included, regardless of content validity
      expect(validProject?.cdsFiles.length).toBe(4);
      expect(validProject?.cdsFiles).toContain('valid-project/valid.cds');
      expect(validProject?.cdsFiles).toContain('valid-project/malformed.cds');
      expect(validProject?.cdsFiles).toContain('valid-project/empty.cds');
      expect(validProject?.cdsFiles).toContain('valid-project/invalid-imports.cds');

      // Valid imports should be extracted despite malformed files
      const imports = extractCdsImports(join(SOURCE_ROOT, 'valid-project/valid.cds'));
      expect(imports.length).toBe(0); // No imports in the valid file

      // Malformed imports should be handled gracefully
      const malformedImports = extractCdsImports(
        join(SOURCE_ROOT, 'valid-project/invalid-imports.cds'),
      );
      expect(malformedImports.length).toBe(0); // Should not extract malformed imports
    });

    test('should handle CDS files with partially valid content', () => {
      mockFs.restore();

      // Create a file with mixed valid and invalid content
      mockFs({
        [SOURCE_ROOT]: {
          'mixed-project': {
            'package.json': JSON.stringify({
              name: 'mixed-project',
              dependencies: {
                '@sap/cds': '^6.0.0',
              },
            }),
            'mixed.cds': `
              namespace mixed;
              
              // Valid import
              using { common } from '@sap/cds/common';
              
              // Invalid import (will be skipped)
              using broken from something;
              
              // Valid entity
              entity ValidPart {
                key ID : String;
                name : String;
              }
              
              // Malformed entity (doesn't affect extraction of valid imports)
              entity Broken {
                key ID : String
                // Missing semicolon above
              }
            `,
          },
        },
      });

      // The parser should extract the valid import despite other errors
      const imports = extractCdsImports(join(SOURCE_ROOT, 'mixed-project/mixed.cds'));

      // Should extract the one valid import
      expect(imports.length).toBe(1);
      expect(imports[0].path).toBe('@sap/cds/common');
      expect(imports[0].isModule).toBe(true);

      // The project should be detected
      const dependencyGraph = buildCdsProjectDependencyGraph(SOURCE_ROOT);
      const projectMap = dependencyGraph.projects;
      expect(projectMap.size).toBe(1);
    });
  });

  describe('CDS Projects with Special Annotations and Protocols', () => {
    test('should handle projects with various protocol and annotation patterns', () => {
      mockFs.restore();

      // Create a file system with projects using various protocol annotations
      mockFs({
        [SOURCE_ROOT]: {
          'rest-api': {
            'package.json': JSON.stringify({
              name: 'rest-api',
              dependencies: {
                '@sap/cds': '^6.0.0',
              },
            }),
            'schema.cds': `
              namespace api.rest;
              
              entity Resource {
                key ID : UUID;
                name : String;
                description : String;
              }
            `,
            srv: {
              'service.cds': `
                using api.rest from '../schema';
                
                @path: '/api/v1'
                @requires: 'authenticated-user'
                service RestService {
                  entity Resources as projection on rest.Resource;
                }
              `,
            },
          },
          'odata-api': {
            'package.json': JSON.stringify({
              name: 'odata-api',
              dependencies: {
                '@sap/cds': '^6.0.0',
              },
            }),
            'schema.cds': `
              namespace api.odata;
              
              @cds.persistence.skip: false
              entity Product {
                key ID : UUID;
                name : String;
                price : Decimal;
              }
            `,
            srv: {
              'service.cds': `
                using api.odata from '../schema';
                
                @protocol: 'odata-v4'
                @Capabilities.KeyAsSegmentSupported: true
                @path: '/odata/v4'
                service ODataService {
                  @readonly
                  entity Products as projection on odata.Product;
                }
              `,
            },
          },
          'graphql-api': {
            'package.json': JSON.stringify({
              name: 'graphql-api',
              dependencies: {
                '@sap/cds': '^6.0.0',
              },
            }),
            'schema.cds': `
              namespace api.graphql;
              
              entity User {
                key ID : UUID;
                name : String;
                email : String;
                @assert.format: '^\\d{10}$'
                phone : String;
              }
            `,
            srv: {
              'service.cds': `
                using api.graphql from '../schema';
                
                @protocol: 'graphql'
                service GraphQLService {
                  entity Users as projection on graphql.User;
                }
              `,
            },
          },
          'protocol-none': {
            'package.json': JSON.stringify({
              name: 'protocol-none',
              dependencies: {
                '@sap/cds': '^6.0.0',
              },
            }),
            'schema.cds': `
              namespace api.none;
              
              @assert.unique: [name]
              entity Subscription {
                key ID : UUID;
                name : String;
                @mandatory
                type : String;
              }
            `,
            srv: {
              'service.cds': `
                using api.none from '../schema';
                
                @protocol: 'none'
                service InternalService {
                  entity Subscriptions as projection on none.Subscription;
                }
              `,
            },
          },
        },
      });

      // The parser should handle all these special annotations
      const dependencyGraph = buildCdsProjectDependencyGraph(SOURCE_ROOT);
      const projectMap = dependencyGraph.projects;

      // We should detect all four projects
      expect(projectMap.size).toBe(4);

      // Test that all CDS files were found
      for (const projectKey of ['rest-api', 'odata-api', 'graphql-api', 'protocol-none']) {
        const project = projectMap.get(projectKey);
        expect(project).toBeDefined();
        expect(project?.cdsFiles.length).toBe(2);
        expect(project?.cdsFiles).toContain(`${projectKey}/schema.cds`);
        expect(project?.cdsFiles).toContain(`${projectKey}/srv/service.cds`);
      }

      // Test imports for protocol-none service
      const importNone = extractCdsImports(join(SOURCE_ROOT, 'protocol-none/srv/service.cds'));
      expect(importNone.length).toBe(1);
      expect(importNone[0].path).toBe('../schema');

      // Test imports for odata service
      const importOdata = extractCdsImports(join(SOURCE_ROOT, 'odata-api/srv/service.cds'));
      expect(importOdata.length).toBe(1);
      expect(importOdata[0].path).toBe('../schema');
    });

    test('should handle CDS service implementations with custom handlers', () => {
      mockFs.restore();

      // Create a project with implementation file references
      mockFs({
        [SOURCE_ROOT]: {
          'custom-impl': {
            'package.json': JSON.stringify({
              name: 'custom-impl',
              dependencies: {
                '@sap/cds': '^6.0.0',
              },
            }),
            'schema.cds': `
              namespace custom;
              
              entity Order {
                key ID : UUID;
                customer : String;
                items : Composition of many OrderItems;
              }
              
              entity OrderItems {
                key ID : UUID;
                product : String;
                quantity : Integer;
                price : Decimal;
              }
            `,
            srv: {
              'service.cds': `
                using custom from '../schema';
                
                @impl: './service-impl.js'
                service OrderService {
                  entity Orders as projection on custom.Order;
                }
              `,
              'service-impl.js': `
                // This is a JavaScript implementation file
                // which would contain custom business logic
                module.exports = function() {
                  this.on('READ', 'Orders', req => {
                    // Custom logic
                  });
                };
              `,
            },
          },
        },
      });

      // The parser should handle the @impl annotation
      const dependencyGraph = buildCdsProjectDependencyGraph(SOURCE_ROOT);
      const projectMap = dependencyGraph.projects;
      expect(projectMap.size).toBe(1);

      const customImpl = projectMap.get('custom-impl');
      expect(customImpl).toBeDefined();
      expect(customImpl?.cdsFiles.length).toBe(2);

      // Imports should be correctly identified
      const imports = extractCdsImports(join(SOURCE_ROOT, 'custom-impl/srv/service.cds'));
      expect(imports.length).toBe(1);
      expect(imports[0].path).toBe('../schema');
    });
  });
});
