import fs from 'fs';
import path from 'path';

import { CdsProject, writeParserDebugInfo } from '../../../../src/cds/parser';

// Mock fs and path modules
jest.mock('fs');
jest.mock('path');

describe('writeParserDebugInfo', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.resetAllMocks();
    // Set up basic mock behavior
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
    (fs.existsSync as jest.Mock).mockReturnValue(true);
  });

  it('should create debug directory if it does not exist', () => {
    // Setup
    const mockProject: CdsProject = {
      projectDir: 'test-project',
      cdsFiles: ['file1.cds', 'file2.cds'],
      packageJson: {
        name: 'test-package',
        dependencies: {
          '@sap/cds': '5.0.0',
        },
      },
      dependencies: [],
    };
    const projectMap = new Map<string, CdsProject>();
    projectMap.set('test-project', mockProject);
    const sourceRootDir = '/source/root';
    const scriptDir = '/script/dir';

    // Mock existsSync to return false to simulate directory not existing
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    // Execute
    const result = writeParserDebugInfo(projectMap, sourceRootDir, scriptDir);

    // Verify
    expect(result).toBe(true);
    expect(fs.mkdirSync).toHaveBeenCalledWith('/script/dir/debug', { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('should write debug information successfully', () => {
    // Setup
    const mockProject: CdsProject = {
      projectDir: 'test-project',
      cdsFiles: ['file1.cds', 'file2.cds'],
      packageJson: {
        name: 'test-package',
        dependencies: {
          '@sap/cds': '5.0.0',
        },
      },
      dependencies: [],
    };
    const projectMap = new Map<string, CdsProject>();
    projectMap.set('test-project', mockProject);

    const sourceRootDir = '/source/root';
    const scriptDir = '/script/dir';

    // Execute
    const result = writeParserDebugInfo(projectMap, sourceRootDir, scriptDir);

    // Verify
    expect(result).toBe(true);
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      '/script/dir/debug/cds-extractor.parser.debug.txt',
      expect.any(String),
      'utf-8',
    );
  });

  it('should handle errors and return false', () => {
    // Setup
    const mockProject: CdsProject = {
      projectDir: 'test-project',
      cdsFiles: ['file1.cds', 'file2.cds'],
      packageJson: {
        name: 'test-package',
        dependencies: {
          '@sap/cds': '5.0.0',
        },
      },
      dependencies: [],
    };
    const projectMap = new Map<string, CdsProject>();
    projectMap.set('test-project', mockProject);
    const sourceRootDir = '/source/root';
    const scriptDir = '/script/dir';

    // Mock writeFileSync to throw an error
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('Test error');
    });

    // Spy on console.error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Execute
    const result = writeParserDebugInfo(projectMap, sourceRootDir, scriptDir);

    // Verify
    expect(result).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error writing parser debug information'),
    );

    // Clean up
    consoleErrorSpy.mockRestore();
  });

  it('should handle empty project map and return false', () => {
    // Setup
    const projectMap = new Map<string, CdsProject>();
    const sourceRootDir = '/source/root';
    const scriptDir = '/script/dir';

    // Spy on console.warn
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Execute
    const result = writeParserDebugInfo(projectMap, sourceRootDir, scriptDir);

    // Verify
    expect(result).toBe(false);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Cannot write debug information'),
    );

    // Clean up
    consoleWarnSpy.mockRestore();
  });
});
