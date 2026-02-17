// Suppress Node.js v25+ localStorage warning triggered by jest-environment-node
// teardown accessing globalThis.localStorage before --localstorage-file is set.
// Setting the env var here ensures it propagates to all Jest worker processes.
const nodeVersion = parseInt(process.versions.node, 10);
if (nodeVersion >= 25 && !process.env.NODE_OPTIONS?.includes('--localstorage-file')) {
  const localStoragePath = require('path').join(
    require('os').tmpdir(),
    '.jest-cds-extractor-localstorage',
  );
  process.env.NODE_OPTIONS = [
    process.env.NODE_OPTIONS,
    `--localstorage-file=${localStoragePath}`,
  ]
    .filter(Boolean)
    .join(' ');
}

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.ts'],
  roots: ['<rootDir>/src/', '<rootDir>/test/'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!**/node_modules/**'],
  coverageReporters: ['text', 'lcov', 'clover', 'json'],
  coverageDirectory: 'coverage',
  verbose: true,
  moduleDirectories: ['node_modules', 'src'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        diagnostics: {
          warnOnly: true,
        },
      },
    ],
  },
};
