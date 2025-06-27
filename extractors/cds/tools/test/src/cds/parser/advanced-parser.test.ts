import mockFs from 'mock-fs';

import {
  CdsParseResult,
  consolidateCdsResults,
  parseCdsFile,
  processCdsProject,
} from '../../../../src/cds';

describe('Advanced CDS Parser Functions', () => {
  afterEach(() => {
    mockFs.restore();
  });

  describe('parseCdsFile', () => {
    beforeEach(() => {
      // Create mock file system for testing
      mockFs({
        '/test': {
          'entity.cds': `
            namespace com.example.bookshop;
            
            using { Currency, managed, cuid } from '@sap/cds/common';
            
            entity Books {
              key ID : Integer;
              title : String;
              author : Association to Authors;
              @readonly: true
              stock : Integer;
              price : Decimal;
            }
            
            entity Authors {
              key ID : Integer;
              name : String;
              books : Association to many Books on books.author = $self;
            }
          `,
          'service.cds': `
            using com.example.bookshop as bookshop from './entity';
            
            @requires: 'authenticated-user'
            service CatalogService {
              entity Books as projection on bookshop.Books;
              entity Authors as projection on bookshop.Authors;
            }
          `,
          'access-control.cds': `
            using { CatalogService } from './service';
            
            annotate CatalogService with @requires: 'admin';
            
            annotate CatalogService.Books with @readonly: true;
          `,
          'context.cds': `
            namespace com.example.context;
            
            context Admin {
              entity Users {
                key ID : String;
                name : String;
                role : String;
              }
              
              service AdminService {
                entity Users as projection on Users;
              }
            }
          `,
        },
      });
    });

    it('should parse entity definitions correctly', () => {
      const result = parseCdsFile('/test/entity.cds');

      expect(result.namespace).toBe('com.example.bookshop');
      expect(result.entities.length).toBe(2);

      // Check first entity
      const booksEntity = result.entities.find(e => e.name === 'Books');
      expect(booksEntity).toBeDefined();
      expect(booksEntity?.fqn).toBe('com.example.bookshop.Books');
      expect(booksEntity?.properties.length).toBe(5);

      // Check property types
      const idProp = booksEntity?.properties.find(p => p.name === 'ID');
      expect(idProp?.isKey).toBe(true);
      expect(idProp?.type).toBe('Integer');

      const authorProp = booksEntity?.properties.find(p => p.name === 'author');
      expect(authorProp?.isAssociation).toBe(true);
      expect(authorProp?.target).toBe('Authors');

      // Check property with annotation
      const stockProp = booksEntity?.properties.find(p => p.name === 'stock');
      expect(stockProp?.annotations.length).toBeGreaterThan(0);
      expect(stockProp?.annotations[0].name).toBe('readonly');
      expect(stockProp?.annotations[0].value).toBe(true);

      // Check association cardinality
      const booksAssoc = result.entities
        .find(e => e.name === 'Authors')
        ?.properties.find(p => p.name === 'books');
      expect(booksAssoc?.isAssociation).toBe(true);
      expect(booksAssoc?.cardinality).toBe('many');
    });

    it('should parse service definitions correctly', () => {
      const result = parseCdsFile('/test/service.cds');

      expect(result.services.length).toBe(1);

      const service = result.services[0];
      expect(service.name).toBe('CatalogService');
      expect(service.entities.length).toBe(2);

      // Check service annotations
      expect(service.annotations.length).toBeGreaterThan(0);
      expect(service.annotations[0].name).toBe('requires');
      expect(service.annotations[0].value).toBe('authenticated-user');

      // Check exposed entities
      expect(service.entities[0].name).toBe('Books');
      expect(service.entities[0].sourceEntity).toBe('bookshop.Books');
      expect(service.entities[0].isProjection).toBe(true);
    });

    it('should parse access control annotations correctly', () => {
      const result = parseCdsFile('/test/access-control.cds');

      expect(result.accessControls.length).toBe(2);

      // Check service level annotation
      const serviceControl = result.accessControls.find(ac => ac.target === 'CatalogService');
      expect(serviceControl).toBeDefined();
      expect(serviceControl?.type).toBe('requires');
      expect(serviceControl?.value).toBe('admin');

      // Check entity level annotation
      const entityControl = result.accessControls.find(ac => ac.target === 'CatalogService.Books');
      expect(entityControl).toBeDefined();
      expect(entityControl?.type).toBe('readonly');
      expect(entityControl?.value).toBe(true);
    });

    it('should parse context blocks correctly', () => {
      const result = parseCdsFile('/test/context.cds');

      expect(result.namespace).toBe('com.example.context');
      expect(result.contexts.length).toBe(1);

      const adminContext = result.contexts[0];
      expect(adminContext.name).toBe('Admin');
      expect(adminContext.entities.length).toBe(1);
      expect(adminContext.services.length).toBe(1);

      // Check entity inside context
      const usersEntity = adminContext.entities[0];
      expect(usersEntity.name).toBe('Users');
      expect(usersEntity.fqn).toBe('com.example.context.Admin.Users');

      // Check service inside context
      const adminService = adminContext.services[0];
      expect(adminService.name).toBe('AdminService');
      expect(adminService.fqn).toBe('com.example.context.Admin.AdminService');
      expect(adminService.entities[0].sourceEntity).toBe('Users');
    });
  });

  describe('consolidateCdsResults', () => {
    it('should merge multiple CDS parse results correctly', () => {
      // Create mock results
      const result1: CdsParseResult = {
        namespace: 'com.example.test',
        entities: [
          {
            name: 'Product',
            fqn: 'com.example.test.Product',
            sourceFile: '/test/product.cds',
            properties: [
              {
                name: 'ID',
                type: 'String',
                isKey: true,
                isAssociation: false,
                isComposition: false,
                annotations: [],
              },
            ],
            annotations: [],
          },
        ],
        services: [
          {
            name: 'ProductService',
            fqn: 'com.example.test.ProductService',
            sourceFile: '/test/service.cds',
            entities: [
              {
                name: 'Products',
                sourceEntity: 'com.example.test.Product',
                isProjection: true,
                annotations: [],
              },
            ],
            annotations: [],
          },
        ],
        imports: [],
        accessControls: [],
        contexts: [],
        errors: [],
      };

      const result2: CdsParseResult = {
        entities: [],
        services: [],
        imports: [],
        accessControls: [
          {
            target: 'com.example.test.ProductService',
            type: 'requires',
            value: 'admin',
            sourceFile: '/test/access.cds',
          },
        ],
        contexts: [],
        errors: [],
      };

      const consolidated = consolidateCdsResults([result1, result2]);

      // Check that everything is merged
      expect(consolidated.entities.length).toBe(1);
      expect(consolidated.services.length).toBe(1);
      expect(consolidated.accessControls.length).toBe(1);

      // Check that access control is applied to the service
      const service = consolidated.services[0];
      expect(service.annotations.length).toBe(1);
      expect(service.annotations[0].name).toBe('requires');
      expect(service.annotations[0].value).toBe('admin');
    });
  });

  describe('processCdsProject', () => {
    beforeEach(() => {
      // Create a more complex mock file system for a project
      mockFs({
        '/project': {
          'package.json': JSON.stringify({
            name: 'test-project',
            dependencies: {
              '@sap/cds': '^6.0.0',
            },
          }),
          db: {
            'schema.cds': `
              namespace com.example.project;
              
              using { managed } from '@sap/cds/common';
              
              entity Products : managed {
                key ID : UUID;
                name : String;
                description : String;
                price : Decimal;
                category : Association to Categories;
              }
              
              entity Categories {
                key ID : UUID;
                name : String;
                products : Association to many Products on products.category = $self;
              }
            `,
          },
          srv: {
            'catalog-service.cds': `
              using com.example.project as db from '../db/schema';
              
              service CatalogService {
                entity Products as projection on db.Products;
                entity Categories as projection on db.Categories;
              }
            `,
            'admin-service.cds': `
              using com.example.project as db from '../db/schema';
              
              service AdminService {
                entity Products as projection on db.Products;
                entity Categories as projection on db.Categories;
              }
            `,
          },
          app: {
            fiori: {
              'annotations.cds': `
                using CatalogService from '../../srv/catalog-service';
                
                annotate CatalogService with @(requires: 'authenticated-user');
                annotate CatalogService.Products with @(readonly: true);
              `,
            },
          },
          security: {
            'access-control.cds': `
              using AdminService from '../srv/admin-service';
              
              annotate AdminService with @(requires: 'admin');
            `,
          },
        },
      });
    });

    it('should process an entire CDS project with access controls', () => {
      const result = processCdsProject('/', 'project');

      // Verify entities are parsed
      expect(result.entities.length).toBe(2);
      expect(result.entities.some(e => e.name === 'Products')).toBe(true);
      expect(result.entities.some(e => e.name === 'Categories')).toBe(true);

      // Verify services are parsed
      expect(result.services.length).toBe(2);
      const catalogService = result.services.find(s => s.name === 'CatalogService');
      const adminService = result.services.find(s => s.name === 'AdminService');

      expect(catalogService).toBeDefined();
      expect(adminService).toBeDefined();

      // Verify access controls are applied
      expect(
        catalogService?.annotations.some(
          a => a.name === 'requires' && a.value === 'authenticated-user',
        ),
      ).toBe(true);
      expect(
        adminService?.annotations.some(a => a.name === 'requires' && a.value === 'admin'),
      ).toBe(true);

      // Verify entity annotations are applied
      const productsInCatalog = catalogService?.entities.find(e => e.name === 'Products');
      expect(
        productsInCatalog?.annotations.some(a => a.name === 'readonly' && a.value === true),
      ).toBe(true);
    });
  });
});
