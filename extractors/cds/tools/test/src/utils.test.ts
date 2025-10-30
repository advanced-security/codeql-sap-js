import { resolve } from 'path';

import { validateArguments } from '../../src/utils';

// Mock path module
jest.mock('path', () => ({
  resolve: jest.fn(),
}));

const mockedResolve = resolve as jest.MockedFunction<typeof resolve>;

const EXTRACTOR_SCRIPT_NAME = 'cds-extractor.js';

describe('utils', () => {
  describe('validateArguments', () => {
    const originalConsoleWarn = console.warn;

    beforeEach(() => {
      // Mock console.warn to avoid polluting test output
      console.warn = jest.fn();
      // Set up default mock behavior
      mockedResolve.mockImplementation((path: string) =>
        path.startsWith('/') ? path : `/absolute/${path}`,
      );
    });

    afterEach(() => {
      console.warn = originalConsoleWarn;
      jest.clearAllMocks();
    });

    it('should validate when source root is provided', () => {
      const args = ['node', EXTRACTOR_SCRIPT_NAME, 'source-root'];
      const result = validateArguments(args);
      expect(result.isValid).toBe(true);
      expect(result.args).toEqual({
        sourceRoot: '/absolute/source-root',
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
        sourceRoot: '/absolute/source-root',
      });
    });

    it('should handle source root with special characters', () => {
      const specialInputs = [
        'source-root;rm -rf /',
        'source-root|cat /etc/passwd',
        'source-root`whoami`',
        'source-root$(whoami)',
        'source-root{test}',
        'source-root<test>',
        'source-root*test',
        'source-root?test',
        'source-root~test',
      ];

      specialInputs.forEach(input => {
        const args = ['node', EXTRACTOR_SCRIPT_NAME, input];
        const result = validateArguments(args);
        expect(result.isValid).toBe(true);
        expect(result.args).toEqual({
          sourceRoot: `/absolute/${input}`,
        });
      });
    });

    it('should handle source root with null bytes', () => {
      const args = ['node', EXTRACTOR_SCRIPT_NAME, 'source-root\0test'];
      const result = validateArguments(args);
      expect(result.isValid).toBe(true);
      expect(result.args).toEqual({
        sourceRoot: '/absolute/source-root\0test',
      });
    });

    it('should reject empty or non-string source root', () => {
      const args = ['node', EXTRACTOR_SCRIPT_NAME, ''];
      const result = validateArguments(args);
      expect(result.isValid).toBe(false);
      expect(result.usageMessage).toContain('non-empty string');
    });

    it('should reject source root that resolves to root directory', () => {
      // Mock path.resolve to return '/' to test the edge case
      mockedResolve.mockReturnValueOnce('/');

      const args = ['node', EXTRACTOR_SCRIPT_NAME, 'some-path'];
      const result = validateArguments(args);
      expect(result.isValid).toBe(false);
      expect(result.usageMessage).toContain('valid directory');
    });
  });
});
