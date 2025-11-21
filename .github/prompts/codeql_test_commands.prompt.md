# CodeQL Test Commands Reference

This file provides common CodeQL test commands used across framework modeling agents.

## Running Tests

The `codeql test run` command is the primary way to test CodeQL queries. It:
1. Extracts a test database from source code in the test directory
2. Runs the query against the extracted database
3. Compares results to `.expected` files

```bash
# Run tests for a specific test directory
codeql test run <test-directory-path>

# Examples:
codeql test run javascript/frameworks/cap/test/sql-injection
codeql test run javascript/frameworks/ui5/test/xss
codeql test run javascript/frameworks/xsjs/test/sql-injection
```

## Accepting Test Results

After reviewing test results and confirming they are correct:

```bash
# Accept test results (updates .expected files)
codeql test accept <test-directory-path>

# Example:
codeql test accept javascript/frameworks/cap/test/sql-injection
```

## Formatting Queries

Always format QL files before committing:

```bash
# Format a single query file
codeql query format --in-place <query-file.ql>

# Format a library file
codeql query format --in-place <library-file.qll>
```

## Compiling Queries

Verify query syntax:

```bash
# Compile query to check for errors
codeql query compile <query-file.ql>
```

## Viewing Test Results

```bash
# View actual test results
cat <test-directory>/*.actual

# View expected results
cat <test-directory>/*.expected

# Compare differences
diff <test-directory>/*.expected <test-directory>/*.actual
```

## Common Workflow

```bash
# 1. Create test case files in test directory
# 2. Run tests
codeql test run <test-directory>

# 3. Review results
cat <test-directory>/*.actual

# 4. If correct, accept
codeql test accept <test-directory>

# 5. Format query files
codeql query format --in-place <query-file.ql>
```

## Important Notes

- **Do NOT use** `codeql test extract` in normal workflow - `codeql test run` handles extraction
- **Do NOT use** `codeql query run` for testing - use `codeql test run` instead
- Tests automatically handle database extraction, query execution, and result comparison
- Always review `.actual` files before accepting with `codeql test accept`
