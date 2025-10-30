import type { LogLevel } from '../../../src/logging/types';

describe('LogLevel type', () => {
  it('should allow valid log levels', () => {
    // This is a compile-time test - if these assignments don't cause TypeScript errors, the test passes
    const debug: LogLevel = 'debug';
    const info: LogLevel = 'info';
    const warn: LogLevel = 'warn';
    const error: LogLevel = 'error';

    expect(debug).toBe('debug');
    expect(info).toBe('info');
    expect(warn).toBe('warn');
    expect(error).toBe('error');
  });

  it('should be a union of specific string literals', () => {
    const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

    validLevels.forEach(level => {
      expect(typeof level).toBe('string');
      expect(['debug', 'info', 'warn', 'error']).toContain(level);
    });
  });
});
