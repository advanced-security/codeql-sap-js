import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  determineCdsFilesToCompile,
  normalizeLocationPathsInFile,
  runCdsCompiler,
  setSourceRootDirectory,
} from '../dist/compile-test-cds-lib.cjs';

const tools = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const launcher = resolve(tools, '../../javascript/tools/pre-finalize.sh');
const ui5 = resolve(tools, '../../javascript/tools/index-ui5.js');
const cds = process.env.CDS_COMMAND || 'cds';

function temporaryDirectory(t) {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'extractor-integration-')));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function writeTree(root, files) {
  for (const [file, content] of Object.entries(files)) {
    const path = join(root, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
}

function filesUnder(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

function compile(root, filters = '') {
  setSourceRootDirectory(root);
  const previous = process.env.LGTM_INDEX_FILTERS;
  let plan;
  try {
    process.env.LGTM_INDEX_FILTERS = filters;
    plan = determineCdsFilesToCompile(root, {
      cdsFiles: filesUnder(root)
        .filter(file => file.endsWith('.cds'))
        .map(file => relative(root, file)),
      projectDir: '.',
    });
  } finally {
    if (previous === undefined) delete process.env.LGTM_INDEX_FILTERS;
    else process.env.LGTM_INDEX_FILTERS = previous;
  }
  const result = runCdsCompiler(root, plan.compilationTargets, [cds]);
  assert.equal(result.status, 0, result.error?.message || result.stderr?.toString());
  const output = join(root, 'model.cds.json');
  normalizeLocationPathsInFile(output);
  return { model: JSON.parse(readFileSync(output, 'utf8')), output, plan };
}

const capSources = {
  'db/schema.cds': 'namespace sample; entity Books { key ID: Integer; }',
  'srv/service.cds':
    "using { sample } from '../db/schema'; service CatalogService { entity Books as projection on sample.Books; }",
};

for (const generated of [
  'srv/src/main/resources/edmx/csn.json',
  'srv/target/classes/edmx/csn.json',
  'gen/srv/srv/csn.json',
]) {
  test(`real CDS compilation ignores generated ${generated}`, t => {
    const root = temporaryDirectory(t);
    writeTree(root, capSources);
    const csn = execFileSync(cds, ['compile', 'db', 'srv', '--to', 'json', '--locations'], {
      cwd: root,
      encoding: 'utf8',
    });
    writeTree(root, { [generated]: csn });

    const { model, plan } = compile(root, generated.startsWith('gen/') ? 'include:**' : '');

    assert.deepEqual(plan.compilationTargets, ['db', 'srv']);
    assert.deepEqual(plan.csnFiles, []);
    assert.ok(model.definitions['CatalogService.Books']);
  });
}

test('real CDS compilation preserves a root index when test fixtures are excluded', t => {
  const root = temporaryDirectory(t);
  writeTree(root, {
    ...capSources,
    'index.cds': "using from './db/schema'; using from './srv/service';",
    'srv/service-v2.cds': 'service CatalogService {}',
    'test/fixture.cds': 'entity TestFixture { key ID: Integer; }',
  });

  const { model, plan } = compile(root, 'exclude:test');

  assert.deepEqual(plan.compilationTargets, ['index.cds']);
  assert.ok(model.definitions['CatalogService.Books']);
  assert.equal(model.definitions.TestFixture, undefined);
});

for (const entry of [false, true]) {
  test(`real CDS compilation does not load archived services (directory index: ${entry})`, t => {
    const root = temporaryDirectory(t);
    writeTree(root, {
      ...capSources,
      'srv/archive/old.cds': 'service CatalogService {}',
      'srv/test/fixture.cds': 'service TestFixture {}',
      ...(entry ? { 'srv/index.cds': "using from './service';" } : {}),
    });

    const { model, plan } = compile(root, 'exclude:srv/test');

    assert.deepEqual(plan.compilationTargets, ['db', 'srv']);
    assert.ok(model.definitions['CatalogService.Books']);
    assert.equal(model.definitions.TestFixture, undefined);
  });
}

test('large real CDS compilations are reproducible and retain real source locations', t => {
  const root = temporaryDirectory(t);
  const sources = Object.fromEntries(
    Array.from({ length: 80 }, (_, i) => [
      `entity-with-a-long-filename-${i}.cds`,
      `entity Entity${i} { key ID: Integer; }`,
    ]),
  );
  writeTree(root, sources);
  assert.ok(Object.keys(sources).join(' ').length > 1024);

  const first = compile(root);
  const content = readFileSync(first.output, 'utf8');
  const second = compile(root);

  assert.equal(readFileSync(second.output, 'utf8'), content);
  assert.equal(content.includes('.codeql-cds-'), false);
  assert.equal(Object.keys(first.model.definitions).length, 80);
  assert.ok(Object.hasOwn(sources, first.model.definitions.Entity0.$location.file));
  assert.equal(
    readdirSync(root).some(file => file.startsWith('.codeql-cds-')),
    false,
  );
});

const posixOnly = { skip: process.platform === 'win32' };

function initializeDatabase(root, database) {
  const info = JSON.parse(
    execFileSync('codeql', ['version', '--format=json'], { encoding: 'utf8' }),
  );
  const codeql = join(
    info.unpackedLocation,
    process.platform === 'win32' ? 'codeql.exe' : 'codeql',
  );
  execFileSync(codeql, [
    'database',
    'init',
    '--language=javascript',
    `--source-root=${root}`,
    database,
  ]);
  return {
    ...process.env,
    CODEQL_DIST: info.unpackedLocation,
    CODEQL_EXTRACTOR_CDS_SKIP_EXTRACTION: '1',
    CODEQL_EXTRACTOR_JAVASCRIPT_WIP_DATABASE: database,
  };
}

function archivedFiles(root, database) {
  const archive = join(database, 'src', root.replace(/^\/+/, ''));
  assert.ok(existsSync(archive), 'XML indexing must archive the selected source files');
  return filesUnder(archive)
    .map(file => relative(archive, file))
    .sort();
}

test(
  'real CodeQL indexes literal UI5 filenames and honors ordered source filters',
  posixOnly,
  async t => {
    const names = [
      'webapp/Main[1].view.xml',
      'webapp/Main1.view.xml',
      'webapp/Main?.fragment.xml',
      'webapp/MainA.fragment.xml',
      'webapp/Main space.view.xml',
      'webapp/Main*.view.xml',
      'webapp/Main\\Panel.view.xml',
      'webapp/!Main.view.xml',
      'webapp/Main"quote.view.xml',
      'webapp/#Main.view.xml',
      'webapp/$Main.view.xml',
      'webapp/Gr\u00fc\u00dfe.view.xml',
      'excluded/Secret.fragment.xml',
      'outside/Other.view.xml',
    ];
    for (const [filters, expected] of [
      ['', names],
      ['include:**/*.json', names],
      ['include:webapp', names.filter(file => file.startsWith('webapp/'))],
      ['exclude:excluded', names.filter(file => !file.startsWith('excluded/'))],
      ['include:webapp/Main[1].view.xml', ['webapp/Main[1].view.xml']],
      ['exclude:webapp/Main[1].view.xml', names.filter(file => file !== 'webapp/Main[1].view.xml')],
      ['include:webapp/Main?.fragment.xml', ['webapp/Main?.fragment.xml']],
      [
        'include:webapp\nexclude:webapp/**\ninclude:webapp/Main[1].view.xml',
        ['webapp/Main[1].view.xml'],
      ],
    ]) {
      await t.test(filters || 'no filters', t => {
        const directory = temporaryDirectory(t);
        const root = join(directory, 'source');
        const database = join(directory, 'database');
        writeTree(
          root,
          Object.fromEntries(
            [...names, 'node_modules/ignored/Ignored.view.xml'].map(file => [file, '<View/>']),
          ),
        );
        const env = initializeDatabase(root, database);

        execFileSync(process.execPath, [ui5], {
          cwd: root,
          env: { ...env, LGTM_INDEX_FILTERS: filters },
        });

        // CodeQL normalizes backslashes in its source archive, including on POSIX.
        assert.deepEqual(
          archivedFiles(root, database),
          expected.map(file => file.replace(/\\/g, '/')).sort(),
        );
      });
    }
  },
);

test(
  'real CodeQL retains legacy UI5 indexing when only the launcher is installed',
  posixOnly,
  t => {
    const directory = temporaryDirectory(t);
    const root = join(directory, 'source');
    const database = join(directory, 'database');
    const standalone = join(directory, 'pre-finalize.sh');
    writeTree(root, { 'Main.view.xml': '<View/>', 'Detail.fragment.xml': '<Fragment/>' });
    writeFileSync(standalone, readFileSync(launcher));
    const env = initializeDatabase(root, database);

    execFileSync('/bin/bash', [standalone], { cwd: root, env });

    assert.deepEqual(archivedFiles(root, database), ['Detail.fragment.xml', 'Main.view.xml']);
  },
);

test(
  'real CodeQL indexes UI5 without Node.js on PATH',
  {
    skip:
      process.platform === 'win32' ||
      spawnSync('/bin/sh', ['-c', 'command -v node'], { env: { PATH: '/usr/bin:/bin' } }).status ===
        0,
  },
  t => {
    const directory = temporaryDirectory(t);
    const root = join(directory, 'source');
    const database = join(directory, 'database');
    writeTree(root, { 'Main.view.xml': '<View/>' });
    const env = initializeDatabase(root, database);

    execFileSync('/bin/bash', [launcher], { cwd: root, env: { ...env, PATH: '/usr/bin:/bin' } });

    assert.deepEqual(archivedFiles(root, database), ['Main.view.xml']);
  },
);

for (const scenario of [
  { name: 'normal execution', helper: true },
  { name: 'missing Node.js', helper: true, noNode: true },
  { name: 'missing helper', helper: false },
  { name: 'helper CLI failure', helper: true, failure: true },
  { name: 'legacy CLI failure', helper: false, failure: true },
]) {
  test(`Windows launcher smoke: ${scenario.name}`, { skip: process.platform !== 'win32' }, t => {
    const directory = join(temporaryDirectory(t), 'launcher with spaces');
    const root = join(directory, 'source');
    const database = join(directory, 'database');
    const scripts = join(directory, 'tools');
    const windowsLauncher = join(scripts, 'pre-finalize.cmd');
    writeTree(root, {
      'webapp/Main[1].view.xml': '<View/>',
      'webapp/Main1.view.xml': '<View/>',
      'webapp/Detail.fragment.xml': '<Fragment/>',
    });
    writeTree(scripts, {
      'pre-finalize.cmd': readFileSync(resolve(tools, '../../javascript/tools/pre-finalize.cmd')),
      ...(scenario.helper ? { 'index-ui5.js': readFileSync(ui5) } : {}),
    });
    const env = initializeDatabase(root, database);
    env.LGTM_INDEX_FILTERS = 'include:webapp/Main[1].view.xml';

    if (scenario.noNode) {
      assert.ok(process.env.SystemRoot, 'Windows smoke tests require SystemRoot');
      for (const key of Object.keys(env)) {
        if (key.toLowerCase() === 'path') delete env[key];
      }
      env.Path = join(process.env.SystemRoot, 'System32');
      const lookup = spawnSync(join(env.Path, 'where.exe'), ['node'], { cwd: root, env });
      assert.equal(lookup.status, 1, 'Node.js must be absent from the smoke-test PATH');
    }
    if (scenario.failure) {
      env.CODEQL_EXTRACTOR_JAVASCRIPT_WIP_DATABASE = join(directory, 'missing database');
    }

    const result = spawnSync(
      process.env.ComSpec || 'cmd.exe',
      ['/d', '/s', '/c', `call "${windowsLauncher}"`],
      { cwd: root, encoding: 'utf8', env, timeout: 60_000, windowsVerbatimArguments: true },
    );

    assert.equal(
      result.status,
      scenario.failure ? (scenario.helper ? 1 : 2) : 0,
      result.error?.message || result.stderr || result.stdout,
    );
    if (scenario.failure) {
      assert.match(result.stdout, /failed with exit code/);
      assert.doesNotMatch(result.stdout, /Finished running database index-files for UI5/);
    } else {
      const indexed = filesUnder(join(database, 'src'))
        .filter(file => file.endsWith('.xml'))
        .map(file => basename(file))
        .sort();
      assert.deepEqual(
        indexed,
        scenario.helper && !scenario.noNode
          ? ['Main[1].view.xml']
          : ['Detail.fragment.xml', 'Main1.view.xml', 'Main[1].view.xml'],
      );
    }
    if (!scenario.helper || scenario.noNode) {
      assert.match(result.stderr, /Warning:.*legacy UI5 indexing/);
    } else {
      assert.doesNotMatch(result.stderr, /Warning:.*legacy UI5 indexing/);
    }
  });
}
