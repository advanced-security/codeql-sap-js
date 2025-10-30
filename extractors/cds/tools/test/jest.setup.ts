import * as path from 'path';

import { setSourceRootDirectory } from '../src/logging';

// Set up the source root directory for logging during tests
const testSourceRoot = path.resolve(__dirname, '..');
setSourceRootDirectory(testSourceRoot);

// Mocked console methods to prevent output during tests
// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug,
};

// Mock the console methods to suppress output during tests
console.log = jest.fn();
console.warn = jest.fn();
console.error = jest.fn();
console.info = jest.fn();
console.debug = jest.fn();

// Restore original console methods after all tests are done
afterAll(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;
});
