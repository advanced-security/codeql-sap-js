"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const mock_fs_1 = __importDefault(require("mock-fs"));
const functions_1 = require("../../../../src/cds/parser/functions");
(0, globals_1.describe)('Monorepo Support Tests', () => {
    (0, globals_1.afterEach)(() => {
        mock_fs_1.default.restore();
        (0, functions_1.clearFileCache)();
    });
    (0, globals_1.describe)('isLikelyCdsProject - Monorepo Detection', () => {
        (0, globals_1.it)('should identify monorepo root with workspaces as NOT a CDS project when it has no CDS content', () => {
            // Set up a monorepo root with workspaces but no CDS content
            (0, mock_fs_1.default)({
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
            (0, globals_1.expect)((0, functions_1.isLikelyCdsProject)('/monorepo')).toBe(false);
            (0, globals_1.expect)((0, functions_1.isLikelyCdsProject)('/monorepo/project1')).toBe(true);
            (0, globals_1.expect)((0, functions_1.isLikelyCdsProject)('/monorepo/project2')).toBe(true);
        });
        (0, globals_1.it)('should identify monorepo root as CDS project when it has actual CDS content despite having workspaces', () => {
            // Set up a monorepo root that is ALSO a CDS project
            (0, mock_fs_1.default)({
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
            (0, globals_1.expect)((0, functions_1.isLikelyCdsProject)('/monorepo')).toBe(true);
            (0, globals_1.expect)((0, functions_1.isLikelyCdsProject)('/monorepo/subproject')).toBe(true);
        });
        (0, globals_1.it)('should identify monorepo root as CDS project when it has direct CDS files despite having workspaces', () => {
            // Set up a monorepo root with direct CDS files
            (0, mock_fs_1.default)({
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
            (0, globals_1.expect)((0, functions_1.isLikelyCdsProject)('/monorepo')).toBe(true);
            (0, globals_1.expect)((0, functions_1.isLikelyCdsProject)('/monorepo/subproject')).toBe(true);
        });
        (0, globals_1.it)('should still identify regular CDS projects without workspaces', () => {
            // Regular CDS project without workspaces
            (0, mock_fs_1.default)({
                '/project/package.json': JSON.stringify({
                    name: 'regular-project',
                    dependencies: {
                        '@sap/cds': '^8.0.0',
                    },
                }),
                '/project/srv/service.cds': 'service MyService {}',
            });
            (0, globals_1.expect)((0, functions_1.isLikelyCdsProject)('/project')).toBe(true);
        });
    });
    (0, globals_1.describe)('determineCdsProjectsUnderSourceDir - Monorepo Support', () => {
        (0, globals_1.it)('should detect individual projects in monorepo but exclude monorepo root when it has no CDS content', () => {
            // Cloud CAP Samples-like structure
            (0, mock_fs_1.default)({
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
            const projects = (0, functions_1.determineCdsProjectsUnderSourceDir)('/workspace');
            (0, globals_1.expect)(projects).toHaveLength(2);
            (0, globals_1.expect)(projects).toContain('bookshop');
            (0, globals_1.expect)(projects).toContain('bookstore');
            (0, globals_1.expect)(projects).not.toContain('.');
        });
        (0, globals_1.it)('should include monorepo root when it has CDS content alongside workspace projects', () => {
            // Monorepo that is also a CDS project
            (0, mock_fs_1.default)({
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
            const projects = (0, functions_1.determineCdsProjectsUnderSourceDir)('/workspace');
            (0, globals_1.expect)(projects).toHaveLength(2);
            (0, globals_1.expect)(projects).toContain('.');
            (0, globals_1.expect)(projects).toContain('subproject');
        });
    });
});
//# sourceMappingURL=monorepo-support.test.js.map