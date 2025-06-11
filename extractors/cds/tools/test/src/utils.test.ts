import { resolve } from 'path';

import { RunMode } from '../../src/runMode';
import { getArg, validateArguments } from '../../src/utils';

const EXTRACTOR_SCRIPT_NAME = 'cds-extractor.js';

describe('utils', () => {
  describe('getArg', () => {
    it('should return the resolved argument value at specified index', () => {
      const args = ['node', 'script.js', '/path/to/argument'];
      const result = getArg(args, 2);
      expect(result).toBe(resolve('/path/to/argument'));
    });

    it('should return the default value when index is out of bounds', () => {
      const args = ['node', 'script.js'];
      const result = getArg(args, 2, 'default');
      expect(result).toBe('default');
    });

    it('should return an empty string if index is out of bounds and no default value is provided', () => {
      const args = ['node', 'script.js'];
      const result = getArg(args, 2);
      expect(result).toBe('');
    });
  });

  describe('validateArguments', () => {
    const originalConsoleWarn = console.warn;

    beforeEach(() => {
      // Mock console.warn to avoid polluting test output
      console.warn = jest.fn();
    });

    afterEach(() => {
      console.warn = originalConsoleWarn;
    });

    it('should validate index-files mode requires 3 arguments', () => {
      const args = [
        'node',
        EXTRACTOR_SCRIPT_NAME,
        RunMode.INDEX_FILES,
        'source-root',
        'response-file',
      ];
      const result = validateArguments(args, RunMode.INDEX_FILES);
      expect(result.isValid).toBe(true);
      expect(result.args).toEqual({
        runMode: RunMode.INDEX_FILES,
        sourceRoot: 'source-root',
        responseFile: 'response-file',
      });
    });

    it('should invalidate index-files mode with missing response file', () => {
      const args = ['node', EXTRACTOR_SCRIPT_NAME, RunMode.INDEX_FILES, 'source-root'];
      const result = validateArguments(args, RunMode.INDEX_FILES);
      expect(result.isValid).toBe(false);
      expect(result.usageMessage).toContain('<response-file>');
    });

    it('should validate debug-parser mode with optional response file', () => {
      // With response file
      const argsWithResponse = [
        'node',
        EXTRACTOR_SCRIPT_NAME,
        RunMode.DEBUG_PARSER,
        'source-root',
        'response-file',
      ];
      const resultWithResponse = validateArguments(argsWithResponse, RunMode.DEBUG_PARSER);
      expect(resultWithResponse.isValid).toBe(true);
      expect(resultWithResponse.args).toEqual({
        runMode: RunMode.DEBUG_PARSER,
        sourceRoot: 'source-root',
        responseFile: 'response-file',
      });

      // Without response file
      const argsWithoutResponse = [
        'node',
        EXTRACTOR_SCRIPT_NAME,
        RunMode.DEBUG_PARSER,
        'source-root',
      ];
      const resultWithoutResponse = validateArguments(argsWithoutResponse, RunMode.DEBUG_PARSER);
      expect(resultWithoutResponse.isValid).toBe(true);
      expect(resultWithoutResponse.args).toEqual({
        runMode: RunMode.DEBUG_PARSER,
        sourceRoot: 'source-root',
        responseFile: '',
      });
    });

    it(`should validate minimum required arguments for runMode=${RunMode.AUTOBUILD}`, () => {
      const args = ['node', EXTRACTOR_SCRIPT_NAME, RunMode.AUTOBUILD, 'source-root'];
      const result = validateArguments(args, RunMode.AUTOBUILD);
      expect(result.isValid).toBe(true);
      expect(result.args).toEqual({
        runMode: RunMode.AUTOBUILD,
        sourceRoot: 'source-root',
        responseFile: '',
      });
    });

    it(`should validate minimum required arguments for runMode=${RunMode.DEBUG_PARSER}`, () => {
      const args = ['node', EXTRACTOR_SCRIPT_NAME, RunMode.DEBUG_PARSER, 'source-root'];
      const result = validateArguments(args, RunMode.DEBUG_PARSER);
      expect(result.isValid).toBe(true);
      expect(result.usageMessage).toContain(
        `${RunMode.DEBUG_PARSER} <source-root> [<response-file>]`,
      );
    });

    it(`should validate minimum required arguments for runMode=${RunMode.INDEX_FILES}`, () => {
      const args = [
        'node',
        EXTRACTOR_SCRIPT_NAME,
        RunMode.INDEX_FILES,
        'source-root',
        'response-file',
      ];
      const result = validateArguments(args, RunMode.INDEX_FILES);
      expect(result.isValid).toBe(true);
      expect(result.usageMessage).toContain(`${RunMode.INDEX_FILES} <source-root> <response-file>`);
      expect(result.args).toEqual({
        runMode: RunMode.INDEX_FILES,
        sourceRoot: 'source-root',
        responseFile: 'response-file',
      });
    });

    it('should invalidate when run mode is not valid', () => {
      const args = ['node', EXTRACTOR_SCRIPT_NAME, 'invalid-mode', 'source-root'];
      const result = validateArguments(args, RunMode.AUTOBUILD);
      expect(result.isValid).toBe(false);
      expect(result.usageMessage).toContain('Invalid run mode');
      expect(result.usageMessage).toContain('Supported run modes:');
    });
  });
});
