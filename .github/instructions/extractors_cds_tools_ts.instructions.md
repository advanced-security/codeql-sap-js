---
applyTo: 'extractors/cds/tools/**/*.ts'
description: 'Instructions for CodeQL CDS extractor TypeScript source and test files.'
---

# Copilot Instructions for `extractors/cds/tools/**/*.ts` files

## PURPOSE

This file contains instructions for working with TypeScript source code files in the `extractors/cds/tools/` directory of the `codeql-sap-js` repository. This includes the main `cds-extractor.ts` entry-point, modular source files in `src/**/*.ts`, and comprehensive test files in `test/**/*.test.ts`.

## REQUIREMENTS

## COMMON REQUIREMENTS

- ALWAYS use modern TypeScript syntax and features compatible with the configured target (ES2020).
- ALWAYS follow best practices for implementing secure and efficient CodeQL extractor functionality.
- ALWAYS order imports, definitions, static lists, and similar constructs alphabetically.
- ALWAYS follow a test-driven development (TDD) approach by writing comprehensive tests for new features or bug fixes.
- ALWAYS fix lint errors by running `npm run lint:fix` from the `extractors/cds/tools/` directory before committing changes.
- ALWAYS maintain consistency between the CDS extractor's compilation behavior and the `extractors/cds/tools/test/cds-compilation-for-actions.test.sh` script to prevent CI/CD workflow failures.
- **ALWAYS run `npm run build:all` from the `extractors/cds/tools/` directory and ensure it passes completely before committing any changes. This is MANDATORY and includes lint checks, test coverage, and bundle validation.**

### CDS EXTRACTOR SOURCE REQUIREMENTS

The following requirements are specific to the CDS extractor main entry-point `cds-extractor.ts` and source files matching `extractors/cds/tools/src/**/*.ts`.

- ALWAYS keep the main entry-point `cds-extractor.ts` focused on orchestration, delegating specific tasks to well-defined modules in `src/`.
- ALWAYS gracefully handle extraction failures using tool-level diagnostics in order to avoid disrupting the overall CodeQL extraction process. Instead of exiting with a non-zero code, the CDS extractor should generate a diagnostic error (or warning) that points to the relative path (from source root) of the problematic source (e.g. `.cds`) file.

### CDS EXTRACTOR TESTING REQUIREMENTS

The following requirements are specific to the CDS extractor test files matching `extractors/cds/tools/test/**/*.test.ts`.

- ALWAYS write unit tests for new functions and classes in corresponding `test/src/**/*.test.ts` files.
- ALWAYS use Jest testing framework with the configured `ts-jest` preset.
- ALWAYS follow the AAA pattern (Arrange, Act, Assert) for test structure.
- ALWAYS mock external dependencies (filesystem, child processes, network calls) using Jest mocks or `mock-fs`.
- ALWAYS test both success and error scenarios with appropriate edge cases.
- ALWAYS maintain test coverage above the established threshold.
- **ALWAYS run `npm test` or `npm run test:coverage` from the `extractors/cds/tools/` directory and ensure all tests pass before committing changes.**

## PREFERENCES

- PREFER modular design with each major functionality implemented in its own dedicated file or module under `src/`.
- PREFER the existing architectural patterns:
  - `src/cds/compiler/` for CDS compiler specific logic
  - `src/cds/parser/` for CDS parser specific logic
  - `src/logging/` for unified logging and performance tracking
  - `src/packageManager/` for dependency management and caching
  - `src/codeql.ts` for CodeQL JavaScript extractor integration
  - `src/environment.ts` for environment setup and validation
- PREFER comprehensive error handling with diagnostic reporting through the `src/diagnostics.ts` module.
- PREFER performance-conscious implementations that minimize filesystem operations and dependency installations.
- PREFER project-aware processing that understands CDS file relationships and dependencies.

## CONSTRAINTS

- NEVER leave any trailing whitespace on any line.
- NEVER directly modify any compiled files in the `dist/` directory; all changes must be made in the corresponding `src/` files and built using the build process.
- NEVER commit changes without verifying that `npm run build:all` passes completely when run from the `extractors/cds/tools/` directory.
- NEVER modify compilation behavior without updating the corresponding test script `extractors/cds/tools/test/cds-compilation-for-actions.test.sh`.
- NEVER process CDS files in isolation - maintain project-aware context for accurate extraction.
- NEVER bypass the unified logging system - use `src/logging/` utilities for all output and diagnostics.
- NEVER commit extra documentation files that purely explain what has been changed and/or fixed; use git commit messages instead of adding any `.md` files that you have not explicitly been requested to create.
