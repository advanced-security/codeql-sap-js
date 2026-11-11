import type * as childProcess from 'child_process';
import { join } from 'path';

import type { compileCdsToJson } from '../../../../src/cds/compiler/compile';
import type { determineCdsFilesToCompile } from '../../../../src/cds/parser/functions';
import type { BasicCdsProject } from '../../../../src/cds/parser/types';

jest.mock('child_process', () => ({
  spawnSync: jest.fn(),
}));
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: jest.fn(() => '00000000-0000-4000-8000-000000000000'),
}));
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  closeSync: jest.fn(),
  openSync: jest.fn((_path: string, flags: string) => {
    if (flags === 'wx') {
      return 42;
    }
    throw new Error('Mock compiler shim has no shebang');
  }),
  readdirSync: jest.fn(() => ['schema.cds']),
  unlinkSync: jest.fn(),
  writeFileSync: jest.fn(),
}));
jest.mock('which', () => ({
  sync: jest.fn(),
}));
jest.mock('../../../../src/cds/compiler/version', () => ({
  getCdsVersion: jest.fn(() => '8.0.0'),
}));
jest.mock('../../../../src/cds/parser/functions', () => ({
  determineCdsFilesToCompile: jest.fn(),
  getCdsDirectoryEntryPoint: jest.fn(),
}));
jest.mock('../../../../src/filesystem', () => ({
  dirExists: jest.fn(() => false),
  fileExists: jest.fn(() => true),
  normalizeLocationPathsInFile: jest.fn(),
}));
jest.mock('../../../../src/logging', () => ({
  cdsExtractorLog: jest.fn(),
}));

const originalPlatform = process.platform;
const commands = [
  {
    command: 'cds',
    resolvedCommand: 'C:\\tools\\cds.cmd',
    escapedTarget: '^"fts/feature^ name^%PATH^%^!^&value^^.cds^"',
  },
  {
    command: 'npx --yes --package @sap/cds-dk cds',
    resolvedCommand: 'C:\\nodejs\\npx.cmd',
    escapedTarget: '^"fts/feature^ name^%PATH^%^!^&value^^.cds^"',
  },
  {
    command: 'C:\\cache path\\node_modules\\.bin\\cds.cmd',
    resolvedCommand: 'C:\\cache path\\node_modules\\.bin\\cds.cmd',
    escapedTarget: '^^^"fts/feature^^^ name^^^%PATH^^^%^^^!^^^&value^^^^.cds^^^"',
  },
];

describe('Windows CDS compiler invocation', () => {
  const projectDir = 'test-project';
  const sourceRoot = join('/source', 'root');
  let child: jest.Mocked<typeof childProcess>;
  let compile: typeof compileCdsToJson;
  let fs: jest.Mocked<typeof import('fs')>;
  let parser: {
    determineCdsFilesToCompile: jest.MockedFunction<typeof determineCdsFilesToCompile>;
  };
  let which: jest.Mocked<{ sync: (command: string) => string }>;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(process, 'platform', { value: 'win32' });
    jest.replaceProperty(process, 'env', { ...process.env, comspec: 'cmd.exe' });
    jest.spyOn(process, 'chdir').mockImplementation(() => {});
    jest.isolateModules(() => {
      compile = jest.requireActual<{ compileCdsToJson: typeof compileCdsToJson }>(
        '../../../../src/cds/compiler/compile',
      ).compileCdsToJson;
      child = jest.requireMock<jest.Mocked<typeof childProcess>>('child_process');
      fs = jest.requireMock<jest.Mocked<typeof import('fs')>>('fs');
      parser = jest.requireMock<typeof parser>('../../../../src/cds/parser/functions');
      which = jest.requireMock<typeof which>('which');
    });
    child.spawnSync.mockReturnValue({
      output: [],
      pid: 1,
      signal: null,
      status: 0,
      stderr: Buffer.from(''),
      stdout: Buffer.from(''),
    });
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
    jest.restoreAllMocks();
  });

  function compileTargets(
    command: string,
    resolvedCommand: string,
    targets: string[],
  ): ReturnType<typeof compileCdsToJson> {
    const cdsFiles = targets
      .filter(target => target.endsWith('.cds'))
      .map(target => join(projectDir, target));
    const project: BasicCdsProject = {
      cdsFiles,
      compilationTargets: targets,
      expectedOutputFile: 'model.cds.json',
      projectDir,
    };
    which.sync.mockReturnValue(resolvedCommand);
    parser.determineCdsFilesToCompile.mockReturnValue({
      compilationTargets: targets,
      expectedOutputFile: 'model.cds.json',
    });
    return compile(
      cdsFiles[0],
      sourceRoot,
      command,
      undefined,
      new Map([[projectDir, project]]),
      projectDir,
    );
  }

  it.each(commands)(
    'should bound large project invocations for $command',
    ({ command, resolvedCommand }) => {
      const targets = ['db', ...Array.from({ length: 400 }, (_, i) => `db/nested/entity-${i}.cds`)];

      const result = compileTargets(command, resolvedCommand, targets);

      expect(result.success).toBe(true);
      expect(child.spawnSync).toHaveBeenCalledTimes(1);
      expect(child.spawnSync).toHaveBeenCalledWith(
        'cmd.exe',
        [
          '/d',
          '/s',
          '/c',
          expect.stringContaining('.codeql-cds-00000000-0000-4000-8000-000000000000.cds'),
        ],
        expect.objectContaining({ cwd: join(sourceRoot, projectDir), shell: false }),
      );
      const args = child.spawnSync.mock.calls[0][1];
      if (!Array.isArray(args)) {
        throw new Error('Expected compiler arguments');
      }
      expect(args.join(' ').length).toBeLessThan(8191);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        42,
        expect.stringContaining("using from './db/schema.cds';"),
        'utf8',
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        42,
        expect.stringContaining("using from './db/nested/entity-399.cds';"),
        'utf8',
      );
    },
  );

  it.each(commands)(
    'should escape filenames when invoking $command',
    ({ command, resolvedCommand, escapedTarget }) => {
      const result = compileTargets(command, resolvedCommand, [
        'fts/feature name%PATH%!&value^.cds',
      ]);

      expect(result.success).toBe(true);
      expect(child.spawnSync).toHaveBeenCalledWith(
        'cmd.exe',
        ['/d', '/s', '/c', expect.stringContaining(escapedTarget)],
        expect.objectContaining({
          shell: false,
          windowsVerbatimArguments: true,
        }),
      );
    },
  );
});
