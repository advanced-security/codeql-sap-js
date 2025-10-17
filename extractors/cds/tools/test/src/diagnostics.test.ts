import * as childProcess from 'child_process';
import { join, sep } from 'path';

import {
  addCompilationDiagnostic,
  addDependencyGraphDiagnostic,
  addDependencyInstallationDiagnostic,
  addEnvironmentSetupDiagnostic,
  addJavaScriptExtractorDiagnostic,
  addNoCdsProjectsDiagnostic,
  convertToRelativePath,
} from '../../src/diagnostics';

// Mock dependencies
jest.mock('child_process', () => ({
  execFileSync: jest.fn(),
  spawnSync: jest.fn(),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
}));

jest.mock('../../src/filesystem', () => ({
  fileExists: jest.fn(),
  dirExists: jest.fn(),
  recursivelyRenameJsonFiles: jest.fn(),
}));

describe('diagnostics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setupMockEnvironment = () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      CODEQL_EXTRACTOR_CDS_WIP_DATABASE: '/path/to/db',
    };
    return originalEnv;
  };

  const restoreMockEnvironment = (originalEnv: NodeJS.ProcessEnv) => {
    process.env = originalEnv;
  };

  const mockSuccessfulExecution = () => {
    (childProcess.execFileSync as jest.Mock).mockReturnValue(Buffer.from(''));
  };

  const expectRelativePathInCall = (expectedRelativePath: string) => {
    expect(childProcess.execFileSync).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([`--file-path=${expectedRelativePath}`]),
    );
  };

  describe('Path conversion to source-root-relative paths', () => {
    const sourceRoot = '/project/source/root';
    const codeqlExePath = '/path/to/codeql';

    describe('addCompilationDiagnostic', () => {
      it('should convert absolute CDS file path to source-root-relative path', () => {
        const originalEnv = setupMockEnvironment();
        mockSuccessfulExecution();

        const absoluteCdsFilePath = join(sourceRoot, 'app', 'models', 'schema.cds');
        const errorMessage = 'Syntax error in CDS file';

        const result = addCompilationDiagnostic(
          absoluteCdsFilePath,
          errorMessage,
          codeqlExePath,
          sourceRoot,
        );

        expect(result).toBe(true);
        expectRelativePathInCall(`app${sep}models${sep}schema.cds`);
        // Should NOT include explanatory note for files inside source root
        expect(childProcess.execFileSync).toHaveBeenCalledWith(
          expect.any(String),
          expect.arrayContaining([
            expect.stringMatching(/--markdown-message=Syntax error in CDS file$/),
          ]),
        );
        restoreMockEnvironment(originalEnv);
      });

      it('should handle CDS file path that is already relative', () => {
        const originalEnv = setupMockEnvironment();
        mockSuccessfulExecution();

        const relativeCdsFilePath = join('app', 'models', 'schema.cds');
        const errorMessage = 'Syntax error in CDS file';

        const result = addCompilationDiagnostic(
          relativeCdsFilePath,
          errorMessage,
          codeqlExePath,
          sourceRoot,
        );

        expect(result).toBe(true);
        expectRelativePathInCall(`app${sep}models${sep}schema.cds`);
        restoreMockEnvironment(originalEnv);
      });

      it('should handle CDS file path outside of source root by pointing to source root', () => {
        const originalEnv = setupMockEnvironment();
        mockSuccessfulExecution();

        const outsideCdsFilePath = '/other/project/external.cds';
        const errorMessage = 'Syntax error in CDS file';

        const result = addCompilationDiagnostic(
          outsideCdsFilePath,
          errorMessage,
          codeqlExePath,
          sourceRoot,
        );

        expect(result).toBe(true);
        // Should point to source root '.' when file is outside source root
        expectRelativePathInCall('.');
        // Should include explanatory note in the message
        expect(childProcess.execFileSync).toHaveBeenCalledWith(
          expect.any(String),
          expect.arrayContaining([
            expect.stringMatching(
              /--markdown-message=.*\*\*Note\*\*.*located outside the scanned source directory/s,
            ),
          ]),
        );
        restoreMockEnvironment(originalEnv);
      });

      it('should convert absolute paths to relative paths within source root', () => {
        const originalEnv = setupMockEnvironment();
        mockSuccessfulExecution();

        const absolutePath = join(sourceRoot, 'deeply', 'nested', 'file.cds');
        const errorMessage = 'Compilation error';

        const result = addCompilationDiagnostic(
          absolutePath,
          errorMessage,
          codeqlExePath,
          sourceRoot,
        );

        expect(result).toBe(true);
        expectRelativePathInCall(`deeply${sep}nested${sep}file.cds`);
        restoreMockEnvironment(originalEnv);
      });

      it('should handle paths with .. that try to escape source root', () => {
        const originalEnv = setupMockEnvironment();
        mockSuccessfulExecution();

        const escapingPath = join(sourceRoot, '..', 'sibling', 'file.cds');
        const errorMessage = 'Compilation error';

        const result = addCompilationDiagnostic(
          escapingPath,
          errorMessage,
          codeqlExePath,
          sourceRoot,
        );

        expect(result).toBe(true);
        // Should point to source root '.' when path tries to escape source root
        expectRelativePathInCall('.');
        // Should include explanatory note in the message
        expect(childProcess.execFileSync).toHaveBeenCalledWith(
          expect.any(String),
          expect.arrayContaining([
            expect.stringMatching(
              /--markdown-message=.*\*\*Note\*\*.*located outside the scanned source directory/s,
            ),
          ]),
        );
        restoreMockEnvironment(originalEnv);
      });

      it('should handle symbolic link paths that resolve outside source root', () => {
        const originalEnv = setupMockEnvironment();
        mockSuccessfulExecution();

        // Simulate a path that might resolve outside via symlinks
        const symlinkPath = '/completely/different/location/file.cds';
        const errorMessage = 'Compilation error';

        const result = addCompilationDiagnostic(
          symlinkPath,
          errorMessage,
          codeqlExePath,
          sourceRoot,
        );

        expect(result).toBe(true);
        // Should point to source root '.' when resolved path is outside source root
        expectRelativePathInCall('.');
        // Should include explanatory note in the message
        expect(childProcess.execFileSync).toHaveBeenCalledWith(
          expect.any(String),
          expect.arrayContaining([
            expect.stringMatching(
              /--markdown-message=.*\*\*Note\*\*.*located outside the scanned source directory/s,
            ),
          ]),
        );
        restoreMockEnvironment(originalEnv);
      });
    });

    describe('addDependencyGraphDiagnostic', () => {
      it('should use source root as relative path for source root directory', () => {
        const originalEnv = setupMockEnvironment();
        mockSuccessfulExecution();

        const errorMessage = 'Dependency graph build failed';

        const result = addDependencyGraphDiagnostic(sourceRoot, errorMessage, codeqlExePath);

        expect(result).toBe(true);
        expectRelativePathInCall('.');
        restoreMockEnvironment(originalEnv);
      });
    });

    describe('addDependencyInstallationDiagnostic', () => {
      it('should use source root as relative path for source root directory', () => {
        const originalEnv = setupMockEnvironment();
        mockSuccessfulExecution();

        const errorMessage = 'Dependency installation failed';

        const result = addDependencyInstallationDiagnostic(sourceRoot, errorMessage, codeqlExePath);

        expect(result).toBe(true);
        expectRelativePathInCall('.');
        restoreMockEnvironment(originalEnv);
      });
    });

    describe('addEnvironmentSetupDiagnostic', () => {
      it('should use source root as relative path for source root directory', () => {
        const originalEnv = setupMockEnvironment();
        mockSuccessfulExecution();

        const errorMessage = 'Environment setup failed';

        const result = addEnvironmentSetupDiagnostic(sourceRoot, errorMessage, codeqlExePath);

        expect(result).toBe(true);
        expectRelativePathInCall('.');
        restoreMockEnvironment(originalEnv);
      });
    });

    describe('addJavaScriptExtractorDiagnostic', () => {
      it('should convert absolute file path to source-root-relative path', () => {
        const originalEnv = setupMockEnvironment();
        mockSuccessfulExecution();

        const absoluteFilePath = join(sourceRoot, 'src', 'main.js');
        const errorMessage = 'JavaScript extractor failed';

        const result = addJavaScriptExtractorDiagnostic(
          absoluteFilePath,
          errorMessage,
          codeqlExePath,
          sourceRoot,
        );

        expect(result).toBe(true);
        expectRelativePathInCall(`src${sep}main.js`);
        restoreMockEnvironment(originalEnv);
      });

      it('should handle source root as file path', () => {
        const originalEnv = setupMockEnvironment();
        mockSuccessfulExecution();

        const errorMessage = 'JavaScript extractor failed';

        const result = addJavaScriptExtractorDiagnostic(
          sourceRoot,
          errorMessage,
          codeqlExePath,
          sourceRoot,
        );

        expect(result).toBe(true);
        expectRelativePathInCall('.');
        restoreMockEnvironment(originalEnv);
      });
    });

    describe('addNoCdsProjectsDiagnostic', () => {
      it('should use source root as relative path for source root directory', () => {
        const originalEnv = setupMockEnvironment();
        mockSuccessfulExecution();

        const warningMessage = 'No CDS projects detected';

        const result = addNoCdsProjectsDiagnostic(sourceRoot, warningMessage, codeqlExePath);

        expect(result).toBe(true);
        expectRelativePathInCall('.');
        restoreMockEnvironment(originalEnv);
      });
    });
  });

  describe('Legacy tests (without sourceRoot parameter)', () => {
    describe('addCompilationDiagnostic', () => {
      it('should add compilation diagnostic successfully', () => {
        const cdsFilePath = '/path/to/model.cds';
        const errorMessage = 'Syntax error in CDS file';
        const codeqlExePath = '/path/to/codeql';

        // Mock process.env to include necessary environment variable
        const originalEnv = process.env;
        process.env = {
          ...originalEnv,
          CODEQL_EXTRACTOR_CDS_WIP_DATABASE: '/path/to/db',
        };

        // Mock successful execution
        (childProcess.execFileSync as jest.Mock).mockReturnValue(Buffer.from(''));

        const result = addCompilationDiagnostic(cdsFilePath, errorMessage, codeqlExePath);

        expect(result).toBe(true);
        expect(childProcess.execFileSync).toHaveBeenCalledWith(
          codeqlExePath,
          expect.arrayContaining([
            'database',
            'add-diagnostic',
            '--extractor-name=cds',
            '--ready-for-status-page',
            '--source-id=cds/compilation-failure',
            '--source-name=Failure to compile one or more SAP CAP CDS files',
            '--severity=error',
            `--markdown-message=${errorMessage}`,
            `--file-path=${cdsFilePath}`,
            '--',
            '/path/to/db',
          ]),
        );

        // Restore original environment
        process.env = originalEnv;
      });

      it('should handle errors when adding diagnostic', () => {
        const cdsFilePath = '/path/to/model.cds';
        const errorMessage = 'Syntax error in CDS file';
        const codeqlExePath = '/path/to/codeql';

        // Mock error during execution
        (childProcess.execFileSync as jest.Mock).mockImplementation(() => {
          throw new Error('Message: Failed to add diagnostic');
        });

        // Mock console.error
        const originalConsoleError = console.error;
        console.error = jest.fn();

        const result = addCompilationDiagnostic(cdsFilePath, errorMessage, codeqlExePath);

        expect(result).toBe(false);
        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining(
            `ERROR: Failed to add error diagnostic for source file=${cdsFilePath}`,
          ),
        );

        // Restore console.error
        console.error = originalConsoleError;
      });
    });

    describe('addJavaScriptExtractorDiagnostic', () => {
      it('should add JavaScript extractor diagnostic successfully', () => {
        const filePath = '/path/to/source/root';
        const errorMessage = 'Message: JavaScript extractor failed';
        const codeqlExePath = '/path/to/codeql';

        // Mock process.env to include necessary environment variable
        const originalEnv = process.env;
        process.env = {
          ...originalEnv,
          CODEQL_EXTRACTOR_CDS_WIP_DATABASE: '/path/to/db',
        };

        // Mock successful execution
        (childProcess.execFileSync as jest.Mock).mockReturnValue(Buffer.from(''));

        const result = addJavaScriptExtractorDiagnostic(filePath, errorMessage, codeqlExePath);

        expect(result).toBe(true);
        expect(childProcess.execFileSync).toHaveBeenCalledWith(
          codeqlExePath,
          expect.arrayContaining([
            'database',
            'add-diagnostic',
            '--extractor-name=cds',
            '--ready-for-status-page',
            '--source-id=cds/js-extractor-failure',
            '--severity=error',
            `--markdown-message=${errorMessage}`,
          ]),
        );

        // Restore original environment
        process.env = originalEnv;
      });
    });
  });

  describe('convertToRelativePath', () => {
    const sourceRoot = '/Users/user/project';

    it('should convert absolute paths within source root to relative paths', () => {
      const absolutePath = join(sourceRoot, 'src', 'models', 'user.cds');
      const result = convertToRelativePath(absolutePath, sourceRoot);
      expect(result).toBe(`src${sep}models${sep}user.cds`);
    });

    it('should return paths already relative to source root as-is', () => {
      const relativePath = `src${sep}models${sep}user.cds`;
      const result = convertToRelativePath(relativePath, sourceRoot);
      expect(result).toBe(relativePath);
    });

    it('should return "." for paths outside source root', () => {
      const outsidePath = '/different/project/file.cds';
      const result = convertToRelativePath(outsidePath, sourceRoot);
      expect(result).toBe('.');
    });

    it('should return "." for paths that escape source root using ..', () => {
      const escapingPath = join(sourceRoot, '..', 'sibling', 'file.cds');
      const result = convertToRelativePath(escapingPath, sourceRoot);
      expect(result).toBe('.');
    });

    it('should return "." when source root is not a string', () => {
      const result = convertToRelativePath('/some/path', null as unknown as string);
      expect(result).toBe('.');
    });

    it('should return "." when file path is not a string', () => {
      const result = convertToRelativePath(null as unknown as string, sourceRoot);
      expect(result).toBe('.');
    });

    it('should handle cross-platform paths correctly', () => {
      // Test Unix-style paths which should work consistently across platforms
      const unixSourceRoot = '/Users/user/project';
      const unixPath = '/Users/user/project/src/models/user.cds';
      const result = convertToRelativePath(unixPath, unixSourceRoot);
      expect(result).toBe(`src${sep}models${sep}user.cds`);
    });

    it('should handle complex relative paths that end up outside source root', () => {
      const complexPath = join(sourceRoot, 'src', '..', '..', '..', 'other', 'file.cds');
      const result = convertToRelativePath(complexPath, sourceRoot);
      expect(result).toBe('.');
    });
  });
});
