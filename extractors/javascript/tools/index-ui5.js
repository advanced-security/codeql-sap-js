const { execFileSync } = require('child_process');
const {
  closeSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require('fs');
const { tmpdir } = require('os');
const { join, relative } = require('path');

const codeql = join(
  process.env.CODEQL_DIST,
  process.platform === 'win32' ? 'codeql.exe' : 'codeql',
);
const database = process.env.CODEQL_EXTRACTOR_JAVASCRIPT_WIP_DATABASE;
if (!database) {
  throw new Error('CODEQL_EXTRACTOR_JAVASCRIPT_WIP_DATABASE is required');
}
const filters = (process.env.LGTM_INDEX_FILTERS || '')
  .split(/\r?\n/)
  .flatMap((line) => {
    const match = /^(include|exclude):\s*(.*?)\s*$/.exec(line);
    return match?.[2] ? [[match[1], match[2]]] : [];
  });
const scope = filters.filter(
  ([kind, pattern]) =>
    kind === 'include' && !/^(?:\*\*\/)?\*\.[^/]+$/.test(pattern),
);
const prune = ['--prune=**/node_modules/**/*', '--prune=**/.eslint/**/*'];

const temp = mkdtempSync(join(tmpdir(), 'codeql-ui5-'));
try {
  const argfile = join(temp, 'index.args');
  const run = (command, args, options) => {
    writeFileSync(argfile, args.map((arg) => JSON.stringify(arg)).join('\n'));
    return execFileSync(codeql, [...command, `@${argfile}`], options);
  };
  // Preselect XML files in the source scope; the second sequence retains filter order.
  const output = join(temp, 'files.json');
  const fd = openSync(output, 'w');
  try {
    run(
      ['resolve', 'files'],
      [
        '--format=json',
        '--include-extension=.view.xml',
        '--include-extension=.fragment.xml',
        ...prune,
        ...scope.map(([, pattern]) => `--also-match=${pattern}`),
        '--',
        process.cwd(),
      ],
      { stdio: ['ignore', fd, 'inherit'] },
    );
  } finally {
    closeSync(fd);
  }
  const files = JSON.parse(readFileSync(output, 'utf8'));
  run(
    ['database', 'index-files'],
    [
      '--language=xml',
      ...(files.length ? prune : ['--include=!**']),
      ...files.map(
        (file) =>
          '--include=' +
          relative(process.cwd(), file)
            .replace(/\\/g, '/')
            .replace(/[\\*?\[\]]/g, '\\$&')
            .replace(/^!/, '\\!'),
      ),
      '--also-match=**',
      ...filters.map(
        ([kind, pattern]) =>
          `--also-match=${kind === 'exclude' ? '!' : ''}${pattern}`,
      ),
      '--total-size-limit=10m',
      '--',
      database,
    ],
    { stdio: 'inherit' },
  );
} finally {
  rmSync(temp, { recursive: true, force: true });
}
