# CDS Extractor Development Prompt

This prompt provides comprehensive guidance for developing and maintaining the CodeQL CDS (Core Data Services) extractor TypeScript implementation.

## Overview

The CDS extractor is a TypeScript-based tool that integrates with CodeQL's JavaScript extractor to analyze CDS files in SAP CAP projects. It compiles CDS files to JavaScript and ensures proper extraction for CodeQL analysis.

## Development Workflow

### 1. Understanding the Architecture

The CDS extractor follows a modular architecture:

```
extractors/cds/tools/
├── cds-extractor.ts          # Main entry point (orchestration only)
├── src/
│   ├── cds/
│   │   ├── compiler/         # CDS compilation logic
│   │   └── parser/           # CDS parsing logic
│   ├── logging/              # Unified logging and diagnostics
│   ├── packageManager/       # npm dependency management
│   ├── codeql.ts            # CodeQL extractor integration
│   ├── diagnostics.ts       # Error reporting
│   └── environment.ts       # Environment setup
├── test/
│   └── src/                 # Unit tests mirroring src/ structure
└── dist/                    # Compiled outputs (auto-generated)
```

### 2. Test-Driven Development

Always follow TDD:

1. **Write test first**: Create test in `test/src/**/*.test.ts`
2. **Run test (should fail)**: `npm test`
3. **Implement feature**: Update code in `src/`
4. **Run test (should pass)**: `npm test`
5. **Refactor**: Clean up code while keeping tests passing
6. **Build**: Run `npm run build:all` to ensure everything passes

### 3. Common Tasks

#### Adding New Functionality

```bash
# 1. Create test file
touch extractors/cds/tools/test/src/newfeature/newfeature.test.ts

# 2. Write failing test
# (edit test file)

# 3. Run tests to confirm failure
cd extractors/cds/tools
npm test

# 4. Implement feature
touch extractors/cds/tools/src/newfeature.ts

# 5. Run tests until passing
npm test

# 6. Build and validate
npm run build:all
```

#### Fixing a Bug

```bash
# 1. Write test that reproduces bug
# (edit or create test file)

# 2. Confirm test fails
npm test

# 3. Fix bug in source
# (edit source file)

# 4. Confirm test passes
npm test

# 5. Build and validate
npm run build:all
```

#### Upgrading Dependencies

```bash
cd extractors/cds/tools

# 1. Check for outdated packages
npm outdated

# 2. Check for security issues
npm audit

# 3. Update specific package
npm install <package>@latest

# 4. Run all tests
npm run build:all

# 5. Commit if successful
git add package.json package-lock.json
git commit -m "Upgrade <package> to <version>"
```

### 4. Error Handling Best Practices

The CDS extractor should never exit with non-zero code during extraction. Instead:

```typescript
try {
  await processCdsFile(file);
} catch (error) {
  // Report diagnostic instead of throwing
  diagnostics.reportError(
    getRelativePath(sourceRoot, file),
    `Failed to compile: ${error.message}`
  );
  // Continue processing other files
  return;
}
```

### 5. Logging Best Practices

Always use the unified logging system:

```typescript
import { logger } from './logging';

// Performance tracking
const timer = logger.startTimer('operationName');
// ... perform operation ...
timer.end();

// Logging messages
logger.info('Processing file', { file: filename });
logger.warn('Unexpected condition', { details });
logger.error('Operation failed', { error: error.message });
```

### 6. Testing Best Practices

Use Jest with TypeScript:

```typescript
import { mockFs } from 'mock-fs';
import { MyClass } from '../../src/mymodule';

describe('MyClass', () => {
  beforeEach(() => {
    // Setup
    mockFs({
      'test.txt': 'content'
    });
  });

  afterEach(() => {
    // Cleanup
    mockFs.restore();
  });

  it('should perform expected operation', async () => {
    // Arrange
    const instance = new MyClass();

    // Act
    const result = await instance.operation();

    // Assert
    expect(result).toBe(expectedValue);
  });
});
```

## Validation Checklist

Before committing any changes:

- [ ] All tests pass: `npm test`
- [ ] Linting passes: `npm run lint:fix`
- [ ] Build succeeds: `npm run build`
- [ ] Bundle validation passes: `npm run build:all`
- [ ] No trailing whitespace in any file
- [ ] Test coverage maintained or improved
- [ ] Documentation updated if needed

## Related Resources

- Jest documentation: https://jestjs.io/
- TypeScript documentation: https://www.typescriptlang.org/
- SAP CDS documentation: https://cap.cloud.sap/docs/cds/
- CodeQL extractor documentation: https://codeql.github.com/docs/codeql-cli/extractor-options/
