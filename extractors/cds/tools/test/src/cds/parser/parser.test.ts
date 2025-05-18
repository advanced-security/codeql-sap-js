/* eslint-disable @typescript-eslint/no-require-imports */
import mockFs from 'mock-fs';

import {
  buildCdsProjectDependencyGraph,
  determineCdsFilesForProjectDir,
  determineCdsProjectsUnderSourceDir,
  extractCdsImports,
  findProjectRootFromCdsFile,
  getAllCdsFiles,
  isLikelyCdsProject,
} from '../../../../src/cds/parser/functions';

// Helper for creating test file structure
function createTestFileSystem() {
  return mockFs({
    '/project': {
      'package.json': JSON.stringify({
        name: 'cds-test-project',
        dependencies: {
          '@sap/cds': '^6.0.0',
          '@sap/cds-dk': '^6.0.0',
        },
      }),
      db: {
        'schema.cds': `
          namespace com.example.bookshop;
          
          using { Currency, managed, cuid } from '@sap/cds/common';
          
          entity Books {
            key ID : Integer;
            title : String;
            author : Association to Authors;
            stock : Integer;
            price : Decimal;
          }
          
          entity Authors {
            key ID : Integer;
            name : String;
            books : Association to many Books on books.author = $self;
          }
        `,
      },
      srv: {
        'catalog-service.cds': `
          using com.example.bookshop as bookshop from '../db/schema';
          
          service CatalogService {
            entity Books as projection on bookshop.Books;
            entity Authors as projection on bookshop.Authors;
          }
        `,
        'admin-service.cds': `
          using com.example.bookshop as bookshop from '../db/schema';
          
          service AdminService {
            entity Books as projection on bookshop.Books;
            entity Authors as projection on bookshop.Authors;
          }
        `,
      },
      app: {
        webapp: {
          'manifest.json': JSON.stringify({
            'sap.app': {
              id: 'bookshop',
              type: 'application',
            },
          }),
        },
      },
    },
    '/another-project': {
      'package.json': JSON.stringify({
        name: 'another-cds-project',
        dependencies: {
          '@sap/cds': '^5.0.0',
        },
      }),
      model: {
        'index.cds': `
          namespace com.example.another;
          
          using { managed } from '@sap/cds/common';
          
          entity Products {
            key ID : UUID;
            name : String;
            description : String;
          }
        `,
        'extra.cds': `
          namespace com.example.another;
          
          entity Categories {
            key ID : UUID;
            name : String;
          }
        `,
      },
      service: {
        'main.cds': `
          using com.example.another from '../model/index';
          
          service ProductService {
            entity Products as projection on another.Products;
          }
        `,
      },
    },
    '/non-cds-project': {
      'package.json': JSON.stringify({
        name: 'non-cds-project',
        dependencies: {
          express: '^4.17.1',
        },
      }),
      'index.js': 'console.log("Hello world")',
    },
    '/standalone-cds': {
      'single.cds': `
        namespace com.example.standalone;
        
        entity Simple {
          key ID : String;
          name : String;
        }
      `,
    },
  });
}

describe('CDS Parser Functions', () => {
  beforeEach(() => {
    createTestFileSystem();
  });

  afterEach(() => {
    mockFs.restore();
  });

  describe('determineCdsFilesForProjectDir', () => {
    it('should find all CDS files in a project directory', () => {
      const files = determineCdsFilesForProjectDir('/project', '/project');

      expect(files).toContain('db/schema.cds');
      expect(files).toContain('srv/catalog-service.cds');
      expect(files).toContain('srv/admin-service.cds');
      expect(files.length).toBe(3);
    });

    it('should throw error if projectDir is not a subdirectory of sourceRootDir', () => {
      expect(() => {
        determineCdsFilesForProjectDir('/other', '/project');
      }).toThrow();
    });

    it('should return empty array if no CDS files are found', () => {
      const files = determineCdsFilesForProjectDir('/non-cds-project', '/non-cds-project');
      expect(files).toEqual([]);
    });
  });

  describe('isLikelyCdsProject', () => {
    it('should identify CDS project by package.json dependencies', () => {
      expect(isLikelyCdsProject('/project')).toBe(true);
      expect(isLikelyCdsProject('/another-project')).toBe(true);
      expect(isLikelyCdsProject('/non-cds-project')).toBe(false);
    });

    it('should identify CDS project by presence of CDS files in standard locations', () => {
      // Create a test directory with only CDS files in standard locations, no @sap/cds dependency
      mockFs({
        '/cds-by-structure': {
          'package.json': JSON.stringify({
            name: 'cds-by-structure',
            dependencies: {},
          }),
          db: {
            'model.cds': 'namespace test;',
          },
          srv: {
            'service.cds': 'using test from "../db/model";',
          },
        },
      });

      expect(isLikelyCdsProject('/cds-by-structure')).toBe(true);
    });

    it('should identify directory with direct CDS files as a CDS project', () => {
      expect(isLikelyCdsProject('/standalone-cds')).toBe(true);
    });
  });

  describe('determineCdsProjectsUnderSourceDir', () => {
    it('should find all CDS projects under a root directory', () => {
      const projects = determineCdsProjectsUnderSourceDir('/');

      expect(projects).toContain('project');
      expect(projects).toContain('another-project');
      expect(projects).toContain('standalone-cds');
      expect(projects).not.toContain('non-cds-project');
    });

    it('should throw error if sourceRootDir does not exist', () => {
      expect(() => {
        determineCdsProjectsUnderSourceDir('/non-existent');
      }).toThrow();
    });
  });

  describe('findProjectRootFromCdsFile', () => {
    it('should find the project root starting from a CDS file directory', () => {
      const projectRoot = findProjectRootFromCdsFile('/project/db', '/');
      expect(projectRoot).toBe('/project');
    });

    it('should return the original directory if no proper project root is found', () => {
      const projectRoot = findProjectRootFromCdsFile('/standalone-cds', '/');
      expect(projectRoot).toBe('/standalone-cds');
    });
  });

  describe('extractCdsImports', () => {
    it('should extract imports from a CDS file', () => {
      const imports = extractCdsImports('/project/srv/catalog-service.cds');

      expect(imports.length).toBe(1);
      expect(imports[0].path).toBe('../db/schema');
      expect(imports[0].isRelative).toBe(true);
    });

    it('should handle module imports correctly', () => {
      const imports = extractCdsImports('/project/db/schema.cds');

      expect(imports.length).toBe(1);
      expect(imports[0].path).toBe('@sap/cds/common');
      expect(imports[0].isRelative).toBe(false);
      expect(imports[0].isModule).toBe(true);
    });

    it('should throw error if file does not exist', () => {
      expect(() => {
        extractCdsImports('/non-existent.cds');
      }).toThrow();
    });
  });
  describe('buildCdsProjectDependencyGraph', () => {
    beforeEach(() => {
      // Setup a simple mock filesystem with one CDS project
      mockFs({
        '/project': {
          'package.json': JSON.stringify({
            name: 'project',
            dependencies: {
              '@sap/cds': '4.0.0',
            },
          }),
          'app.cds': 'namespace test;',
          srv: {
            'service.cds': 'using test from "../app";',
          },
          db: {
            'schema.cds': 'namespace db;',
          },
        },
      });

      // Mock determineCdsProjectsUnderSourceDir to return exactly what we want
      const functionsModule = require('../../../../src/cds/parser/functions');
      jest
        .spyOn(functionsModule, 'determineCdsProjectsUnderSourceDir')
        .mockReturnValue(['project']);

      // Also need to mock determineCdsFilesForProjectDir to return our expected files
      jest
        .spyOn(functionsModule, 'determineCdsFilesForProjectDir')
        .mockReturnValue(['project/app.cds', 'project/srv/service.cds', 'project/db/schema.cds']);
    });

    it('should build a dependency graph of CDS projects', () => {
      const graph = buildCdsProjectDependencyGraph('/');

      expect(graph.size).toBe(1);
      // Our mock includes 3 directories but isLikelyCdsProject would
      // typically filter out directories that don't match the criteria
      // Through the filesystem mocking we can test what's actually found
      expect(graph.has('project')).toBe(true);

      // Verify project structure
      const project = graph.get('project');
      expect(project?.cdsFiles.length).toBe(3);
      expect(project?.packageJson).toBeDefined();
    });
  });

  describe('getAllCdsFiles', () => {
    it('should get all CDS files organized by project', () => {
      const files = getAllCdsFiles('/');

      expect(files.length).toBe(7); // Total number of CDS files across all projects

      // Check for files from each project
      expect(files.some(f => f.filePath === 'project/db/schema.cds')).toBe(true);
      expect(files.some(f => f.filePath === 'project/srv/catalog-service.cds')).toBe(true);
      expect(files.some(f => f.filePath === 'project/srv/admin-service.cds')).toBe(true);
      expect(files.some(f => f.filePath === 'another-project/model/index.cds')).toBe(true);
      expect(files.some(f => f.filePath === 'another-project/model/extra.cds')).toBe(true);
      expect(files.some(f => f.filePath === 'another-project/service/main.cds')).toBe(true);
      expect(files.some(f => f.filePath === 'standalone-cds/single.cds')).toBe(true);
    });
  });
});
