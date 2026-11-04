import type * as childProcess from 'child_process';

import type { compileCdsToJson } from '../../../../src/cds/compiler/compile';
import type { determineCdsFilesToCompile } from '../../../../src/cds/parser/functions';
import type { BasicCdsProject } from '../../../../src/cds/parser/types';

jest.mock('child_process', () => ({
  spawnSync: jest.fn(),
}));
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  openSync: jest.fn(() => {
    throw new Error('Mock compiler shim has no shebang');
  }),
  readdirSync: jest.fn(() => ['schema.cds']),
  writeFileSync: jest.fn(),
}));
jest.mock('tmp', () => ({
  fileSync: jest.fn(),
}));
jest.mock('which', () => ({
  sync: jest.fn(),
}));
jest.mock('../../../../src/cds/compiler/version', () => ({
  getCdsVersion: jest.fn(() => '8.0.0'),
}));
jest.mock('../../../../src/cds/parser/functions', () => ({
  determineCdsFilesToCompile: jest.fn(),
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

describe('Windows CDS compiler invocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(process, 'platform', { value: 'win32' });
    jest.replaceProperty(process, 'env', { ...process.env, comspec: 'cmd.exe' });
    jest.spyOn(process, 'chdir').mockImplementation(() => {});
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
    jest.restoreAllMocks();
  });

  it.each([
    ['cds', 'C:\\tools\\cds.cmd'],
    ['npx --yes --package @sap/cds-dk cds', 'C:\\nodejs\\npx.cmd'],
    ['C:\\cache path\\node_modules\\.bin\\cds.cmd', 'C:\\cache path\\node_modules\\.bin\\cds.cmd'],
  ])('should bound large project invocations for %s', (command, resolvedCommand) => {
    jest.isolateModules(() => {
      const compiler = jest.requireActual<{ compileCdsToJson: typeof compileCdsToJson }>(
        '../../../../src/cds/compiler/compile',
      );
      const child = jest.requireMock<typeof childProcess>('child_process');
      const fs = jest.requireMock<jest.Mocked<typeof import('fs')>>('fs');
      const temporaryFiles = jest.requireMock<jest.Mocked<typeof import('tmp')>>('tmp');
      const which = jest.requireMock<jest.Mocked<{ sync: (command: string) => string }>>('which');
      const parser = jest.requireMock<{
        determineCdsFilesToCompile: jest.MockedFunction<typeof determineCdsFilesToCompile>;
      }>('../../../../src/cds/parser/functions');
      const targets = ['db', ...Array.from({ length: 400 }, (_, i) => `db/nested/entity-${i}.cds`)];
      const projectDir = 'test-project';
      const project: BasicCdsProject = {
        cdsFiles: targets.slice(1).map(target => `${projectDir}/${target}`),
        compilationTargets: targets,
        expectedOutputFile: 'model.cds.json',
        projectDir,
      };
      const removeCallback = jest.fn();
      which.sync.mockReturnValue(resolvedCommand);
      parser.determineCdsFilesToCompile.mockReturnValue({
        compilationTargets: targets,
        expectedOutputFile: 'model.cds.json',
      });
      temporaryFiles.fileSync.mockReturnValue({
        name: '/source/root/test-project/.codeql-cds-test.cds',
        fd: 42,
        removeCallback,
      });
      jest.mocked(child.spawnSync).mockReturnValue({
        output: [],
        pid: 1,
        signal: null,
        status: 0,
        stderr: Buffer.from(''),
        stdout: Buffer.from(''),
      });

      const result = compiler.compileCdsToJson(
        `${projectDir}/${targets[1]}`,
        '/source/root',
        command,
        undefined,
        new Map([[projectDir, project]]),
        projectDir,
      );

      expect(result.success).toBe(true);
      expect(child.spawnSync).toHaveBeenCalledTimes(1);
      expect(child.spawnSync).toHaveBeenCalledWith(
        'cmd.exe',
        ['/d', '/s', '/c', expect.stringContaining('.codeql-cds-test.cds')],
        expect.objectContaining({ cwd: '/source/root/test-project', shell: false }),
      );
      const args = jest.mocked(child.spawnSync).mock.calls[0][1];
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
      expect(removeCallback).toHaveBeenCalledTimes(1);
    });
  });

  it.each([
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
  ])(
    'should escape filenames when invoking $command',
    ({ command, resolvedCommand, escapedTarget }) => {
      jest.isolateModules(() => {
        const compiler = jest.requireActual<{ compileCdsToJson: typeof compileCdsToJson }>(
          '../../../../src/cds/compiler/compile',
        );
        const child = jest.requireMock<typeof childProcess>('child_process');
        const which = jest.requireMock<jest.Mocked<{ sync: (command: string) => string }>>('which');
        const parser = jest.requireMock<{
          determineCdsFilesToCompile: jest.MockedFunction<typeof determineCdsFilesToCompile>;
        }>('../../../../src/cds/parser/functions');
        const target = 'fts/feature name%PATH%!&value^.cds';
        const projectDir = 'test-project';
        const project: BasicCdsProject = {
          cdsFiles: [`${projectDir}/${target}`],
          compilationTargets: [target],
          expectedOutputFile: 'model.cds.json',
          projectDir,
        };
        which.sync.mockReturnValue(resolvedCommand);
        parser.determineCdsFilesToCompile.mockReturnValue({
          compilationTargets: [target],
          expectedOutputFile: 'model.cds.json',
        });
        jest.mocked(child.spawnSync).mockReturnValue({
          output: [],
          pid: 1,
          signal: null,
          status: 0,
          stderr: Buffer.from(''),
          stdout: Buffer.from(''),
        });

        const result = compiler.compileCdsToJson(
          `${projectDir}/${target}`,
          '/source/root',
          command,
          undefined,
          new Map([[projectDir, project]]),
          projectDir,
        );

        expect(result.success).toBe(true);
        expect(child.spawnSync).toHaveBeenCalledWith(
          'cmd.exe',
          ['/d', '/s', '/c', expect.stringContaining(escapedTarget)],
          expect.objectContaining({
            shell: false,
            windowsVerbatimArguments: true,
          }),
        );
      });
    },
  );
});
