/**
 * Additional unit tests to improve coverage for findProjectRootFromCdsFile and determineCdsProjectsUnderSourceDir
 */

import mockFs from 'mock-fs';

import {
  determineCdsFilesToCompile,
  determineCdsProjectsUnderSourceDir,
  determineExpectedOutputFiles,
} from '../../../../src/cds/parser/functions';

describe('Function Coverage Tests for determineCdsProjectsUnderSourceDir', () => {
  afterEach(() => {
    mockFs.restore();
  });

  describe('determineCdsProjectsUnderSourceDir - Edge Cases', () => {
    test('should handle empty source root directory', () => {
      mockFs({
        '/empty-root': {},
      });

      const result = determineCdsProjectsUnderSourceDir('/empty-root');
      expect(result).toEqual([]);
    });

    test('should handle source root with only non-CDS files', () => {
      mockFs({
        '/non-cds-root': {
          'README.md': 'This is a readme',
          'other-file.txt': 'Some content',
          subfolder: {
            'another-file.js': 'console.log("hello");',
          },
        },
      });

      const result = determineCdsProjectsUnderSourceDir('/non-cds-root');
      expect(result).toEqual([]);
    });

    test('should handle projects with package.json but no CDS content', () => {
      mockFs({
        '/root': {
          'non-cds-project': {
            'package.json': JSON.stringify({
              name: 'non-cds-project',
              dependencies: { 'some-other-dep': '^1.0.0' },
            }),
            'index.js': 'console.log("hello");',
          },
        },
      });

      const result = determineCdsProjectsUnderSourceDir('/root');
      expect(result).toEqual([]);
    });

    test('should detect project from CDS file when findProjectRootFromCdsFile returns null', () => {
      // Create a structure where findProjectRootFromCdsFile would return null
      // but we still want to detect the CDS file directory
      mockFs({
        '/root': {
          'standalone-cds': {
            'standalone.cds': 'namespace test;',
          },
        },
      });

      const result = determineCdsProjectsUnderSourceDir('/root');
      // The function actually detects the standalone CDS directory
      expect(result).toEqual(['standalone-cds']);
    });

    test('should handle complex monorepo removal logic', () => {
      mockFs({
        '/root': {
          monorepo: {
            'package.json': JSON.stringify({
              name: 'monorepo-root',
              workspaces: ['projects/*'],
              dependencies: { '@sap/cds': '^6.0.0' },
            }),
            'root.cds': 'namespace root;',
            db: {
              'root-schema.cds': 'namespace root;',
            },
            projects: {
              'project-a': {
                'package.json': JSON.stringify({
                  name: 'project-a',
                  dependencies: { '@sap/cds': '^6.0.0' },
                }),
                'service.cds': 'namespace projecta;',
              },
              'project-b': {
                'package.json': JSON.stringify({
                  name: 'project-b',
                  dependencies: { '@sap/cds': '^6.0.0' },
                }),
                'service.cds': 'namespace projectb;',
              },
            },
          },
        },
      });

      const result = determineCdsProjectsUnderSourceDir('/root');
      // Should include monorepo root and both projects
      expect(result).toContain('monorepo');
      expect(result).toContain('monorepo/projects/project-a');
      expect(result).toContain('monorepo/projects/project-b');
    });

    test('should handle case where current directory is monorepo but existing project is not legitimate', () => {
      mockFs({
        '/root': {
          parent: {
            'package.json': JSON.stringify({
              name: 'parent',
              workspaces: ['child'],
              dependencies: { '@sap/cds': '^6.0.0' },
            }),
            'parent.cds': 'namespace parent;',
            child: {
              'package.json': JSON.stringify({
                name: 'child',
                // No CDS dependencies
              }),
              'non-cds-file.txt': 'not cds content',
            },
          },
        },
      });

      const result = determineCdsProjectsUnderSourceDir('/root');
      // Should only include the parent, not the child (since child is not a legitimate CDS project)
      expect(result).toContain('parent');
      expect(result).not.toContain('parent/child');
    });

    test('should throw error for non-existent source root directory', () => {
      expect(() => {
        determineCdsProjectsUnderSourceDir('/non-existent-directory');
      }).toThrow("Source root directory '/non-existent-directory' does not exist.");
    });

    test('should throw error for empty/null source root directory', () => {
      expect(() => {
        determineCdsProjectsUnderSourceDir('');
      }).toThrow("Source root directory '' does not exist.");

      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        determineCdsProjectsUnderSourceDir(null as any);
      }).toThrow("Source root directory 'null' does not exist.");
    });

    test('should handle directories with mixed CDS and non-CDS projects', () => {
      mockFs({
        '/root': {
          'cds-project': {
            'package.json': JSON.stringify({
              name: 'cds-project',
              dependencies: { '@sap/cds': '^6.0.0' },
            }),
            'service.cds': 'namespace cds;',
          },
          'node-project': {
            'package.json': JSON.stringify({
              name: 'node-project',
              dependencies: { express: '^4.0.0' },
            }),
            'app.js': 'const express = require("express");',
          },
          'standalone-cds': {
            'standalone.cds': 'namespace standalone;',
          },
        },
      });

      const result = determineCdsProjectsUnderSourceDir('/root');
      expect(result).toContain('cds-project');
      expect(result).not.toContain('node-project');
      // standalone-cds won't be included because it's not a "likely" CDS project (no package.json with CDS deps)
    });

    test('should handle deeply nested project structures', () => {
      mockFs({
        '/root': {
          level1: {
            level2: {
              level3: {
                'deep-project': {
                  'package.json': JSON.stringify({
                    name: 'deep-project',
                    dependencies: { '@sap/cds': '^6.0.0' },
                  }),
                  'service.cds': 'namespace deep;',
                },
              },
            },
          },
        },
      });

      const result = determineCdsProjectsUnderSourceDir('/root');
      expect(result).toContain('level1/level2/level3/deep-project');
    });

    test('should properly handle relative path conversion for root directory project', () => {
      mockFs({
        '/root': {
          'package.json': JSON.stringify({
            name: 'root-project',
            dependencies: { '@sap/cds': '^6.0.0' },
          }),
          'service.cds': 'namespace root;',
        },
      });

      const result = determineCdsProjectsUnderSourceDir('/root');
      expect(result).toContain('.');
    });
  });

  describe('Integration Tests - Complex Scenarios', () => {
    test('should handle CAP project with mixed standard and non-standard subdirectories', () => {
      mockFs({
        '/source-root': {
          'complex-project': {
            'package.json': JSON.stringify({
              name: 'complex-project',
              dependencies: { '@sap/cds': '^6.0.0' },
            }),
            db: {
              'schema.cds': 'namespace db;',
            },
            srv: {
              'service.cds': 'namespace srv;',
            },
            app: {
              'app.cds': 'namespace app;',
            },
            custom: {
              'package.json': JSON.stringify({
                name: 'custom-module',
                dependencies: { '@sap/cds': '^6.0.0' },
              }),
              'custom.cds': 'namespace custom;',
            },
          },
        },
      });

      const projects = determineCdsProjectsUnderSourceDir('/source-root');
      expect(projects).toContain('complex-project');
      // The custom subdirectory should be detected as part of the parent project structure
      // and not listed separately due to the parent/child relationship logic
    });
  });

  describe('Error Handling and Robustness', () => {
    test('should handle case where file system operations might fail', () => {
      // This tests the robustness of the functions when file system is in an unusual state
      mockFs({
        '/root': {
          'test-project': {
            'package.json': JSON.stringify({
              name: 'test',
              dependencies: { '@sap/cds': '^6.0.0' },
            }),
            'test.cds': 'namespace test;',
          },
        },
      });

      // The functions should handle this normally
      const projects = determineCdsProjectsUnderSourceDir('/root');
      expect(projects).toContain('test-project');
    });
  });
});

describe('Function Coverage Tests for determineExpectedOutputFiles', () => {
  describe('determineExpectedOutputFiles - Project Level Compilation', () => {
    test('should return model.cds.json for project-level compilation', () => {
      const project = {
        cdsFilesToCompile: ['__PROJECT_LEVEL_COMPILATION__'],
        projectDir: '/projects/my-project',
      };

      const result = determineExpectedOutputFiles(project);
      expect(result).toEqual(['/projects/my-project/model.cds.json']);
    });

    test('should throw error when __PROJECT_LEVEL_COMPILATION__ coexists with other files', () => {
      const project = {
        cdsFilesToCompile: ['__PROJECT_LEVEL_COMPILATION__', 'src/db/schema.cds'],
        projectDir: '/projects/my-project',
      };

      expect(() => determineExpectedOutputFiles(project)).toThrow(
        "Invalid compilation configuration: '__PROJECT_LEVEL_COMPILATION__' must be the only element in cdsFilesToCompile array, but found 2 elements: __PROJECT_LEVEL_COMPILATION__, src/db/schema.cds",
      );
    });

    test('should throw error when __PROJECT_LEVEL_COMPILATION__ is present with multiple other files', () => {
      const project = {
        cdsFilesToCompile: [
          '__PROJECT_LEVEL_COMPILATION__',
          'src/db/schema.cds',
          'src/srv/service.cds',
          'src/app/app.cds',
        ],
        projectDir: '/projects/complex-project',
      };

      expect(() => determineExpectedOutputFiles(project)).toThrow(
        "Invalid compilation configuration: '__PROJECT_LEVEL_COMPILATION__' must be the only element in cdsFilesToCompile array, but found 4 elements: __PROJECT_LEVEL_COMPILATION__, src/db/schema.cds, src/srv/service.cds, src/app/app.cds",
      );
    });
  });

  describe('determineExpectedOutputFiles - Individual File Compilation', () => {
    test('should return .json files for individual file compilation', () => {
      const project = {
        cdsFilesToCompile: ['src/db/schema.cds', 'src/srv/service.cds'],
        projectDir: '/projects/my-project',
      };

      const result = determineExpectedOutputFiles(project);
      expect(result).toEqual(['src/db/schema.cds.json', 'src/srv/service.cds.json']);
    });

    test('should handle single file compilation', () => {
      const project = {
        cdsFilesToCompile: ['simple.cds'],
        projectDir: '/projects/simple-project',
      };

      const result = determineExpectedOutputFiles(project);
      expect(result).toEqual(['simple.cds.json']);
    });

    test('should handle compilation of subset of files', () => {
      const project = {
        cdsFilesToCompile: ['src/db/schema.cds', 'src/srv/service.cds'], // Only compiling 2 files
        projectDir: '/projects/selective-project',
      };

      const result = determineExpectedOutputFiles(project);
      expect(result).toEqual(['src/db/schema.cds.json', 'src/srv/service.cds.json']);
    });

    test('should handle files with complex paths', () => {
      const project = {
        cdsFilesToCompile: ['nested/deep/folder/schema.cds', 'another/path/service.cds'],
        projectDir: '/projects/complex-paths',
      };

      const result = determineExpectedOutputFiles(project);
      expect(result).toEqual([
        'nested/deep/folder/schema.cds.json',
        'another/path/service.cds.json',
      ]);
    });
  });

  describe('determineExpectedOutputFiles - Edge Cases', () => {
    test('should handle empty cdsFilesToCompile array', () => {
      const project = {
        cdsFilesToCompile: [],
        projectDir: '/projects/empty-compile',
      };

      const result = determineExpectedOutputFiles(project);
      expect(result).toEqual([]);
    });

    test('should handle project with external files to compile', () => {
      const project = {
        cdsFilesToCompile: ['external.cds'],
        projectDir: '/projects/external-files',
      };

      const result = determineExpectedOutputFiles(project);
      expect(result).toEqual(['external.cds.json']);
    });

    test('should preserve order of files in compilation list', () => {
      const project = {
        cdsFilesToCompile: ['c.cds', 'a.cds', 'b.cds'], // Different order
        projectDir: '/projects/ordered',
      };

      const result = determineExpectedOutputFiles(project);
      expect(result).toEqual(['c.cds.json', 'a.cds.json', 'b.cds.json']);
    });

    test('should handle Windows-style paths in projectDir', () => {
      const project = {
        cdsFilesToCompile: ['__PROJECT_LEVEL_COMPILATION__'],
        projectDir: 'C:\\projects\\windows-project',
      };

      const result = determineExpectedOutputFiles(project);
      // Node.js join() normalizes backslashes to forward slashes
      expect(result).toEqual(['C:\\projects\\windows-project/model.cds.json']);
    });

    test('should handle relative projectDir paths', () => {
      const project = {
        cdsFilesToCompile: ['__PROJECT_LEVEL_COMPILATION__'],
        projectDir: './relative/project',
      };

      const result = determineExpectedOutputFiles(project);
      // Node.js join() removes leading './' from relative paths
      expect(result).toEqual(['relative/project/model.cds.json']);
    });
  });
});

describe('Function Coverage Tests for Enhanced determineCdsFilesToCompile', () => {
  afterEach(() => {
    mockFs.restore();
  });

  describe('determineCdsFilesToCompile - Enhanced with Expected Output Files', () => {
    test('should return both files to compile and expected output files for project-level compilation', () => {
      mockFs({
        '/test-root': {
          'cap-project': {
            'package.json': JSON.stringify({
              name: 'cap-project',
              dependencies: { '@sap/cds': '^6.0.0' },
            }),
            db: {
              'model.cds': 'entity Book { title: String; }',
            },
            srv: {
              'service.cds':
                'using from "../db/model"; service BookService { entity Books as projection on Book; }',
            },
          },
        },
      });

      const project = {
        cdsFiles: ['cap-project/db/model.cds', 'cap-project/srv/service.cds'],
        projectDir: 'cap-project',
        imports: new Map(),
      };

      const result = determineCdsFilesToCompile('/test-root', project);

      // Expected: { filesToCompile: string[], expectedOutputFiles: string[] }
      expect(result).toEqual({
        filesToCompile: ['__PROJECT_LEVEL_COMPILATION__'],
        expectedOutputFiles: ['cap-project/model.cds.json'],
      });
    });

    test('should return both files to compile and expected output files for individual file compilation', () => {
      mockFs({
        '/test-root': {
          'simple-project': {
            'main.cds': 'entity Person { name: String; }',
            'utils.cds': 'type ID : String;',
          },
        },
      });

      const project = {
        cdsFiles: ['simple-project/main.cds', 'simple-project/utils.cds'],
        projectDir: 'simple-project',
        imports: new Map([
          [
            'simple-project/main.cds',
            [
              {
                isModule: false,
                isRelative: true,
                path: './utils',
                resolvedPath: 'simple-project/utils.cds',
                statement: 'using from "./utils";',
              },
            ],
          ],
        ]),
      };

      const result = determineCdsFilesToCompile('/test-root', project);

      // Expected: main.cds is root (not imported), utils.cds is imported
      expect(result).toEqual({
        filesToCompile: ['simple-project/main.cds'],
        expectedOutputFiles: ['simple-project/main.cds.json'],
      });
    });

    test('should handle single file project', () => {
      mockFs({
        '/test-root': {
          'single-file': {
            'standalone.cds': 'entity Book { title: String; }',
          },
        },
      });

      const project = {
        cdsFiles: ['single-file/standalone.cds'],
        projectDir: 'single-file',
        imports: new Map(),
      };

      const result = determineCdsFilesToCompile('/test-root', project);

      expect(result).toEqual({
        filesToCompile: ['single-file/standalone.cds'],
        expectedOutputFiles: ['single-file/standalone.cds.json'],
      });
    });

    test('should handle empty project', () => {
      const project = {
        cdsFiles: [],
        projectDir: 'empty-project',
        imports: new Map(),
      };

      const result = determineCdsFilesToCompile('/test-root', project);

      expect(result).toEqual({
        filesToCompile: [],
        expectedOutputFiles: [],
      });
    });

    test('should handle multiple root files in non-CAP project', () => {
      mockFs({
        '/test-root': {
          'multi-root': {
            'service1.cds': 'entity Service1 { id: String; }',
            'service2.cds': 'entity Service2 { id: String; }',
            'common.cds': 'type ID : String;',
          },
        },
      });

      const project = {
        cdsFiles: ['multi-root/service1.cds', 'multi-root/service2.cds', 'multi-root/common.cds'],
        projectDir: 'multi-root',
        imports: new Map([
          [
            'multi-root/service1.cds',
            [
              {
                isModule: false,
                isRelative: true,
                path: './common',
                resolvedPath: 'multi-root/common.cds',
                statement: 'using from "./common";',
              },
            ],
          ],
          [
            'multi-root/service2.cds',
            [
              {
                isModule: false,
                isRelative: true,
                path: './common',
                resolvedPath: 'multi-root/common.cds',
                statement: 'using from "./common";',
              },
            ],
          ],
        ]),
      };

      const result = determineCdsFilesToCompile('/test-root', project);

      // Both service1.cds and service2.cds are root files (not imported by others)
      expect(result).toEqual({
        filesToCompile: ['multi-root/service1.cds', 'multi-root/service2.cds'],
        expectedOutputFiles: ['multi-root/service1.cds.json', 'multi-root/service2.cds.json'],
      });
    });

    test('should fall back to all files when no root files identified', () => {
      mockFs({
        '/test-root': {
          circular: {
            'a.cds': 'using from "./b"; entity A { id: String; }',
            'b.cds': 'using from "./a"; entity B { id: String; }',
          },
        },
      });

      const project = {
        cdsFiles: ['circular/a.cds', 'circular/b.cds'],
        projectDir: 'circular',
        imports: new Map([
          [
            'circular/a.cds',
            [
              {
                isModule: false,
                isRelative: true,
                path: './b',
                resolvedPath: 'circular/b.cds',
                statement: 'using from "./b";',
              },
            ],
          ],
          [
            'circular/b.cds',
            [
              {
                isModule: false,
                isRelative: true,
                path: './a',
                resolvedPath: 'circular/a.cds',
                statement: 'using from "./a";',
              },
            ],
          ],
        ]),
      };

      const result = determineCdsFilesToCompile('/test-root', project);

      // Should fall back to compiling all files when circular dependencies exist
      expect(result).toEqual({
        filesToCompile: ['circular/a.cds', 'circular/b.cds'],
        expectedOutputFiles: ['circular/a.cds.json', 'circular/b.cds.json'],
      });
    });

    test('should handle project with missing imports map', () => {
      mockFs({
        '/test-root': {
          'no-imports': {
            'file1.cds': 'entity File1 { id: String; }',
            'file2.cds': 'entity File2 { id: String; }',
          },
        },
      });

      const project = {
        cdsFiles: ['no-imports/file1.cds', 'no-imports/file2.cds'],
        projectDir: 'no-imports',
        // No imports property
      };

      const result = determineCdsFilesToCompile('/test-root', project);

      // Should compile all files when no imports information is available
      expect(result).toEqual({
        filesToCompile: ['no-imports/file1.cds', 'no-imports/file2.cds'],
        expectedOutputFiles: ['no-imports/file1.cds.json', 'no-imports/file2.cds.json'],
      });
    });
  });
});
