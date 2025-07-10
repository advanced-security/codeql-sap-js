import { spawnSync } from 'child_process';
import { join, delimiter } from 'path';

import { getCdsVersion } from '../../../../src/cds/compiler/version';

// Mock child_process
jest.mock('child_process');

const mockSpawnSync = spawnSync as jest.MockedFunction<typeof spawnSync>;

describe('version.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCdsVersion', () => {
    it('should return version when CDS command succeeds with standard format', () => {
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: Buffer.from('@sap/cds: 6.1.3'),
        stderr: Buffer.from(''),
        pid: 12345,
        output: [null, Buffer.from('@sap/cds: 6.1.3'), Buffer.from('')],
        signal: null,
      });

      const version = getCdsVersion('cds');

      expect(version).toBe('6.1.3');
      expect(mockSpawnSync).toHaveBeenCalledWith('cds', ['--version'], {
        shell: true,
        stdio: 'pipe',
        env: { ...process.env },
      });
    });

    it('should return version when CDS command succeeds with alternative format', () => {
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: Buffer.from('@sap/cds-dk: 7.2.1'),
        stderr: Buffer.from(''),
        pid: 12345,
        output: [null, Buffer.from('@sap/cds-dk: 7.2.1'), Buffer.from('')],
        signal: null,
      });

      const version = getCdsVersion('cds');

      expect(version).toBe('7.2.1');
    });

    it('should return full output when version cannot be parsed', () => {
      const customOutput = 'Custom CDS version output';
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: Buffer.from(customOutput),
        stderr: Buffer.from(''),
        pid: 12345,
        output: [null, Buffer.from(customOutput), Buffer.from('')],
        signal: null,
      });

      const version = getCdsVersion('cds');

      expect(version).toBe(customOutput);
    });

    it('should return undefined when CDS command fails', () => {
      mockSpawnSync.mockReturnValue({
        status: 1,
        stdout: Buffer.from(''),
        stderr: Buffer.from('Command not found'),
        pid: 12345,
        output: [null, Buffer.from(''), Buffer.from('Command not found')],
        signal: null,
      });

      const version = getCdsVersion('cds');

      expect(version).toBeUndefined();
    });

    it('should return empty string when CDS command has empty stdout', () => {
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
        pid: 12345,
        output: [null, Buffer.from(''), Buffer.from('')],
        signal: null,
      });

      const version = getCdsVersion('cds');

      expect(version).toBe('');
    });

    it('should return undefined when spawnSync throws an exception', () => {
      mockSpawnSync.mockImplementation(() => {
        throw new Error('spawn failed');
      });

      const version = getCdsVersion('cds');

      expect(version).toBeUndefined();
    });

    it('should use cache directory when provided', () => {
      const cacheDir = '/test/cache';
      const expectedNodePath = join(cacheDir, 'node_modules');
      const expectedBinPath = join(expectedNodePath, '.bin');

      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: Buffer.from('@sap/cds: 6.1.3'),
        stderr: Buffer.from(''),
        pid: 12345,
        output: [null, Buffer.from('@sap/cds: 6.1.3'), Buffer.from('')],
        signal: null,
      });

      const version = getCdsVersion('cds', cacheDir);

      expect(version).toBe('6.1.3');
      expect(mockSpawnSync).toHaveBeenCalledWith('cds', ['--version'], {
        shell: true,
        stdio: 'pipe',
        env: {
          ...process.env,
          NODE_PATH: `${expectedNodePath}${delimiter}${process.env.NODE_PATH ?? ''}`,
          PATH: `${expectedBinPath}${delimiter}${process.env.PATH}`,
          npm_config_prefix: cacheDir,
        },
      });
    });

    it('should handle empty NODE_PATH when using cache directory', () => {
      const originalNodePath = process.env.NODE_PATH;
      delete process.env.NODE_PATH;

      const cacheDir = '/test/cache';
      const expectedNodePath = join(cacheDir, 'node_modules');

      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: Buffer.from('@sap/cds: 6.1.3'),
        stderr: Buffer.from(''),
        pid: 12345,
        output: [null, Buffer.from('@sap/cds: 6.1.3'), Buffer.from('')],
        signal: null,
      });

      const version = getCdsVersion('cds', cacheDir);

      expect(version).toBe('6.1.3');
      expect(mockSpawnSync).toHaveBeenCalledWith('cds', ['--version'], {
        shell: true,
        stdio: 'pipe',
        env: expect.objectContaining({
          NODE_PATH: expectedNodePath + delimiter,
        }),
      });

      // Restore original NODE_PATH
      if (originalNodePath !== undefined) {
        process.env.NODE_PATH = originalNodePath;
      }
    });

    it('should handle version with extra text before version number', () => {
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: Buffer.from('something @sap/cds version 7.3.2 something else'),
        stderr: Buffer.from(''),
        pid: 12345,
        output: [
          null,
          Buffer.from('something @sap/cds version 7.3.2 something else'),
          Buffer.from(''),
        ],
        signal: null,
      });

      const version = getCdsVersion('cds');

      expect(version).toBe('7.3.2');
    });

    it('should handle whitespace in version output', () => {
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: Buffer.from('  @sap/cds: 6.1.3  \n'),
        stderr: Buffer.from(''),
        pid: 12345,
        output: [null, Buffer.from('  @sap/cds: 6.1.3  \n'), Buffer.from('')],
        signal: null,
      });

      const version = getCdsVersion('cds');

      expect(version).toBe('6.1.3');
    });

    it('should handle complex version patterns', () => {
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: Buffer.from('@sap/cds-dk - 7.2.1-beta.1'),
        stderr: Buffer.from(''),
        pid: 12345,
        output: [null, Buffer.from('@sap/cds-dk - 7.2.1-beta.1'), Buffer.from('')],
        signal: null,
      });

      const version = getCdsVersion('cds');

      // Should extract just the main version number part
      expect(version).toBe('7.2.1');
    });

    it('should handle different CDS commands', () => {
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: Buffer.from('@sap/cds: 6.1.3'),
        stderr: Buffer.from(''),
        pid: 12345,
        output: [null, Buffer.from('@sap/cds: 6.1.3'), Buffer.from('')],
        signal: null,
      });

      const version = getCdsVersion('npx cds');

      expect(version).toBe('6.1.3');
      expect(mockSpawnSync).toHaveBeenCalledWith('npx cds', ['--version'], expect.any(Object));
    });

    it('should handle multiline version output', () => {
      const multilineOutput = `
@sap/cds: 6.1.3
@sap/cds-dk: 7.2.1
Node.js: v18.17.0
`;
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: Buffer.from(multilineOutput),
        stderr: Buffer.from(''),
        pid: 12345,
        output: [null, Buffer.from(multilineOutput), Buffer.from('')],
        signal: null,
      });

      const version = getCdsVersion('cds');

      expect(version).toBe('6.1.3');
    });
  });
});
