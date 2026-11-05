import { mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { dirname, resolve, relative } from 'path';

import * as tmp from 'tmp';

import {
  determineCdsFilesToCompile,
  getCdsDirectoryEntryPoint,
} from '../../../../src/cds/parser/functions';

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
  const savedFilters = process.env.LGTM_INDEX_FILTERS;
  let tempDir: string;
  let sourceRoot: string;
  let tmpCleanup: (() => void) | undefined;

  function createModelFiles(...files: string[]): void {
    for (const file of files) {
      const path = validateSafePath(sourceRoot, file);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, '');
    }
  }

  beforeEach(() => {
    delete process.env.LGTM_INDEX_FILTERS;
    // Create a secure temporary directory for each test
    const tmpObj = tmp.dirSync({ unsafeCleanup: true });
    tempDir = tmpObj.name;
    sourceRoot = tempDir;
    tmpCleanup = tmpObj.removeCallback;
  });

  afterEach(() => {
    if (savedFilters === undefined) delete process.env.LGTM_INDEX_FILTERS;
    else process.env.LGTM_INDEX_FILTERS = savedFilters;
    // Clean up temporary directory using tmp library's cleanup function
    if (tmpCleanup) {
      tmpCleanup();
    }
  });

  it('applies source filters to workflow compilation inputs', () => {
    process.env.LGTM_INDEX_FILTERS = 'exclude:ignored';
    const result = determineCdsFilesToCompile(sourceRoot, {
      projectDir: '.',
      cdsFiles: ['service.cds', 'ignored/feature.cds'],
    });
    expect(result.compilationTargets).toEqual(['service.cds']);
  });

  it.each(['srv/allowed.cds', 'srv/nested/allowed.cds'])(
    'does not compile excluded siblings of %s',
    selected => {
      const excluded = selected.replace('allowed.cds', 'excluded.cds');
      createModelFiles(selected, excluded);
      process.env.LGTM_INDEX_FILTERS = `include:${selected}`;

      const result = determineCdsFilesToCompile(sourceRoot, {
        projectDir: '.',
        cdsFiles: [selected, excluded],
      });

      expect(result.compilationTargets.map(file => file.replace(/\\/g, '/'))).toEqual([selected]);
    },
  );

  it.each([
    { filters: '', targets: ['db'] },
    { filters: 'include:*.cds', targets: ['db'] },
    { filters: 'include:**/*.cds', targets: ['db'] },
    { filters: 'exclude:unrelated', targets: ['db'] },
    {
      filters: 'include:db/**\ninclude:archive/old.cds',
      targets: ['db', 'archive/old.cds'],
    },
    {
      filters: 'include:db/**\ninclude:archive/**',
      targets: ['db', 'archive/old.cds'],
    },
    {
      filters: 'include:db/**\nexclude:archive\ninclude:archive/old.cds',
      targets: ['db', 'archive/old.cds'],
    },
    {
      filters: 'include:db/**\ninclude:archive/old.cds\nexclude:archive/old.cds',
      targets: ['db'],
    },
  ])(
    'adds archived CAP models only when explicitly selected ($filters)',
    ({ filters, targets }) => {
      createModelFiles('archive/old.cds', 'db/index.cds', 'db/schema.cds');
      process.env.LGTM_INDEX_FILTERS = filters;

      const result = determineCdsFilesToCompile(sourceRoot, {
        projectDir: '.',
        cdsFiles: ['archive/old.cds', 'db/index.cds', 'db/schema.cds'],
      });

      expect(result.compilationTargets.map(file => file.replace(/\\/g, '/'))).toEqual(targets);
    },
  );

  it('does not add unrelated descendants alongside root model files', () => {
    createModelFiles('archive/old.cds', 'service.cds');

    const result = determineCdsFilesToCompile(sourceRoot, {
      projectDir: '.',
      cdsFiles: ['archive/old.cds', 'service.cds'],
    });

    expect(result.compilationTargets).toEqual(['service.cds']);
  });

  it.each([
    { filters: '', targets: ['db'] },
    { filters: 'include:*.cds', targets: ['db'] },
    { filters: 'include:**/*.cds', targets: ['db'] },
    { filters: 'exclude:unrelated', targets: ['db'] },
    {
      filters: 'include:db/**\ninclude:extra.cds',
      targets: ['db', 'extra.cds'],
    },
    {
      filters: 'include:db/**\ninclude:extra.cds\nexclude:extra.cds',
      targets: ['db'],
    },
    { filters: 'include:extra.cds', targets: ['extra.cds'] },
  ])(
    'retains explicitly selected root models alongside CAP targets ($filters)',
    ({ filters, targets }) => {
      createModelFiles('db/schema.cds', 'extra.cds');
      process.env.LGTM_INDEX_FILTERS = filters;

      const result = determineCdsFilesToCompile(sourceRoot, {
        projectDir: '.',
        cdsFiles: ['db/schema.cds', 'extra.cds'],
      });

      expect(result.compilationTargets).toEqual(targets);
    },
  );

  it.each([
    {
      filters: 'include:db/**\ninclude:srv/**\ninclude:srv.cds',
      targets: ['db', 'srv'],
    },
    {
      filters: 'include:db/**\ninclude:srv.cds',
      targets: ['db', 'srv.cds'],
    },
  ])('does not duplicate selected sibling entry points ($filters)', ({ filters, targets }) => {
    createModelFiles('db/schema.cds', 'srv/service.cds', 'srv.cds');
    process.env.LGTM_INDEX_FILTERS = filters;

    const result = determineCdsFilesToCompile(sourceRoot, {
      projectDir: '.',
      cdsFiles: ['db/schema.cds', 'srv.cds', 'srv/service.cds'],
    });

    expect(result.compilationTargets).toEqual(targets);
  });

  it.each(['', 'include:**/*.cds', 'exclude:unrelated'])(
    'preserves the root index for a full selection: %s',
    filters => {
      createModelFiles('index.cds', 'db/schema.cds', 'archive/old.cds');
      process.env.LGTM_INDEX_FILTERS = filters;

      const result = determineCdsFilesToCompile(sourceRoot, {
        projectDir: '.',
        cdsFiles: ['index.cds', 'db/schema.cds', 'archive/old.cds'],
      });

      expect(result.compilationTargets).toEqual(['index.cds']);
    },
  );

  it('retains explicitly selected nested files alongside the root index', () => {
    createModelFiles('index.cds', 'db/schema.cds', 'archive/old.cds');
    process.env.LGTM_INDEX_FILTERS = 'include:index.cds\ninclude:archive/old.cds';

    const result = determineCdsFilesToCompile(sourceRoot, {
      projectDir: '.',
      cdsFiles: ['index.cds', 'db/schema.cds', 'archive/old.cds'],
    });

    expect(result.compilationTargets.map(file => file.replace(/\\/g, '/'))).toEqual([
      'index.cds',
      'archive/old.cds',
    ]);
  });

  it('retains selected CSN models alongside a partially selected root index', () => {
    createModelFiles(
      'index.cds',
      'db/schema.cds',
      'db/model.csn',
      'archive/old.cds',
      'archive/old.csn',
    );
    process.env.LGTM_INDEX_FILTERS = 'exclude:archive';

    const result = determineCdsFilesToCompile(sourceRoot, {
      projectDir: '.',
      cdsFiles: ['index.cds', 'db/schema.cds', 'archive/old.cds'],
    });

    expect(result.compilationTargets.map(file => file.replace(/\\/g, '/'))).toEqual([
      'index.cds',
      'db/schema.cds',
      'db/model.csn',
    ]);
  });

  it.each(
    ['csn.json', 'index.csn', 'schema.csn'].flatMap(model => [
      { filters: '', model, targets: ['service.cds', model] },
      { filters: 'exclude:**/*.cds', model, targets: [model] },
      { filters: 'include:**/*.csn', model, targets: ['service.cds', model] },
      { filters: `include:${model}`, model, targets: [model] },
      { filters: `include:${model}\nexclude:${model}`, model, targets: [] },
      { filters: 'include:service.cds', model, targets: ['service.cds'] },
    ]),
  )(
    'retains selected flat-project CSN inputs ($model, $filters)',
    ({ filters, model, targets }) => {
      createModelFiles('service.cds', model);
      process.env.LGTM_INDEX_FILTERS = filters;

      const result = determineCdsFilesToCompile(sourceRoot, {
        projectDir: '.',
        cdsFiles: ['service.cds'],
      });

      expect(result.compilationTargets).toEqual(targets);
      expect(result.csnFiles ?? []).toEqual(targets.filter(file => file === model));
    },
  );

  it.each([
    { filters: '', csnFiles: ['fts/csn.json', 'fts/feature.csn'] },
    { filters: 'include:*.csn', csnFiles: ['fts/csn.json', 'fts/feature.csn'] },
    { filters: 'include:**/*.csn', csnFiles: ['fts/csn.json', 'fts/feature.csn'] },
    { filters: 'exclude:unrelated', csnFiles: ['fts/csn.json', 'fts/feature.csn'] },
    {
      filters: 'include:db/schema.cds\ninclude:extra.csn\ninclude:fts/feature.csn',
      csnFiles: ['extra.csn', 'fts/feature.csn'],
    },
    { filters: 'include:db/**', csnFiles: [] },
    {
      filters: 'include:db/**\ninclude:extra.csn',
      csnFiles: ['extra.csn'],
    },
    {
      filters: 'include:db/**\ninclude:archive/**',
      csnFiles: ['archive/old.csn'],
    },
    {
      filters: 'include:db/**\ninclude:csn.json\ninclude:fts/csn.json',
      csnFiles: ['csn.json', 'fts/csn.json'],
    },
    { filters: 'exclude:fts', csnFiles: [] },
    {
      filters: 'include:db/**\ninclude:extra.csn\nexclude:extra.csn',
      csnFiles: [],
    },
    {
      filters: 'include:db/**\nexclude:extra.csn\ninclude:extra.csn',
      csnFiles: ['extra.csn'],
    },
    {
      filters: 'include:db/**\ninclude:fts/**\nexclude:fts/feature.csn',
      csnFiles: ['fts/csn.json'],
    },
  ])(
    'retains selected external CSN inputs alongside CAP targets ($filters)',
    ({ filters, csnFiles }) => {
      createModelFiles(
        'archive/old.csn',
        'csn.json',
        'db/schema.cds',
        'extra.csn',
        'fts/csn.json',
        'fts/feature.csn',
      );
      process.env.LGTM_INDEX_FILTERS = filters;

      const result = determineCdsFilesToCompile(sourceRoot, {
        projectDir: '.',
        cdsFiles: ['db/schema.cds'],
      });

      expect(result.compilationTargets.map(file => file.replace(/\\/g, '/'))).toEqual([
        'db',
        ...csnFiles,
      ]);
      expect(result.csnFiles?.map(file => file.replace(/\\/g, '/'))).toEqual(csnFiles);
    },
  );

  it.each(
    ['srv.csn', 'srv/index.csn', 'srv/csn.json'].flatMap(entry => [
      {
        entry,
        filters: `include:db/**\ninclude:${entry}`,
        targets: ['db', entry],
      },
      {
        entry,
        filters: 'include:db/**\ninclude:srv/**\ninclude:srv.csn',
        targets: ['db', 'srv'],
      },
    ]),
  )(
    'does not duplicate selected CSN entry points ($entry, $filters)',
    ({ entry, filters, targets }) => {
      createModelFiles('db/schema.cds', 'srv/service.cds', entry);
      process.env.LGTM_INDEX_FILTERS = filters;

      const result = determineCdsFilesToCompile(sourceRoot, {
        projectDir: '.',
        cdsFiles: ['db/schema.cds', 'srv/service.cds'],
      });

      expect(result.compilationTargets.map(file => file.replace(/\\/g, '/'))).toEqual(targets);
      expect(result.csnFiles?.map(file => file.replace(/\\/g, '/'))).toEqual([entry]);
    },
  );

  it.each([
    'child/schema.csn',
    'fts/child/feature.csn',
    'ignored.testproj/schema.csn',
    'node_modules/pkg/schema.csn',
  ])('does not add unowned or ignored external CSN input %s to CAP targets', model => {
    createModelFiles('db/schema.cds', model);
    process.env.LGTM_INDEX_FILTERS = `include:db/**\ninclude:${model}`;

    const result = determineCdsFilesToCompile(sourceRoot, {
      projectDir: '.',
      cdsFiles: ['db/schema.cds'],
      childProjectDirs: ['child', 'fts/child'],
    });

    expect(result.compilationTargets).toEqual(['db']);
    expect(result.csnFiles).toEqual([]);
  });

  it.each(['.', 'flat'])('retains source-root-relative CSN metadata for project %s', projectDir => {
    const prefix = projectDir === '.' ? '' : `${projectDir}/`;
    createModelFiles(`${prefix}service.cds`, `${prefix}schema.csn`);
    process.env.LGTM_INDEX_FILTERS = `include:${prefix}schema.csn`;

    const result = determineCdsFilesToCompile(sourceRoot, {
      projectDir,
      cdsFiles: [`${prefix}service.cds`],
    });

    expect(result.compilationTargets).toEqual(['schema.csn']);
    expect(result.csnFiles?.map(file => file.replace(/\\/g, '/'))).toEqual([`${prefix}schema.csn`]);
  });

  it.each([
    { filters: '', targets: ['service.cds', 'schema.csn', 'fts/feature.csn'] },
    {
      filters: 'include:**/*.csn',
      targets: ['service.cds', 'schema.csn', 'fts/feature.csn'],
    },
    {
      filters: 'exclude:unrelated',
      targets: ['service.cds', 'schema.csn', 'fts/feature.csn'],
    },
    {
      filters: 'include:service.cds\ninclude:archive/old.csn',
      targets: ['service.cds', 'archive/old.csn'],
    },
  ])(
    'does not opt unrelated descendants into flat CSN compilation ($filters)',
    ({ filters, targets }) => {
      createModelFiles('service.cds', 'schema.csn', 'archive/old.csn', 'fts/feature.csn');
      process.env.LGTM_INDEX_FILTERS = filters;

      const result = determineCdsFilesToCompile(sourceRoot, {
        projectDir: '.',
        cdsFiles: ['service.cds'],
      });

      expect(result.compilationTargets.map(file => file.replace(/\\/g, '/')).sort()).toEqual(
        [...targets].sort(),
      );
      expect(result.csnFiles?.map(file => file.replace(/\\/g, '/')).sort()).toEqual(
        targets.filter(file => file.endsWith('.csn')).sort(),
      );
    },
  );

  it.each(['child/schema.csn', 'ignored.testproj/schema.csn', 'node_modules/pkg/schema.csn'])(
    'does not compile unowned or ignored flat-project CSN input %s',
    model => {
      createModelFiles(model);
      process.env.LGTM_INDEX_FILTERS = `include:${model}`;

      const result = determineCdsFilesToCompile(sourceRoot, {
        projectDir: '.',
        cdsFiles: [],
        childProjectDirs: ['child'],
      });

      expect(result.compilationTargets).toEqual([]);
      expect(result.csnFiles ?? []).toEqual([]);
    },
  );

  it('retains CSN inputs alongside nested CDS inputs in the fallback plan', () => {
    createModelFiles('models/service.cds', 'models/schema.csn');

    const result = determineCdsFilesToCompile(sourceRoot, {
      projectDir: '.',
      cdsFiles: ['models/service.cds'],
    });

    expect(result.compilationTargets.map(file => file.replace(/\\/g, '/'))).toEqual([
      'models/service.cds',
      'models/schema.csn',
    ]);
    expect(result.csnFiles?.map(file => file.replace(/\\/g, '/'))).toEqual(['models/schema.csn']);
  });

  it('preserves flat root-index precedence while retaining CSN metadata', () => {
    createModelFiles('index.cds', 'schema.csn');

    const result = determineCdsFilesToCompile(sourceRoot, {
      projectDir: '.',
      cdsFiles: ['index.cds'],
    });

    expect(result.compilationTargets).toEqual(['index.cds']);
    expect(result.csnFiles).toEqual(['schema.csn']);
  });

  it.each(['csn.json', 'index.csn', 'schema.csn'])(
    'retains a CAP directory containing only %s',
    model => {
      createModelFiles(`db/${model}`, 'srv/service.cds');

      const result = determineCdsFilesToCompile(sourceRoot, {
        projectDir: '.',
        cdsFiles: ['srv/service.cds'],
      });

      expect(result.compilationTargets).toEqual(['db', 'srv']);
    },
  );

  it.each([
    { filters: 'include:db/**', model: 'csn.json', targets: ['db'] },
    { filters: 'include:db/**', model: 'index.csn', targets: ['db'] },
    { filters: 'include:db/**', model: 'schema.csn', targets: ['db'] },
    { filters: 'include:db/schema.csn', model: 'schema.csn', targets: ['db/schema.csn'] },
  ])(
    'retains db/$model when no CDS sources are selected ($filters)',
    ({ filters, model, targets }) => {
      createModelFiles(`db/${model}`, 'db/other.csn', 'srv/service.cds');
      process.env.LGTM_INDEX_FILTERS = filters;

      const result = determineCdsFilesToCompile(sourceRoot, {
        projectDir: '.',
        cdsFiles: ['srv/service.cds'],
      });

      expect(result.compilationTargets.map(file => file.replace(/\\/g, '/'))).toEqual(targets);
      expect(result.expectedOutputFile).toBe('model.cds.json');
    },
  );

  it('does not retain excluded CSN models when no CDS sources are selected', () => {
    createModelFiles('db/csn.json', 'srv/service.cds');
    process.env.LGTM_INDEX_FILTERS = 'include:db/**\nexclude:db/csn.json';

    const result = determineCdsFilesToCompile(sourceRoot, {
      projectDir: '.',
      cdsFiles: ['srv/service.cds'],
    });

    expect(result.compilationTargets).toEqual([]);
  });

  it('does not retain child-owned CSN models when no CDS sources are selected', () => {
    createModelFiles('db/child/csn.json');
    process.env.LGTM_INDEX_FILTERS = 'include:db/**';

    const result = determineCdsFilesToCompile(sourceRoot, {
      projectDir: '.',
      cdsFiles: [],
      childProjectDirs: ['db/child'],
    });

    expect(result.compilationTargets).toEqual([]);
  });

  it.each(['exclude:db', 'exclude:db/csn.json', 'include:srv/**'])(
    'does not retain an excluded CSN-only directory: %s',
    filters => {
      createModelFiles('db/csn.json', 'srv/service.cds');
      process.env.LGTM_INDEX_FILTERS = filters;

      const result = determineCdsFilesToCompile(sourceRoot, {
        projectDir: '.',
        cdsFiles: ['srv/service.cds'],
      });

      expect(result.compilationTargets).toEqual(['srv']);
    },
  );

  it.each(['srv.cds', 'srv.csn'])(
    'retains an empty CAP directory with the selected sibling entry point %s',
    entry => {
      mkdirSync(validateSafePath(sourceRoot, 'srv'));
      createModelFiles('db/schema.cds', entry);

      const result = determineCdsFilesToCompile(sourceRoot, {
        projectDir: '.',
        cdsFiles: ['db/schema.cds', ...(entry.endsWith('.cds') ? [entry] : [])],
      });

      expect(result.compilationTargets).toEqual(['db', 'srv']);
    },
  );

  it('selects only included CSN files from a partially selected directory', () => {
    createModelFiles('db/selected.csn', 'db/excluded.csn', 'srv/service.cds');
    process.env.LGTM_INDEX_FILTERS = 'exclude:db/excluded.csn';

    const result = determineCdsFilesToCompile(sourceRoot, {
      projectDir: '.',
      cdsFiles: ['srv/service.cds'],
    });

    expect(result.compilationTargets.map(file => file.replace(/\\/g, '/'))).toEqual([
      'db/selected.csn',
      'srv',
    ]);
  });

  it.each(['srv.cds', 'srv/index.csn'])(
    'does not compile an excluded directory entry point %s',
    entry => {
      createModelFiles('srv/service.cds', entry);
      process.env.LGTM_INDEX_FILTERS = `exclude:${entry}`;

      const result = determineCdsFilesToCompile(sourceRoot, {
        projectDir: '.',
        cdsFiles: ['srv/service.cds', ...(entry.endsWith('.cds') ? [entry] : [])],
      });

      expect(result.compilationTargets.map(file => file.replace(/\\/g, '/'))).toEqual([
        'srv/service.cds',
      ]);
    },
  );

  it('should resolve directory entry points in compiler precedence order', () => {
    const entries = ['srv.csn', 'srv.cds', 'srv/index.csn', 'srv/index.cds', 'srv/csn.json'];
    createModelFiles(...entries);

    for (const entry of entries) {
      expect(getCdsDirectoryEntryPoint(sourceRoot, 'srv')?.replace(/\\/g, '/')).toBe(entry);
      unlinkSync(validateSafePath(sourceRoot, entry));
    }
    expect(getCdsDirectoryEntryPoint(sourceRoot, 'srv')).toBeUndefined();
  });

  it.each(['srv/index.cds', 'srv/index.csn'])(
    'should preserve the effective CAP entry point %s without adding archived sources',
    entry => {
      createModelFiles('srv/service.cds', 'srv/archived/old.cds', entry);
      const cdsFiles = [
        'srv/service.cds',
        'srv/archived/old.cds',
        ...(entry.endsWith('.cds') ? [entry] : []),
      ];

      const result = determineCdsFilesToCompile(sourceRoot, { projectDir: '.', cdsFiles });

      expect(result.compilationTargets).toEqual(['srv']);
    },
  );

  it('should expand nested sources when there is no effective CAP entry point', () => {
    createModelFiles('srv/service.cds', 'srv/archived/old.cds');

    const result = determineCdsFilesToCompile(sourceRoot, {
      projectDir: '.',
      cdsFiles: ['srv/service.cds', 'srv/archived/old.cds'],
    });

    expect(result.compilationTargets.map(file => file.replace(/\\/g, '/'))).toEqual([
      'srv',
      'srv/archived/old.cds',
    ]);
  });

  it.each([
    ['include:srv/archived/old.cds', ['srv/archived/old.cds']],
    ['exclude:srv/service.cds', ['srv/index.cds', 'srv/archived/old.cds']],
  ])(
    'should retain explicit partial selections despite a CAP entry point: %s',
    (filters, expected) => {
      createModelFiles('srv/index.cds', 'srv/service.cds', 'srv/archived/old.cds');
      process.env.LGTM_INDEX_FILTERS = filters;

      const result = determineCdsFilesToCompile(sourceRoot, {
        projectDir: '.',
        cdsFiles: ['srv/index.cds', 'srv/service.cds', 'srv/archived/old.cds'],
      });

      expect(result.compilationTargets.map(file => file.replace(/\\/g, '/'))).toEqual(expected);
    },
  );

  it('should return all files when there is only one CDS file', () => {
    const project = {
      projectDir: '.',
      cdsFiles: ['service.cds'],
      imports: new Map(),
    };

    const result = determineCdsFilesToCompile(sourceRoot, project);

    expect(result.compilationTargets).toEqual(['service.cds']);
    expect(result.expectedOutputFile).toEqual('model.cds.json');
  });

  it('should return all files when there are no imports', () => {
    const project = {
      projectDir: '.',
      cdsFiles: ['service1.cds', 'service2.cds'],
      imports: new Map(),
    };

    const result = determineCdsFilesToCompile(sourceRoot, project);

    expect(result.compilationTargets).toEqual(['service1.cds', 'service2.cds']);
    expect(result.expectedOutputFile).toEqual('model.cds.json');
  });

  it('should return all files for non-CAP projects with imports (ProjectCompilationOnly)', () => {
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

    // Per ProjectCompilationOnly spec: non-CAP projects should compile all files
    expect(result.compilationTargets).toEqual(['service.cds', 'schema.cds']);
    expect(result.expectedOutputFile).toEqual('model.cds.json');
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

    // Per ProjectCompilationOnly spec: CAP projects should use ['db', 'srv'] directories
    expect(result.compilationTargets).toEqual(['db', 'srv']);
    expect(result.expectedOutputFile).toEqual('model.cds.json');
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

    // Per ProjectCompilationOnly spec: CAP projects should use ['db', 'srv'] directories
    expect(result.compilationTargets).toEqual(['db', 'srv']);
    expect(result.expectedOutputFile).toEqual('model.cds.json');
  });

  it('should return empty array when project has no CDS files', () => {
    const project = {
      projectDir: '.',
      cdsFiles: [],
      imports: new Map(),
    };

    const result = determineCdsFilesToCompile(sourceRoot, project);

    expect(result.compilationTargets).toEqual([]);
    expect(result.expectedOutputFile).toEqual('model.cds.json');
  });

  it('should fall back to all files when no imports map is provided', () => {
    const project = {
      projectDir: '.',
      cdsFiles: ['service1.cds', 'service2.cds'],
    };

    const result = determineCdsFilesToCompile(sourceRoot, project);

    expect(result.compilationTargets).toEqual(['service1.cds', 'service2.cds']);
    expect(result.expectedOutputFile).toEqual('model.cds.json');
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
    expect(result.compilationTargets).toEqual(['file1.cds', 'file2.cds']);
    expect(result.expectedOutputFile).toEqual('model.cds.json');
  });
});
