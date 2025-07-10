import mockFs from 'mock-fs';

import {
  determineCdsFilesForProjectDir,
  determineCdsProjectsUnderSourceDir,
  isLikelyCdsProject,
} from '../../../../src/cds/parser/functions';

describe('CDS Parser - Subdirectory File Detection', () => {
  afterEach(() => {
    mockFs.restore();
  });

  describe('determineCdsFilesForProjectDir', () => {
    it('should find CDS files in valid subdirectories and exclude node_modules', () => {
      mockFs({
        '/project': {
          'package.json': JSON.stringify({
            name: 'test-project',
            dependencies: { '@sap/cds': '^6.0.0' },
          }),
          'root.cds': 'namespace root;',
          db: {
            'schema.cds': 'namespace db;',
            models: {
              'deep-model.cds': 'namespace db.models;',
              nested: {
                'very-deep.cds': 'namespace db.models.nested;',
              },
            },
          },
          srv: {
            'service.cds': 'namespace srv;',
            impl: {
              'service-impl.cds': 'namespace srv.impl;',
            },
          },
          // These should be excluded
          node_modules: {
            '@sap': {
              cds: {
                'common.cds': 'namespace sap.common;',
                lib: {
                  'internal.cds': 'namespace sap.cds.lib;',
                },
              },
            },
            'some-package': {
              'package.cds': 'namespace package;',
              db: {
                'package-db.cds': 'namespace package.db;',
              },
            },
          },
        },
      });

      const files = determineCdsFilesForProjectDir('/project', '/project');

      // Should include valid CDS files
      expect(files).toContain('root.cds');
      expect(files).toContain('db/schema.cds');
      expect(files).toContain('db/models/deep-model.cds');
      expect(files).toContain('db/models/nested/very-deep.cds');
      expect(files).toContain('srv/service.cds');
      expect(files).toContain('srv/impl/service-impl.cds');

      // Should NOT include any node_modules files
      expect(files.some(file => file.includes('node_modules'))).toBe(false);
      expect(files.some(file => file.includes('@sap/cds/common.cds'))).toBe(false);
      expect(files.some(file => file.includes('some-package'))).toBe(false);

      // Should have exactly 6 files (no node_modules files)
      expect(files.length).toBe(6);
    });

    it('should include files from directories with node_modules in name but exclude actual node_modules', () => {
      mockFs({
        '/project': {
          'package.json': JSON.stringify({
            name: 'test-project',
            dependencies: { '@sap/cds': '^6.0.0' },
          }),
          'main.cds': 'namespace main;',
          // These should be included (not actual node_modules)
          node_modules_backup: {
            'backup.cds': 'namespace backup;',
          },
          db: {
            node_modules_test: {
              'test.cds': 'namespace test;',
            },
          },
          my_node_modules_folder: {
            'folder.cds': 'namespace folder;',
          },
          // This should be excluded (actual node_modules)
          node_modules: {
            dependency: {
              'dep.cds': 'namespace dep;',
            },
          },
        },
      });

      const files = determineCdsFilesForProjectDir('/project', '/project');

      // Should include files from directories with node_modules in the name
      expect(files).toContain('main.cds');
      expect(files).toContain('node_modules_backup/backup.cds');
      expect(files).toContain('db/node_modules_test/test.cds');
      expect(files).toContain('my_node_modules_folder/folder.cds');

      // Should NOT include files from actual node_modules directory
      expect(files.some(file => file.includes('node_modules/dependency'))).toBe(false);

      // Should have exactly 4 files
      expect(files.length).toBe(4);
    });

    it('should handle deeply nested node_modules exclusion', () => {
      mockFs({
        '/project': {
          'package.json': JSON.stringify({
            name: 'test-project',
            dependencies: { '@sap/cds': '^6.0.0' },
          }),
          'main.cds': 'namespace main;',
          db: {
            'schema.cds': 'namespace db;',
            nested: {
              deep: {
                very: {
                  'deep.cds': 'namespace very.deep;',
                },
              },
            },
          },
          node_modules: {
            'package-a': {
              'package-a.cds': 'namespace packageA;',
              node_modules: {
                'nested-dep': {
                  'nested.cds': 'namespace nested;',
                  db: {
                    'nested-db.cds': 'namespace nested.db;',
                  },
                },
              },
            },
          },
        },
      });

      const files = determineCdsFilesForProjectDir('/project', '/project');

      // Should include valid deeply nested files
      expect(files).toContain('main.cds');
      expect(files).toContain('db/schema.cds');
      expect(files).toContain('db/nested/deep/very/deep.cds');

      // Should NOT include any node_modules files, even deeply nested ones
      expect(files.some(file => file.includes('node_modules'))).toBe(false);
      expect(files.some(file => file.includes('package-a'))).toBe(false);
      expect(files.some(file => file.includes('nested-dep'))).toBe(false);

      // Should have exactly 3 files
      expect(files.length).toBe(3);
    });

    it('should handle multiple standard CDS directories with deep nesting', () => {
      mockFs({
        '/project': {
          'package.json': JSON.stringify({
            name: 'test-project',
            dependencies: { '@sap/cds': '^6.0.0' },
          }),
          db: {
            'schema.cds': 'namespace db;',
            entities: {
              core: {
                'base.cds': 'namespace db.entities.core;',
              },
              extensions: {
                'ext.cds': 'namespace db.entities.extensions;',
              },
            },
          },
          srv: {
            'service.cds': 'namespace srv;',
            services: {
              admin: {
                'admin-service.cds': 'namespace srv.services.admin;',
              },
              public: {
                'public-service.cds': 'namespace srv.services.public;',
              },
            },
          },
          app: {
            webapp: {
              'app.cds': 'namespace app.webapp;',
            },
          },
        },
      });

      const files = determineCdsFilesForProjectDir('/project', '/project');

      // Should find all CDS files across different standard directories
      expect(files).toContain('db/schema.cds');
      expect(files).toContain('db/entities/core/base.cds');
      expect(files).toContain('db/entities/extensions/ext.cds');
      expect(files).toContain('srv/service.cds');
      expect(files).toContain('srv/services/admin/admin-service.cds');
      expect(files).toContain('srv/services/public/public-service.cds');
      expect(files).toContain('app/webapp/app.cds');

      expect(files.length).toBe(7);
    });

    it('should return empty array for project with no CDS files', () => {
      mockFs({
        '/empty-project': {
          'package.json': JSON.stringify({
            name: 'empty-project',
            dependencies: { '@sap/cds': '^6.0.0' },
          }),
          'README.md': '# Empty project',
          src: {
            'index.js': 'console.log("hello");',
          },
        },
      });

      const files = determineCdsFilesForProjectDir('/empty-project', '/empty-project');
      expect(files).toEqual([]);
    });

    it('should throw error if projectDir is not subdirectory of sourceRootDir', () => {
      mockFs({
        '/project-a': {
          'package.json': JSON.stringify({ name: 'project-a' }),
          'file.cds': 'namespace a;',
        },
        '/project-b': {
          'package.json': JSON.stringify({ name: 'project-b' }),
          'file.cds': 'namespace b;',
        },
      });

      expect(() => {
        determineCdsFilesForProjectDir('/project-a', '/project-b');
      }).toThrow('projectDir must be a subdirectory of sourceRootDir or equal to sourceRootDir.');
    });

    it('should allow projectDir to be equal to sourceRootDir', () => {
      mockFs({
        '/project-root': {
          'package.json': JSON.stringify({
            name: 'project-root',
            dependencies: { '@sap/cds': '^6.0.0' },
          }),
          'main.cds': 'namespace main;',
          db: {
            'schema.cds': 'namespace db;',
          },
          srv: {
            'service.cds': 'namespace srv;',
          },
        },
      });

      const files = determineCdsFilesForProjectDir('/project-root', '/project-root');

      expect(files).toContain('main.cds');
      expect(files).toContain('db/schema.cds');
      expect(files).toContain('srv/service.cds');
      expect(files.length).toBe(3);
    });

    it('should throw error if parameters are missing', () => {
      expect(() => {
        determineCdsFilesForProjectDir('', '/project');
      }).toThrow('both sourceRootDir and projectDir must be provided');

      expect(() => {
        determineCdsFilesForProjectDir('/root', '');
      }).toThrow('both sourceRootDir and projectDir must be provided');
    });
  });

  describe('determineCdsProjectsUnderSourceDir', () => {
    it('should find CDS projects but not include node_modules directories', () => {
      mockFs({
        '/workspace': {
          'valid-project': {
            'package.json': JSON.stringify({
              name: 'valid-project',
              dependencies: { '@sap/cds': '^6.0.0' },
            }),
            'main.cds': 'namespace valid;',
          },
          'another-valid': {
            'package.json': JSON.stringify({
              name: 'another-valid',
              dependencies: { '@sap/cds': '^5.0.0' },
            }),
            db: {
              'schema.cds': 'namespace another.db;',
            },
          },
          node_modules: {
            '@sap': {
              cds: {
                'package.json': JSON.stringify({
                  name: '@sap/cds',
                  version: '6.0.0',
                }),
                'common.cds': 'namespace sap.common;',
              },
            },
            'some-cds-package': {
              'package.json': JSON.stringify({
                name: 'some-cds-package',
                dependencies: { '@sap/cds': '^6.0.0' },
              }),
              'lib.cds': 'namespace some.package;',
            },
          },
          'non-cds-project': {
            'package.json': JSON.stringify({
              name: 'non-cds-project',
              dependencies: { express: '^4.0.0' },
            }),
            'index.js': 'console.log("hello");',
          },
        },
      });

      const projects = determineCdsProjectsUnderSourceDir('/workspace');

      // Should include valid CDS projects
      expect(projects).toContain('valid-project');
      expect(projects).toContain('another-valid');

      // Should NOT include node_modules directories
      expect(projects.some(p => p.includes('node_modules'))).toBe(false);
      expect(projects.some(p => p.includes('@sap/cds'))).toBe(false);
      expect(projects.some(p => p.includes('some-cds-package'))).toBe(false);

      // Should NOT include non-CDS projects
      expect(projects).not.toContain('non-cds-project');

      // Should have exactly 2 projects
      expect(projects.length).toBe(2);
    });
  });

  describe('isLikelyCdsProject', () => {
    it('should identify CDS projects correctly', () => {
      mockFs({
        '/cds-with-deps': {
          'package.json': JSON.stringify({
            name: 'cds-with-deps',
            dependencies: { '@sap/cds': '^6.0.0' },
          }),
        },
        '/cds-with-files': {
          'package.json': JSON.stringify({
            name: 'cds-with-files',
            dependencies: {},
          }),
          db: {
            'schema.cds': 'namespace test;',
          },
        },
        '/standalone-cds': {
          'main.cds': 'namespace standalone;',
        },
        '/not-cds': {
          'package.json': JSON.stringify({
            name: 'not-cds',
            dependencies: { express: '^4.0.0' },
          }),
          'index.js': 'console.log("hello");',
        },
      });

      expect(isLikelyCdsProject('/cds-with-deps')).toBe(false); // CAP deps but no CDS files - nothing to do
      expect(isLikelyCdsProject('/cds-with-files')).toBe(true);
      expect(isLikelyCdsProject('/standalone-cds')).toBe(true);
      expect(isLikelyCdsProject('/not-cds')).toBe(false);
    });
  });

  describe('Node modules exclusion regression tests', () => {
    it('should handle complex node_modules scenarios', () => {
      mockFs({
        '/complex-project': {
          'package.json': JSON.stringify({
            name: 'complex-project',
            dependencies: { '@sap/cds': '^6.0.0' },
          }),
          'main.cds': 'namespace main;',

          // Valid nested directories
          db: {
            models: {
              entities: {
                'core.cds': 'namespace db.models.entities;',
              },
            },
          },

          // Directory with node_modules in name (should be included)
          legacy_node_modules: {
            'legacy.cds': 'namespace legacy;',
          },

          // Actual node_modules (should be excluded)
          node_modules: {
            '@sap': {
              cds: {
                'common.cds': 'namespace sap.common;',
                node_modules: {
                  'deep-dep': {
                    'deep.cds': 'namespace deep;',
                    db: {
                      'deep-db.cds': 'namespace deep.db;',
                    },
                  },
                },
              },
            },
            'user-package': {
              'user.cds': 'namespace user;',
              src: {
                'user-src.cds': 'namespace user.src;',
              },
            },
          },
        },
      });

      const files = determineCdsFilesForProjectDir('/complex-project', '/complex-project');

      // Should include valid files
      expect(files).toContain('main.cds');
      expect(files).toContain('db/models/entities/core.cds');
      expect(files).toContain('legacy_node_modules/legacy.cds');

      // Should exclude all actual node_modules/ files but allow directories with node_modules in name
      // Check specifically for paths that represent actual node_modules directories
      const actualNodeModulesFiles = files.filter(file => {
        // Split the path and check if any segment is exactly "node_modules"
        const pathSegments = file.split('/');
        return pathSegments.includes('node_modules');
      });
      expect(actualNodeModulesFiles.length).toBe(0);

      // Additional specific checks
      expect(files.some(file => file.includes('@sap/cds/common.cds'))).toBe(false);
      expect(files.some(file => file.includes('deep-dep'))).toBe(false);
      expect(files.some(file => file.includes('user-package'))).toBe(false);

      // Should have exactly 3 files
      expect(files.length).toBe(3);
    });
  });
});
