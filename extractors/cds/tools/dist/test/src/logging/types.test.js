"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
describe('LogLevel type', () => {
    it('should allow valid log levels', () => {
        // This is a compile-time test - if these assignments don't cause TypeScript errors, the test passes
        const debug = 'debug';
        const info = 'info';
        const warn = 'warn';
        const error = 'error';
        expect(debug).toBe('debug');
        expect(info).toBe('info');
        expect(warn).toBe('warn');
        expect(error).toBe('error');
    });
    it('should be a union of specific string literals', () => {
        const validLevels = ['debug', 'info', 'warn', 'error'];
        validLevels.forEach(level => {
            expect(typeof level).toBe('string');
            expect(['debug', 'info', 'warn', 'error']).toContain(level);
        });
    });
});
//# sourceMappingURL=types.test.js.map