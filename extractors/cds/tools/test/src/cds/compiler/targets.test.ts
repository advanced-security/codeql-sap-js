import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';

import { fileSync } from 'tmp';

import { withCdsCompilationTargets } from '../../../../src/cds/compiler/targets';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));
jest.mock('tmp', () => ({
  fileSync: jest.fn(),
}));

const { readdirSync } = jest.requireMock<{
  readdirSync: jest.Mock<string[], [string]>;
}>('fs');

describe('withCdsCompilationTargets', () => {
  const projectDir = '/project';
  const entryName = join(projectDir, '.codeql-cds-test.cds');
  const removeCallback = jest.fn();
  const sources = Array.from({ length: 400 }, (_, i) => `db/nested/entity-${i}.cds`);

  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(existsSync).mockReturnValue(false);
    jest.mocked(fileSync).mockReturnValue({ name: entryName, fd: 42, removeCallback });
  });

  it('should leave short target lists unchanged', () => {
    const targets = ['db', 'srv', 'fts/feature.cds'];
    const compile = jest.fn(() => 'compiled');

    const result = withCdsCompilationTargets(projectDir, targets, compile);

    expect(result).toBe('compiled');
    expect(compile).toHaveBeenCalledWith(targets);
    expect(fileSync).not.toHaveBeenCalled();
  });

  it('should import all selected sources once and escape CDS string literals', () => {
    const targets = [
      ...sources,
      "fts/O'Brien.cds",
      'fts/feature name%PATH%!&value^.cds',
      sources[0],
    ];
    const compile = jest.fn(() => {
      expect(removeCallback).not.toHaveBeenCalled();
      return 'compiled';
    });

    const result = withCdsCompilationTargets(projectDir, targets, compile);

    expect(result).toBe('compiled');
    expect(fileSync).toHaveBeenCalledWith({
      postfix: '.cds',
      prefix: '.codeql-cds-',
      tmpdir: projectDir,
    });
    expect(compile).toHaveBeenCalledTimes(1);
    expect(compile).toHaveBeenCalledWith(['.codeql-cds-test.cds']);
    const content = jest.mocked(writeFileSync).mock.calls[0][1];
    if (typeof content !== 'string') {
      throw new Error('Expected CDS entry-point text');
    }
    expect(content.split('\n')).toHaveLength(402);
    expect(content).toContain("using from './fts/O''Brien.cds';");
    expect(content).toContain("using from './fts/feature name%PATH%!&value^.cds';");
    for (const source of sources) {
      expect(content).toContain(`using from './${source}';`);
    }
    expect(removeCallback).toHaveBeenCalledTimes(1);
  });

  it('should preserve direct directory sources and prefer CSN over matching CDS files', () => {
    jest.mocked(readdirSync).mockReturnValue(['schema.cds', 'schema.csn', 'other.cds', 'nested']);

    withCdsCompilationTargets(projectDir, ['db', ...sources], jest.fn());

    const content = jest.mocked(writeFileSync).mock.calls[0][1];
    if (typeof content !== 'string') {
      throw new Error('Expected CDS entry-point text');
    }
    expect(content).toContain("using from './db/schema.csn';");
    expect(content).toContain("using from './db/other.cds';");
    expect(content).not.toContain("using from './db/schema.cds';");
    expect(content).not.toContain("using from './db';");
    expect(content).not.toContain("using from './db/nested';");
  });

  it.each(['db.csn', 'db.cds', 'db/index.csn', 'db/index.cds', 'db/csn.json'])(
    'should preserve directory entry-point precedence for %s',
    entry => {
      jest
        .mocked(existsSync)
        .mockImplementation(file => file.toString() === join(projectDir, entry));

      withCdsCompilationTargets(projectDir, ['db', ...sources], jest.fn());

      expect(writeFileSync).toHaveBeenCalledWith(
        42,
        expect.stringContaining(`using from './${entry}';`),
        'utf8',
      );
      expect(readdirSync).not.toHaveBeenCalled();
    },
  );

  it.each(['\r', '\n', '\r\n'])(
    'should explicitly reject line breaks that cannot be represented in CDS imports: %j',
    separator => {
      const compile = jest.fn();

      expect(() =>
        withCdsCompilationTargets(
          projectDir,
          [...sources, `srv/model${separator}name.cds`],
          compile,
        ),
      ).toThrow('Cannot import a CDS compilation target containing a line break');
      expect(compile).not.toHaveBeenCalled();
      expect(fileSync).not.toHaveBeenCalled();
    },
  );

  it('should propagate directory resolution errors', () => {
    jest.mocked(readdirSync).mockImplementation(() => {
      throw new Error('Cannot read directory');
    });
    const compile = jest.fn();

    expect(() => withCdsCompilationTargets(projectDir, ['db', ...sources], compile)).toThrow(
      'Cannot read directory',
    );
    expect(compile).not.toHaveBeenCalled();
    expect(fileSync).not.toHaveBeenCalled();
  });

  it('should propagate temporary-file creation errors', () => {
    jest.mocked(fileSync).mockImplementation(() => {
      throw new Error('Cannot create entry point');
    });
    const compile = jest.fn();

    expect(() => withCdsCompilationTargets(projectDir, sources, compile)).toThrow(
      'Cannot create entry point',
    );
    expect(compile).not.toHaveBeenCalled();
  });

  it('should clean up when writing the entry point fails', () => {
    jest.mocked(writeFileSync).mockImplementation(() => {
      throw new Error('Cannot write entry point');
    });
    const compile = jest.fn();

    expect(() => withCdsCompilationTargets(projectDir, sources, compile)).toThrow(
      'Cannot write entry point',
    );
    expect(compile).not.toHaveBeenCalled();
    expect(removeCallback).toHaveBeenCalledTimes(1);
  });

  it('should clean up when the compiler throws', () => {
    const compile = jest.fn(() => {
      throw new Error('Compiler failed');
    });

    expect(() => withCdsCompilationTargets(projectDir, sources, compile)).toThrow(
      'Compiler failed',
    );
    expect(removeCallback).toHaveBeenCalledTimes(1);
  });

  it('should clean up unsuccessful compiler results', () => {
    const failure = { status: 1 };

    const result = withCdsCompilationTargets(projectDir, sources, () => failure);

    expect(result).toBe(failure);
    expect(removeCallback).toHaveBeenCalledTimes(1);
  });

  it('should report cleanup failures', () => {
    removeCallback.mockImplementation(() => {
      throw new Error('Cannot remove entry point');
    });

    expect(() => withCdsCompilationTargets(projectDir, sources, jest.fn())).toThrow(
      'Cannot remove entry point',
    );
  });
});
