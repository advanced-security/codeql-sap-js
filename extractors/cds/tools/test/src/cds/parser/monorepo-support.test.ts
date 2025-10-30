import { describe, it, expect, afterEach } from '@jest/globals';
import mockFs from 'mock-fs';

import {
  determineCdsProjectsUnderSourceDir,
  isLikelyCdsProject,
} from '../../../../src/cds/parser/functions';

describe('Monorepo Support Tests', () => {
  afterEach(() => {
    mockFs.restore();
  });

  describe('isLikelyCdsProject - Monorepo Detection', () => {
    it('should identify monorepo root with workspaces as NOT a CDS project when it has no CDS content', () => {
      // Set up a monorepo root with workspaces but no CDS content
      mockFs({
        '/monorepo/package.json': JSON.stringify({
          name: '@company/monorepo',
          dependencies: {
            '@sap/cds': '^8.0.0',
          },
          workspaces: ['./project1', './project2'],
        }),
        '/monorepo/project1/package.json': JSON.stringify({
          name: 'project1',
          dependencies: { '@sap/cds': '^8.0.0' },
        }),
        '/monorepo/project1/srv/service.cds': 'service MyService {}',
        '/monorepo/project2/package.json': JSON.stringify({
          name: 'project2',
          dependencies: { '@sap/cds': '^8.0.0' },
        }),
        '/monorepo/project2/db/model.cds': 'entity MyEntity {}',
      });

      expect(isLikelyCdsProject('/monorepo')).toBe(false);
      expect(isLikelyCdsProject('/monorepo/project1')).toBe(true);
      expect(isLikelyCdsProject('/monorepo/project2')).toBe(true);
    });

    it('should identify monorepo root as CDS project when it has actual CDS content despite having workspaces', () => {
      // Set up a monorepo root that is ALSO a CDS project
      mockFs({
        '/monorepo/package.json': JSON.stringify({
          name: '@company/monorepo',
          dependencies: {
            '@sap/cds': '^8.0.0',
          },
          workspaces: ['./subproject'],
        }),
        '/monorepo/srv/main-service.cds': 'service MainService {}',
        '/monorepo/subproject/package.json': JSON.stringify({
          name: 'subproject',
          dependencies: { '@sap/cds': '^8.0.0' },
        }),
        '/monorepo/subproject/srv/sub-service.cds': 'service SubService {}',
      });

      expect(isLikelyCdsProject('/monorepo')).toBe(true);
      expect(isLikelyCdsProject('/monorepo/subproject')).toBe(true);
    });

    it('should identify monorepo root as CDS project when it has direct CDS files despite having workspaces', () => {
      // Set up a monorepo root with direct CDS files
      mockFs({
        '/monorepo/package.json': JSON.stringify({
          name: '@company/monorepo',
          dependencies: {
            '@sap/cds': '^8.0.0',
          },
          workspaces: ['./subproject'],
        }),
        '/monorepo/schema.cds': 'namespace MySchema;',
        '/monorepo/subproject/package.json': JSON.stringify({
          name: 'subproject',
          dependencies: { '@sap/cds': '^8.0.0' },
        }),
        '/monorepo/subproject/srv/service.cds': 'service MyService {}',
      });

      expect(isLikelyCdsProject('/monorepo')).toBe(true);
      expect(isLikelyCdsProject('/monorepo/subproject')).toBe(true);
    });

    it('should still identify regular CDS projects without workspaces', () => {
      // Regular CDS project without workspaces
      mockFs({
        '/project/package.json': JSON.stringify({
          name: 'regular-project',
          dependencies: {
            '@sap/cds': '^8.0.0',
          },
        }),
        '/project/srv/service.cds': 'service MyService {}',
      });

      expect(isLikelyCdsProject('/project')).toBe(true);
    });
  });

  describe('determineCdsProjectsUnderSourceDir - Monorepo Support', () => {
    it('should detect individual projects in monorepo but exclude monorepo root when it has no CDS content', () => {
      // Cloud CAP Samples-like structure
      mockFs({
        '/workspace/package.json': JSON.stringify({
          name: '@company/samples',
          dependencies: {
            '@sap/cds': '^8.0.0',
          },
          workspaces: ['./bookshop', './bookstore'],
        }),
        '/workspace/bookshop/package.json': JSON.stringify({
          name: 'bookshop',
          dependencies: { '@sap/cds': '^8.0.0' },
        }),
        '/workspace/bookshop/srv/service.cds': 'service BookshopService {}',
        '/workspace/bookstore/package.json': JSON.stringify({
          name: 'bookstore',
          dependencies: { '@sap/cds': '^8.0.0' },
        }),
        '/workspace/bookstore/srv/service.cds': 'service BookstoreService {}',
      });

      const projects = determineCdsProjectsUnderSourceDir('/workspace');

      expect(projects).toHaveLength(2);
      expect(projects).toContain('bookshop');
      expect(projects).toContain('bookstore');
      expect(projects).not.toContain('.');
    });

    it('should include monorepo root when it has CDS content alongside workspace projects', () => {
      // Monorepo that is also a CDS project
      mockFs({
        '/workspace/package.json': JSON.stringify({
          name: '@company/samples',
          dependencies: {
            '@sap/cds': '^8.0.0',
          },
          workspaces: ['./subproject'],
        }),
        '/workspace/srv/main-service.cds': 'service MainService {}',
        '/workspace/subproject/package.json': JSON.stringify({
          name: 'subproject',
          dependencies: { '@sap/cds': '^8.0.0' },
        }),
        '/workspace/subproject/srv/sub-service.cds': 'service SubService {}',
      });

      const projects = determineCdsProjectsUnderSourceDir('/workspace');

      expect(projects).toHaveLength(2);
      expect(projects).toContain('.');
      expect(projects).toContain('subproject');
    });
  });
});
