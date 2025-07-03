import { resolve } from 'path';

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

    it('should validate when source root is provided', () => {
      const args = ['node', EXTRACTOR_SCRIPT_NAME, 'source-root'];
      const result = validateArguments(args);
      expect(result.isValid).toBe(true);
      expect(result.args).toEqual({
        sourceRoot: 'source-root',
      });
    });

    it('should invalidate when source root is missing', () => {
      const args = ['node', EXTRACTOR_SCRIPT_NAME];
      const result = validateArguments(args);
      expect(result.isValid).toBe(false);
      expect(result.usageMessage).toContain('<source-root>');
    });

    it('should invalidate when no arguments are provided', () => {
      const args: string[] = [];
      const result = validateArguments(args);
      expect(result.isValid).toBe(false);
      expect(result.usageMessage).toContain('<source-root>');
    });

    it('should handle additional arguments gracefully', () => {
      const args = ['node', EXTRACTOR_SCRIPT_NAME, 'source-root', 'extra-arg'];
      const result = validateArguments(args);
      expect(result.isValid).toBe(true);
      expect(result.args).toEqual({
        sourceRoot: 'source-root',
      });
    });
  });
});
