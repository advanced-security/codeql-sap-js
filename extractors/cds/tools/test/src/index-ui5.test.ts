import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

jest.mock('child_process', () => ({
  execFileSync: jest.fn(),
}));
jest.mock('fs', () => ({
  closeSync: jest.fn(),
  mkdtempSync: jest.fn(() => '/tmp/codeql-ui5-test'),
  openSync: jest.fn(() => 42),
  readFileSync: jest.fn(),
  rmSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

describe('UI5 XML include patterns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.replaceProperty(process, 'env', {
      ...process.env,
      CODEQL_DIST: '/codeql',
      CODEQL_EXTRACTOR_JAVASCRIPT_WIP_DATABASE: '/database',
      LGTM_INDEX_FILTERS: '',
    });
  });

  afterEach(() => {
    jest.dontMock('path');
    jest.restoreAllMocks();
  });

  it.each([
    {
      filters: 'include:*.json',
      scope: [],
      ordered: ['*.json'],
    },
    {
      filters:
        'include:**/*.json\r\ninclude:app-*/webapp/**\r\nexclude:**/*.*\r\ninclude:**/*.view.xml\r\n',
      scope: ['app-*/webapp/**'],
      ordered: ['**/*.json', 'app-*/webapp/**', '!**/*.*', '**/*.view.xml'],
    },
    {
      filters: 'include:!Main.view.xml',
      scope: ['\\!Main.view.xml'],
      ordered: ['\\!Main.view.xml'],
    },
    {
      filters: 'include:!!Main.fragment.xml',
      scope: ['\\!!Main.fragment.xml'],
      ordered: ['\\!!Main.fragment.xml'],
    },
    {
      filters: 'exclude:!Main.view.xml',
      scope: [],
      ordered: ['!\\!Main.view.xml'],
    },
    {
      filters: 'include:!app/**\nexclude:!app/private/**',
      scope: ['\\!app/**'],
      ordered: ['\\!app/**', '!\\!app/private/**'],
    },
  ])('should preserve filter intent and order in both CodeQL calls: $filters', test => {
    process.env.LGTM_INDEX_FILTERS = test.filters;
    jest
      .mocked(readFileSync)
      .mockReturnValue(JSON.stringify([join(process.cwd(), '!Main.view.xml')]));

    jest.isolateModules(() => {
      jest.requireActual('../../../../javascript/tools/index-ui5.js');
    });

    const expected = [test.scope, ['**', ...test.ordered]];
    const calls = jest.mocked(writeFileSync).mock.calls;
    expect(calls).toHaveLength(2);
    calls.forEach((call, index) => {
      const content = call[1];
      if (typeof content !== 'string') {
        throw new Error('Expected CodeQL argument-file text');
      }
      const patterns = content.split('\n').filter(arg => arg.startsWith('"--also-match='));
      expect(patterns).toEqual(
        expected[index].map(pattern => JSON.stringify(`--also-match=${pattern}`)),
      );
    });
  });

  it.each([
    ['!Main.view.xml', '\\!Main.view.xml'],
    ['!!Main.fragment.xml', '\\!!Main.fragment.xml'],
    ['nested/!Main.view.xml', 'nested/!Main.view.xml'],
    ['!Main[1]*?.view.xml', '\\!Main\\[1\\]\\*\\?.view.xml'],
  ])('should include the literal filename %s', (filename, expectedPattern) => {
    jest.mocked(readFileSync).mockReturnValue(JSON.stringify([join(process.cwd(), filename)]));

    jest.isolateModules(() => {
      jest.requireActual('../../../../javascript/tools/index-ui5.js');
    });

    const content = jest.mocked(writeFileSync).mock.calls[1][1];
    if (typeof content !== 'string') {
      throw new Error('Expected CodeQL argument-file text');
    }
    const args = content.split('\n');
    expect(args).toContain(JSON.stringify(`--include=${expectedPattern}`));
    expect(args).not.toContain(JSON.stringify('--include=!**'));
  });

  it.each([
    ['/', String.raw`Main\Panel.view.xml`, String.raw`Main\\Panel.view.xml`],
    ['/', String.raw`!Main\Panel[1]*?.view.xml`, String.raw`\!Main\\Panel\[1\]\*\?.view.xml`],
    ['\\', String.raw`webapp\Main.view.xml`, 'webapp/Main.view.xml'],
  ])('escapes paths with separator %s: %s', (separator, filename, expectedPattern) => {
    jest.doMock('path', () => ({
      ...jest.requireActual<typeof import('path')>('path'),
      relative: () => filename,
      sep: separator,
    }));
    jest.mocked(readFileSync).mockReturnValue(JSON.stringify(['/selected/file']));

    jest.isolateModules(() => {
      jest.requireActual('../../../../javascript/tools/index-ui5.js');
    });

    const content = jest.mocked(writeFileSync).mock.calls[1][1];
    if (typeof content !== 'string') {
      throw new Error('Expected CodeQL argument-file text');
    }
    expect(content.split('\n')).toContain(JSON.stringify(`--include=${expectedPattern}`));
  });

  it('should retain the negative glob for an empty selection', () => {
    jest.mocked(readFileSync).mockReturnValue('[]');

    jest.isolateModules(() => {
      jest.requireActual('../../../../javascript/tools/index-ui5.js');
    });

    const content = jest.mocked(writeFileSync).mock.calls[1][1];
    if (typeof content !== 'string') {
      throw new Error('Expected CodeQL argument-file text');
    }
    const args = content.split('\n');
    expect(args).toContain(JSON.stringify('--include=!**'));
  });
});
