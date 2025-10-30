/* eslint-disable @typescript-eslint/no-explicit-any */
import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import {
  determineCdsCommand,
  resetCdsCommandCache,
  DEFAULT_COMMAND_TIMEOUT_MS,
  determineVersionAwareCdsCommands,
} from '../../../../src/cds/compiler/command';
import { fileExists } from '../../../../src/filesystem';
import { cdsExtractorLog } from '../../../../src/logging';

// Mock dependencies
jest.mock('child_process', () => ({
  execFileSync: jest.fn(),
  spawnSync: jest.fn(),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readdirSync: jest.fn(),
}));

jest.mock('path', () => {
  const original = jest.requireActual('path');
  return {
    ...original,
    resolve: jest.fn(),
    join: jest.fn(),
    relative: jest.fn(),
    delimiter: original.delimiter,
  };
});

jest.mock('../../../../src/filesystem', () => ({
  fileExists: jest.fn(),
  dirExists: jest.fn(),
  recursivelyRenameJsonFiles: jest.fn(),
}));

jest.mock('../../../../src/logging', () => ({
  cdsExtractorLog: jest.fn(),
}));

describe('cds compiler command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the command cache between tests to ensure clean state
    resetCdsCommandCache();
  });

  describe('determineCdsCommand', () => {
    it('should return "cds" when cds command is available', () => {
      // Mock successful execution of "cds --version"
      (childProcess.execFileSync as jest.Mock).mockImplementation(() => Buffer.from('4.6.0'));

      // Execute
      const result = determineCdsCommand(undefined, '/mock/source/root');

      // Verify
      expect(result).toBe('cds');
      expect(childProcess.execFileSync).toHaveBeenCalledWith('cds', ['--version'], {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: DEFAULT_COMMAND_TIMEOUT_MS,
        cwd: '/mock/source/root',
        env: expect.objectContaining({
          CODEQL_EXTRACTOR_CDS_WIP_DATABASE: undefined,
          CODEQL_RUNNER: undefined,
        }),
      });
    });

    it('should return "npx --yes --package @sap/cds-dk cds" when cds command is not available', () => {
      // Mock failed execution for "cds --version" but success for npx
      (childProcess.execFileSync as jest.Mock).mockImplementation(
        (command: string, args: string[]) => {
          if (command === 'cds' && args.join(' ') === '--version') {
            throw new Error('Command not found');
          }
          if (command === 'npx' && args.join(' ') === '--yes --package @sap/cds-dk cds --version') {
            return Buffer.from('6.1.3');
          }
          throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
        },
      );

      // Execute
      const result = determineCdsCommand(undefined, '/mock/source/root');

      // Verify
      expect(result).toBe('npx --yes --package @sap/cds-dk cds');
      // Should have tried both commands
      expect(childProcess.execFileSync).toHaveBeenCalledWith('cds', ['--version'], {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: DEFAULT_COMMAND_TIMEOUT_MS,
        cwd: '/mock/source/root',
        env: expect.objectContaining({
          CODEQL_EXTRACTOR_CDS_WIP_DATABASE: undefined,
          CODEQL_RUNNER: undefined,
        }),
      });
      expect(childProcess.execFileSync).toHaveBeenCalledWith(
        'npx',
        ['--yes', '--package', '@sap/cds-dk', 'cds', '--version'],
        {
          encoding: 'utf8',
          stdio: 'pipe',
          timeout: DEFAULT_COMMAND_TIMEOUT_MS,
          cwd: '/mock/source/root',
          env: expect.objectContaining({
            CODEQL_EXTRACTOR_CDS_WIP_DATABASE: undefined,
            CODEQL_RUNNER: undefined,
          }),
        },
      );
    });

    it('should cache command test results to avoid duplicate work', () => {
      // Mock successful execution of "cds --version"
      (childProcess.execFileSync as jest.Mock).mockImplementation(() => Buffer.from('4.6.0'));

      // Execute twice
      const result1 = determineCdsCommand(undefined, '/mock/source/root');
      const result2 = determineCdsCommand(undefined, '/mock/source/root');

      // Verify both calls return the same result
      expect(result1).toBe('cds');
      expect(result2).toBe('cds');

      // Verify execFileSync was called minimal times (once for cds during cache initialization)
      expect(childProcess.execFileSync).toHaveBeenCalledTimes(1);
    });

    it('should return fallback command when all commands fail', () => {
      // Mock all commands to fail
      (childProcess.execFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Command not found');
      });

      // Execute
      const result = determineCdsCommand(undefined, '/mock/source/root');

      // Verify - should return the fallback command even if it doesn't work
      expect(result).toBe('npx --yes --package @sap/cds-dk cds');
    });

    it('should handle cache directory discovery with available directories', () => {
      const mockFileExists = fileExists as jest.MockedFunction<typeof fileExists>;

      // Mock file system operations
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'cds-v6.1.3', isDirectory: () => true },
        { name: 'cds-v6.2.0', isDirectory: () => true },
        { name: 'other-dir', isDirectory: () => true },
      ]);

      (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));
      (path.resolve as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));

      // Mock fileExists to return true for cache directories with cds binary
      mockFileExists.mockImplementation((filePath: string) => {
        return filePath.includes('cds-v6') && filePath.endsWith('node_modules/.bin/cds');
      });

      // Mock successful execution for cache directory commands
      (childProcess.execFileSync as jest.Mock).mockImplementation(
        (command: string, args: string[]) => {
          if (command.includes('cds-v6.1.3') && args.join(' ') === '--version') {
            return Buffer.from('6.1.3');
          }
          if (command === 'cds' && args.join(' ') === '--version') {
            throw new Error('Global cds not found');
          }
          if (command === 'npx' && args.includes('--yes')) {
            throw new Error('NPX not found');
          }
          throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
        },
      );

      // Execute
      const result = determineCdsCommand(undefined, '/mock/source/root');

      // Verify - should use the first available cache directory
      expect(result).toBe(
        '/mock/source/root/.cds-extractor-cache/cds-v6.1.3/node_modules/.bin/cds',
      );
    });

    it('should handle cache directory discovery with filesystem errors', () => {
      const mockCdsExtractorLog = cdsExtractorLog as jest.MockedFunction<typeof cdsExtractorLog>;

      // Mock existsSync to return true, but readdirSync to throw an error
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Mock execFileSync to succeed for fallback commands
      (childProcess.execFileSync as jest.Mock).mockReturnValue(Buffer.from('4.6.0'));

      // Execute
      const result = determineCdsCommand(undefined, '/mock/source/root');

      // Verify - should fall back to global command
      expect(result).toBe('cds');
      expect(mockCdsExtractorLog).toHaveBeenCalledWith(
        'debug',
        'Failed to discover cache directories: Error: Permission denied',
      );
    });

    it('should prefer provided cache directory over discovered ones', () => {
      const mockFileExists = fileExists as jest.MockedFunction<typeof fileExists>;

      (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));
      (path.resolve as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));

      // Mock fileExists to return true for the provided cache directory
      mockFileExists.mockImplementation((filePath: string) => {
        return filePath === '/custom/cache/node_modules/.bin/cds';
      });

      // Mock successful execution for the provided cache directory
      (childProcess.execFileSync as jest.Mock).mockImplementation(
        (command: string, args: string[]) => {
          if (command === '/custom/cache/node_modules/.bin/cds' && args.join(' ') === '--version') {
            return Buffer.from('6.2.0');
          }
          if (command === 'cds' && args.join(' ') === '--version') {
            throw new Error('Global cds not found');
          }
          if (command === 'npx' && args.includes('--yes')) {
            throw new Error('NPX not found');
          }
          throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
        },
      );

      // Execute with custom cache directory
      const result = determineCdsCommand('/custom/cache', '/mock/source/root');

      // Verify - should use the provided cache directory
      expect(result).toBe('/custom/cache/node_modules/.bin/cds');
    });

    it('should handle node command format correctly', () => {
      const mockFileExists = fileExists as jest.MockedFunction<typeof fileExists>;

      // Mock cache directory discovery with node command - but no cache directories exist
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));

      // Mock fileExists to return false (no cache directories)
      mockFileExists.mockReturnValue(false);

      // Mock execFileSync to handle node command execution
      (childProcess.execFileSync as jest.Mock).mockImplementation(
        (command: string, args: string[]) => {
          if (command === 'node') {
            return Buffer.from('6.1.3');
          }
          if (command === 'sh' && args.join(' ').includes('cds --version')) {
            throw new Error('Command not found');
          }
          if (command === 'sh' && args.join(' ').includes('npx --yes --package @sap/cds-dk cds')) {
            return Buffer.from('6.1.3');
          }
          throw new Error('Command not found');
        },
      );

      // Execute
      const result = determineCdsCommand(undefined, '/mock/source/root');

      // Should fall back to npx command since cache directories don't exist
      expect(result).toBe('npx --yes --package @sap/cds-dk cds');
    });

    it('should handle version parsing failures gracefully', () => {
      // Mock cache directory discovery - no cache directories exist
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Mock command to return output without version number for global command
      (childProcess.execFileSync as jest.Mock).mockImplementation(
        (command: string, args: string[]) => {
          if (command === 'cds' && args.join(' ') === '--version') {
            return Buffer.from('No version info');
          }
          throw new Error('Command not found');
        },
      );

      // Execute
      const result = determineCdsCommand(undefined, '/mock/source/root');

      // Verify - should still return the command even without version info
      expect(result).toBe('cds');
    });

    it('should try fallback npx commands when global command fails', () => {
      // Mock all commands to fail except one fallback
      (childProcess.execFileSync as jest.Mock).mockImplementation(
        (command: string, args: string[]) => {
          if (command === 'npx' && args.join(' ') === '--yes --package @sap/cds cds --version') {
            return Buffer.from('6.1.3');
          }
          throw new Error('Command not found');
        },
      );

      // Execute
      const result = determineCdsCommand(undefined, '/mock/source/root');

      // Verify - should use the fallback command
      expect(result).toBe('npx --yes --package @sap/cds cds');
    });

    it('should log discovery of multiple cache directories', () => {
      const mockFileExists = fileExists as jest.MockedFunction<typeof fileExists>;
      const mockCdsExtractorLog = cdsExtractorLog as jest.MockedFunction<typeof cdsExtractorLog>;

      // Mock file system operations to discover multiple cache directories
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'cds-v6.1.3', isDirectory: () => true },
        { name: 'cds-v6.2.0', isDirectory: () => true },
        { name: 'cds-v7.0.0', isDirectory: () => true },
      ]);

      (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));

      // Mock fileExists to return true for all cache directories
      mockFileExists.mockImplementation((filePath: string) => {
        return filePath.includes('cds-v') && filePath.endsWith('node_modules/.bin/cds');
      });

      // Mock successful execution
      (childProcess.execFileSync as jest.Mock).mockReturnValue(Buffer.from('6.1.3'));

      // Execute
      determineCdsCommand(undefined, '/mock/source/root');

      // Verify - should log the discovery of multiple directories
      expect(mockCdsExtractorLog).toHaveBeenCalledWith(
        'info',
        'Discovered 3 CDS cache directories',
      );
    });

    it('should log discovery of single cache directory', () => {
      const mockFileExists = fileExists as jest.MockedFunction<typeof fileExists>;
      const mockCdsExtractorLog = cdsExtractorLog as jest.MockedFunction<typeof cdsExtractorLog>;

      // Mock file system operations to discover one cache directory
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'cds-v6.1.3', isDirectory: () => true },
      ]);

      (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));

      // Mock fileExists to return true for the cache directory
      mockFileExists.mockImplementation((filePath: string) => {
        return filePath.includes('cds-v6') && filePath.endsWith('node_modules/.bin/cds');
      });

      // Mock successful execution
      (childProcess.execFileSync as jest.Mock).mockReturnValue(Buffer.from('6.1.3'));

      // Execute
      determineCdsCommand(undefined, '/mock/source/root');

      // Verify - should log the discovery of single directory
      expect(mockCdsExtractorLog).toHaveBeenCalledWith('info', 'Discovered 1 CDS cache directory');
    });

    it('should handle cache directory without valid cds binary', () => {
      const mockFileExists = fileExists as jest.MockedFunction<typeof fileExists>;

      // Mock file system operations
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'cds-v6.1.3', isDirectory: () => true },
      ]);

      (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));

      // Mock fileExists to return false for the cache directory (no cds binary)
      mockFileExists.mockReturnValue(false);

      // Mock successful execution for fallback
      (childProcess.execFileSync as jest.Mock).mockReturnValue(Buffer.from('4.6.0'));

      // Execute
      const result = determineCdsCommand(undefined, '/mock/source/root');

      // Verify - should fall back to global command
      expect(result).toBe('cds');
    });
  });

  describe('version-aware command determination', () => {
    it('should use explicit @sap/cds-dk version from package.json', () => {
      const mockCdsDependencyGraph = {
        projects: new Map([
          [
            '/mock/project',
            {
              packageJson: {
                dependencies: {
                  '@sap/cds': '^7.9.5',
                  '@sap/cds-dk': '^8.6.1',
                },
              },
            },
          ],
        ]),
      };

      // Mock successful execution for version-specific npx command
      (childProcess.execFileSync as jest.Mock).mockImplementation(
        (command: string, args: string[]) => {
          if (command === 'npx' && args.includes('@sap/cds-dk@^8.6.1')) {
            return Buffer.from('8.6.1');
          }
          if (command === 'cds') {
            throw new Error('Global cds not found');
          }
          throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
        },
      );

      // Execute with project path and dependency graph
      const result = determineCdsCommand(
        undefined,
        '/mock/source/root',
        '/mock/project',
        mockCdsDependencyGraph as any,
      );

      // Verify
      expect(result).toBe('npx --yes --package @sap/cds-dk@^8.6.1 cds');
    });

    it('should derive compatible @sap/cds-dk version from @sap/cds dependency', () => {
      const mockCdsDependencyGraph = {
        projects: new Map([
          [
            '/mock/project',
            {
              packageJson: {
                dependencies: {
                  '@sap/cds': '^9',
                },
              },
            },
          ],
        ]),
      };

      // Mock successful execution for derived version npx command
      (childProcess.execFileSync as jest.Mock).mockImplementation(
        (command: string, args: string[]) => {
          if (command === 'npx' && args.includes('@sap/cds-dk@^9')) {
            return Buffer.from('9.1.3');
          }
          if (command === 'cds') {
            throw new Error('Global cds not found');
          }
          throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
        },
      );

      // Execute with project path and dependency graph
      const result = determineCdsCommand(
        undefined,
        '/mock/source/root',
        '/mock/project',
        mockCdsDependencyGraph as any,
      );

      // Verify
      expect(result).toBe('npx --yes --package @sap/cds-dk@^9 cds');
    });

    it('should fall back to current behavior when no project info is provided', () => {
      // Mock successful execution for fallback
      (childProcess.execFileSync as jest.Mock).mockImplementation(
        (command: string, args: string[]) => {
          if (command === 'cds') {
            throw new Error('Global cds not found');
          }
          if (command === 'npx' && args.includes('@sap/cds-dk')) {
            return Buffer.from('6.1.3');
          }
          throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
        },
      );

      // Execute without project information
      const result = determineCdsCommand(undefined, '/mock/source/root');

      // Verify - should use existing fallback behavior
      expect(result).toBe('npx --yes --package @sap/cds-dk cds');
    });

    it('should fall back when project has no CDS dependencies', () => {
      const mockCdsDependencyGraph = {
        projects: new Map([
          [
            '/mock/project',
            {
              packageJson: {
                dependencies: {
                  express: '^4.17.1',
                },
              },
            },
          ],
        ]),
      };

      // Mock successful execution for fallback
      (childProcess.execFileSync as jest.Mock).mockImplementation(
        (command: string, args: string[]) => {
          if (command === 'cds') {
            throw new Error('Global cds not found');
          }
          if (command === 'npx' && args.includes('@sap/cds-dk')) {
            return Buffer.from('6.1.3');
          }
          throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
        },
      );

      // Execute with project that has no CDS dependencies
      const result = determineCdsCommand(
        undefined,
        '/mock/source/root',
        '/mock/project',
        mockCdsDependencyGraph as any,
      );

      // Verify - should fall back to existing behavior
      expect(result).toBe('npx --yes --package @sap/cds-dk cds');
    });

    it('should prefer cache directory over version-specific commands', () => {
      const mockFileExists = fileExists as jest.MockedFunction<typeof fileExists>;
      const mockCdsDependencyGraph = {
        projects: new Map([
          [
            '/mock/project',
            {
              packageJson: {
                dependencies: {
                  '@sap/cds': '^7.9.5',
                  '@sap/cds-dk': '^8.6.1',
                },
              },
            },
          ],
        ]),
      };

      (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));
      (path.resolve as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));

      // Mock fileExists to return true for the cache directory
      mockFileExists.mockImplementation((filePath: string) => {
        return filePath === '/custom/cache/node_modules/.bin/cds';
      });

      // Mock successful execution for cache directory
      (childProcess.execFileSync as jest.Mock).mockImplementation(
        (command: string, args: string[]) => {
          if (command === '/custom/cache/node_modules/.bin/cds' && args.join(' ') === '--version') {
            return Buffer.from('8.6.1');
          }
          throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
        },
      );

      // Execute with both cache directory and project info
      const result = determineCdsCommand(
        '/custom/cache',
        '/mock/source/root',
        '/mock/project',
        mockCdsDependencyGraph as any,
      );

      // Verify - should prefer cache directory over version-specific commands
      expect(result).toBe('/custom/cache/node_modules/.bin/cds');
    });
  });

  describe('Version-aware CDS commands', () => {
    it('should enforce minimum @sap/cds-dk version of 8', () => {
      // Mock dependency graph with a project that has @sap/cds version 5
      const mockCdsDependencyGraph = {
        projects: new Map([
          [
            '/mock/project',
            {
              packageJson: {
                dependencies: {
                  '@sap/cds': '^5.9.0', // This should be upgraded to at least 8
                },
              },
            },
          ],
        ]),
      };

      // Mock successful execution for version commands
      (childProcess.execFileSync as jest.Mock).mockImplementation(
        (command: string, args: string[]) => {
          if (command === 'cds' && args.join(' ') === '--version') {
            throw new Error('Command not found');
          }
          if (command === 'npx' && args.includes('--version')) {
            return Buffer.from('8.6.1');
          }
          throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
        },
      );

      // Execute
      const result = determineVersionAwareCdsCommands(
        undefined,
        '/mock/source/root',
        '/mock/project',
        mockCdsDependencyGraph as any,
      );

      // Verify - retry command should use at least version 8, not 5
      expect(result.retryCommand.originalCommand).toContain('@sap/cds-dk@^8');
      expect(result.retryCommand.originalCommand).not.toContain('@sap/cds-dk@^5');
    });

    it('should upgrade @sap/cds-dk@^7 to @sap/cds-dk@^8', () => {
      const mockCdsDependencyGraph = {
        projects: new Map([
          [
            '/mock/project',
            {
              packageJson: {
                dependencies: {
                  '@sap/cds': '^7.9.0', // This should be upgraded to at least 8
                },
              },
            },
          ],
        ]),
      };

      (childProcess.execFileSync as jest.Mock).mockImplementation(
        (command: string, args: string[]) => {
          if (command === 'cds' && args.join(' ') === '--version') {
            throw new Error('Command not found');
          }
          if (command === 'npx' && args.includes('--version')) {
            return Buffer.from('8.6.1');
          }
          throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
        },
      );

      const result = determineVersionAwareCdsCommands(
        undefined,
        '/mock/source/root',
        '/mock/project',
        mockCdsDependencyGraph as any,
      );

      expect(result.retryCommand.originalCommand).toContain('@sap/cds-dk@^8');
      expect(result.retryCommand.originalCommand).not.toContain('@sap/cds-dk@^7');
    });

    it('should preserve @sap/cds-dk@^9 without changes', () => {
      const mockCdsDependencyGraph = {
        projects: new Map([
          [
            '/mock/project',
            {
              packageJson: {
                dependencies: {
                  '@sap/cds': '^9.2.0', // This should be preserved as-is
                },
              },
            },
          ],
        ]),
      };

      (childProcess.execFileSync as jest.Mock).mockImplementation(
        (command: string, args: string[]) => {
          if (command === 'cds' && args.join(' ') === '--version') {
            throw new Error('Command not found');
          }
          if (command === 'npx' && args.includes('--version')) {
            return Buffer.from('9.2.0');
          }
          throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
        },
      );

      const result = determineVersionAwareCdsCommands(
        undefined,
        '/mock/source/root',
        '/mock/project',
        mockCdsDependencyGraph as any,
      );

      expect(result.retryCommand.originalCommand).toContain('@sap/cds-dk@^9');
    });

    it('should use explicit @sap/cds-dk version from package.json', () => {
      const mockCdsDependencyGraph = {
        projects: new Map([
          [
            '/mock/project',
            {
              packageJson: {
                dependencies: {
                  '@sap/cds-dk': '^8.6.1', // Explicit version should be used
                },
              },
            },
          ],
        ]),
      };

      (childProcess.execFileSync as jest.Mock).mockImplementation(
        (command: string, args: string[]) => {
          if (command === 'cds' && args.join(' ') === '--version') {
            throw new Error('Command not found');
          }
          if (command === 'npx' && args.includes('--version')) {
            return Buffer.from('8.6.1');
          }
          throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
        },
      );

      const result = determineVersionAwareCdsCommands(
        undefined,
        '/mock/source/root',
        '/mock/project',
        mockCdsDependencyGraph as any,
      );

      expect(result.retryCommand.originalCommand).toContain('@sap/cds-dk@^8.6.1');
    });
  });
});
