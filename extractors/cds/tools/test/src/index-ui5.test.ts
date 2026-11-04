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
    jest.restoreAllMocks();
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
