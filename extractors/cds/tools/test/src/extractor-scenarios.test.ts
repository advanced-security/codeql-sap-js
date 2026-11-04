import * as childProcess from 'child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'fs';
import { delimiter, dirname, join, relative } from 'path';

import * as tmp from 'tmp';

import { buildCdsProjectDependencyGraph } from '../../src/cds/parser/graph';
import { runJavaScriptExtractionWithMarker } from '../../src/codeql';
import { cdsExtractorMarkerFileName } from '../../src/constants';
import { cacheInstallDependencies } from '../../src/packageManager';
import { clearPathsIgnoreCache } from '../../src/paths-ignore';

jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  execFileSync: jest.fn(),
  execSync: jest.fn(),
  spawnSync: jest.fn(() => ({ status: 0 })),
}));

function writeTree(root: string, files: Record<string, string>): void {
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
}

const capPackageJson = (cds: string): string =>
  JSON.stringify({ name: 'p', dependencies: { '@sap/cds': cds } });

describe('CDS extractor end-to-end scenarios', () => {
  let root: string;
  let cleanup: () => void;
  const savedEnv = { ...process.env };

  beforeEach(() => {
    const dir = tmp.dirSync({ unsafeCleanup: true });
    root = realpathSync(dir.name);
    cleanup = dir.removeCallback;
    clearPathsIgnoreCache();
    delete process.env.LGTM_INDEX_FILTERS;
  });

  afterEach(() => {
    cleanup();
    process.env = { ...savedEnv };
  });

  it('bounds workflow compiler arguments while retaining all selected sources', () => {
    const sources = Array.from(
      { length: 400 },
      (_, i) => `db/nested/entity-${String(i).padStart(3, '0')}.cds`,
    );
    const projectDir = join(root, 'project');
    const invocationPath = join(root, 'invocation.json');
    const shimPath = join(root, 'bin', 'npx.cjs');
    writeTree(root, {
      'bin/npx.cjs': `const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
const target = args[args.indexOf('compile') + 1];
const entry = path.join(process.cwd(), target);
fs.writeFileSync(${JSON.stringify(invocationPath)}, JSON.stringify({
  args,
  content: fs.readFileSync(entry, 'utf8'),
  entry,
}));
fs.writeFileSync('model.cds.json', '{}');
`,
      'bin/npx': `#!/usr/bin/env node\nrequire(${JSON.stringify(shimPath)});\n`,
      'bin/npx.cmd': `@echo off\r\n"${process.execPath}" "${shimPath}" %*\r\n`,
      'project/model.expected': '',
      'project/package.json': capPackageJson('^8'),
      'project/db/schema.cds': 'entity Root { key ID: Integer; }',
      ...Object.fromEntries(
        sources.map((source, i) => [`project/${source}`, `entity Entity${i} { key ID: Integer; }`]),
      ),
    });
    chmodSync(join(root, 'bin', 'npx'), 0o755);

    const output = jest
      .requireActual<typeof childProcess>('child_process')
      .execFileSync(
        process.execPath,
        [join(__dirname, '../../workflow/compile-test-cds.mjs'), root],
        {
          encoding: 'utf8',
          env: {
            ...process.env,
            LGTM_INDEX_FILTERS: '',
            PATH: `${join(root, 'bin')}${delimiter}${process.env.PATH ?? ''}`,
          },
        },
      );

    const invocation = JSON.parse(readFileSync(invocationPath, 'utf8')) as {
      args: string[];
      content: string;
      entry: string;
    };
    expect(sources.join(' ').length).toBeGreaterThan(8191);
    expect(invocation.args.join(' ').length).toBeLessThan(8191);
    expect(invocation.content).toContain("using from './db/schema.cds';");
    for (const source of sources) {
      expect(invocation.content).toContain(`using from './${source}';`);
    }
    expect(existsSync(invocation.entry)).toBe(false);
    expect(existsSync(join(projectDir, 'model.cds.json'))).toBe(true);
    expect(output).toContain('Generated model.cds.json');
  });

  describe('source filters through JavaScript extraction', () => {
    const appAFiles = ['app-a/model.cds.json', 'app-a/srv/service.cds'];
    const appBFiles = ['app-b/model.cds.json', 'app-b/srv/service.cds'];
    const allCdsFiles = ['app-a/db/schema.cds', ...appAFiles, ...appBFiles];

    it.each([
      ['exclude:**/*.*\ninclude:**/*.cds', allCdsFiles],
      ['exclude:**\ninclude:**/*.cds', allCdsFiles],
      ['include:**/*.json', [...allCdsFiles, 'vendor/model.cds.json']],
      ['include:app-a\ninclude:**', [...allCdsFiles, 'vendor/model.cds.json']],
      ['', ['**/*.cds', '**/*.cds.json']],
      ['exclude:app-a\ninclude:app-a/srv/*.cds', appAFiles],
      ['include:app-a\nexclude:app-a/db', appAFiles],
      ['include:app-a\ninclude:app-b\nexclude:app-b', ['app-a/db/schema.cds', ...appAFiles]],
      ['include:app-*/srv/*.cds', [...appAFiles, ...appBFiles]],
      ['include:**/*.cds\nexclude:app-a', [...appBFiles, 'vendor/model.cds.json']],
      ['include:**/*.cds\nexclude:**/*.cds.json', allCdsFiles.filter(p => p.endsWith('.cds'))],
      ['exclude:**/*.cds.json\ninclude:**/*.cds', allCdsFiles],
      ['exclude:**/*.*', []],
    ])('preserves source and output selection through extraction for %s', (filters, expected) => {
      writeTree(root, {
        'app-a/db/schema.cds': 'entity Books {}',
        'app-a/model.cds.json': '{}',
        'app-a/package.json': capPackageJson('^9'),
        'app-a/srv/service.cds': 'service A {}',
        'app-a/src/index.js': 'console.log("not CDS");',
        'app-a/webapp/manifest.json': '{}',
        'app-b/model.cds.json': '{}',
        'app-b/package.json': capPackageJson('^9'),
        'app-b/srv/service.cds': 'service B {}',
        'node_modules/cds-extractor-marker.js': 'console.log("not the root marker");',
        'vendor/model.cds.json': '{}',
      });

      process.env.LGTM_INDEX_FILTERS = filters;
      const graph = buildCdsProjectDependencyGraph(root);

      expect(
        runJavaScriptExtractionWithMarker(root, '/mock/autobuild.sh', '/mock/codeql', graph),
      ).toBe(true);
      expect(process.env.LGTM_INDEX_FILTERS?.split('\n')).toEqual([
        'exclude:**/*.*',
        ...[...expected].sort().map(file => `include:${file}`),
        'exclude:**/node_modules/**/*.*',
        `include:${cdsExtractorMarkerFileName}`,
      ]);
    });

    it.each([false, true])(
      'retains directory outputs, respecting later exclusions: %s',
      exclude => {
        writeTree(root, {
          'package.json': capPackageJson('^9'),
          'srv/service.cds': 'service A {}',
          'model.cds.json/A.cds.json': '{}',
          'model.cds.json/nested/B.cds.json': '{}',
        });
        process.env.LGTM_INDEX_FILTERS =
          'include:srv/**' + (exclude ? '\nexclude:model.cds.json/nested/**' : '');

        runJavaScriptExtractionWithMarker(
          root,
          '/mock/autobuild.sh',
          '/mock/codeql',
          buildCdsProjectDependencyGraph(root),
        );

        expect(process.env.LGTM_INDEX_FILTERS).toContain('include:model.cds.json/A.cds.json');
        expect(
          process.env.LGTM_INDEX_FILTERS?.includes('include:model.cds.json/nested/B.cds.json'),
        ).toBe(!exclude);
      },
    );
  });

  describe('paths and paths-ignore from LGTM_INDEX_FILTERS', () => {
    (process.platform === 'win32' ? describe.skip : describe)('pre-finalize.sh', () => {
      it.each([
        ['include:app-a', ['--also-match=**', '--also-match=app-a']],
        [
          'include:app-a\nexclude:vendor',
          ['--also-match=**', '--also-match=app-a', '--also-match=!vendor'],
        ],
        ['include:**/*.json', ['--also-match=**', '--also-match=**/*.json']],
        ['include:*.json', ['--also-match=**', '--also-match=*.json']],
        [
          'exclude:**/*.*\ninclude:**/*.view.xml',
          ['--also-match=**', '--also-match=!**/*.*', '--also-match=**/*.view.xml'],
        ],
        [
          'exclude:**/*.*\ninclude:**/*.fragment.xml',
          ['--also-match=**', '--also-match=!**/*.*', '--also-match=**/*.fragment.xml'],
        ],
        ['exclude:vendor', ['--also-match=**', '--also-match=!vendor']],
        [
          'exclude:app-a/**\ninclude:app-a/webapp/**',
          ['--also-match=**', '--also-match=!app-a/**', '--also-match=app-a/webapp/**'],
        ],
        ['include:app-a\ninclude:**', ['--also-match=**', '--also-match=app-a', '--also-match=**']],
        [
          'include:app-a\ninclude:**/*.view.xml',
          ['--also-match=**', '--also-match=app-a', '--also-match=**/*.view.xml'],
        ],
        [
          'include:**/*.json\r\ninclude:app-*/webapp/**\r\nexclude:vendor\r\n',
          [
            '--also-match=**',
            '--also-match=**/*.json',
            '--also-match=app-*/webapp/**',
            '--also-match=!vendor',
          ],
        ],
      ])('preserves ordered XML filters for %s', (filters, expected) => {
        const argsLog = join(root, 'args.log');
        writeTree(root, {
          'app-a/webapp/Main.view.xml': '<View/>',
          'app-b/webapp/Main.view.xml': '<View/>',
          'dist/codeql': `#!/usr/bin/env node
const fs = require('fs');
const raw = process.argv.slice(2);
const args = [...raw.slice(0, 2), ...fs.readFileSync(raw[2].slice(1), 'utf8').trim().split('\\n').map(line => JSON.parse(line))];
if (args[0] === 'resolve') {
  const large = process.env.UI5_TEST_LARGE_LIST === 'true';
  const files = large ? Array.from({length: 12000}, (_, i) => ${JSON.stringify(join(root, 'app-a/webapp/'))} + 'view'.repeat(30) + i + '.view.xml') : ${JSON.stringify(['app-a', 'app-b'].map(app => join(root, app, 'webapp/Main.view.xml')))};
  const selected = !large && args.some(arg => arg.startsWith('--also-match=app-a')) ? files.slice(0, 1) : files;
  fs.writeFileSync(${JSON.stringify(argsLog)}, JSON.stringify({ query: args, files: selected }));
  console.log(JSON.stringify(selected));
} else {
  const log = JSON.parse(fs.readFileSync(${JSON.stringify(argsLog)}, 'utf8'));
  log.args = args.slice(2);
  fs.writeFileSync(${JSON.stringify(argsLog)}, JSON.stringify(log));
}
`,
        });
        chmodSync(join(root, 'dist/codeql'), 0o755);
        jest
          .requireActual<typeof childProcess>('child_process')
          .execFileSync('bash', [join(__dirname, '../../../../javascript/tools/pre-finalize.sh')], {
            cwd: root,
            env: {
              ...process.env,
              CODEQL_DIST: join(root, 'dist'),
              CODEQL_EXTRACTOR_CDS_SKIP_EXTRACTION: '1',
              CODEQL_EXTRACTOR_JAVASCRIPT_WIP_DATABASE: join(root, 'db'),
              LGTM_INDEX_FILTERS: filters,
              UI5_TEST_LARGE_LIST: String(filters === 'include:app-a'),
            },
            stdio: 'ignore',
          });
        const { args, query, files } = JSON.parse(readFileSync(argsLog, 'utf8')) as {
          args: string[];
          query: string[];
          files: string[];
        };
        expect(query).toContain('--include-extension=.view.xml');
        expect(query).toContain('--include-extension=.fragment.xml');
        expect(query.filter(arg => arg.startsWith('--also-match='))).toEqual(
          expected
            .slice(1)
            .filter(
              arg => !arg.startsWith('--also-match=!') && !/=(?:\*\*\/)?\*\.[^/]+$/.test(arg),
            ),
        );
        expect(args.filter(arg => arg.startsWith('--include='))).toEqual(
          files.map(file => `--include=${relative(root, file).replace(/\\/g, '/')}`),
        );
        expect(
          args.filter(arg => arg.startsWith('--also-match=') || arg.startsWith('--exclude=')),
        ).toEqual(expected);
      });
    });
  });

  describe('cache dependency versions with min-release-age', () => {
    it('pins @sap/cds and @sap/cds-dk to the versions in package-lock.json', () => {
      writeTree(root, {
        'package.json': capPackageJson('^10.0.6'),
        'package-lock.json': JSON.stringify({
          lockfileVersion: 3,
          packages: {
            'node_modules/@sap/cds': { version: '10.0.6' },
            'node_modules/@sap/cds-dk': { version: '10.0.5' },
          },
        }),
        '.npmrc': 'min-release-age=7\n',
        'srv/service.cds': 'service S {}',
      });
      // Registry already lists versions newer than the lockfile (inside the hold window).
      (childProcess.execSync as jest.Mock).mockReturnValue(
        JSON.stringify(['10.0.5', '10.0.6', '10.1.0', '10.1.1']),
      );

      const graph = buildCdsProjectDependencyGraph(root);
      cacheInstallDependencies(graph, root);

      const cacheRoot = join(root, '.cds-extractor-cache');
      const [cacheDir] = readdirSync(cacheRoot);
      const cachePkg = JSON.parse(readFileSync(join(cacheRoot, cacheDir, 'package.json'), 'utf8'));
      expect(cachePkg.dependencies).toMatchObject({
        '@sap/cds': '10.0.6',
        '@sap/cds-dk': '10.0.5',
      });
    });
  });

  it('does not report dependency installation failure before compilation can fall back', () => {
    const src = readFileSync(join(__dirname, '../../cds-extractor.ts'), 'utf8');
    expect(src).not.toContain('addDependencyInstallationDiagnostic(');
  });

  describe('CAP Java backend with JS UI workspaces in one repository', () => {
    it('does not compile a standard directory owned by a child project', () => {
      writeTree(root, {
        'package.json': JSON.stringify({ workspaces: ['app/*'] }),
        'srv/root.cds': 'service Root {}',
        'db/pom.xml': '<project/>',
        'db/schema.cds': 'entity Child {}',
      });
      const graph = buildCdsProjectDependencyGraph(root);
      expect([...graph.projects.keys()]).toEqual(['.', 'db']);
      expect(graph.projects.get('.')?.compilationTargets).toEqual(['srv']);
    });
    it.each([
      [false, 'schema.cds'],
      [true, 'schema.cds'],
      [true, 'model/schema.cds'],
    ] as const)(
      'requires explicit nested project boundaries (Maven: %s, model: %s)',
      (maven, schema) => {
        writeTree(root, {
          'pom.xml': '<project/>',
          'package.json': JSON.stringify({ workspaces: ['app/*'] }),
          'db/model/schema.cds': 'entity Books {}',
          'db/model/common/types.cds': 'type Code : String(10);',
          'db/view/views.cds': "using from '../model/schema';",
          'fts/feature-a/flag.cds': "using from '../../db/model/schema';",
          'srv/cds/api/service.cds': 'service Root {}',
          'app/ui-a/package.json': '{}',
          [`backend/db/${schema}`]: 'entity Other {}',
          ...(maven ? { 'backend/pom.xml': '<project/>' } : {}),
        });
        const graph = buildCdsProjectDependencyGraph(root);
        expect([...graph.projects.keys()]).toEqual(maven ? ['.', 'backend'] : ['.']);
        expect(
          graph.projects.get('backend')?.compilationTargets.map(file => file.replace(/\\/g, '/')),
        ).toEqual(maven ? (schema.includes('/') ? ['db', `db/${schema}`] : ['db']) : undefined);
        expect(
          graph.projects.get('.')?.compilationTargets.map(file => file.replace(/\\/g, '/')),
        ).toContain('fts/feature-a/flag.cds');
        expect(
          graph.projects
            .get('.')
            ?.cdsFiles.some(file => file.replace(/\\/g, '/') === `backend/db/${schema}`),
        ).toBe(!maven);
      },
    );
  });
});
