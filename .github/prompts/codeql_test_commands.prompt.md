# CodeQL Test Commands Reference

This file provides CodeQL test commands used across framework modeling agents. **Prefer `ql-mcp` MCP server tools** over raw `codeql` CLI commands when available — they provide structured output, automatic logging, and better integration with the development workflow.

## QL-MCP Tool Quick Reference

| Task | ql-mcp Tool | CLI Fallback |
|------|-------------|--------------|
| Run tests | `mcp_ql-mcp_codeql_test_run` | `codeql test run` |
| Accept results | `mcp_ql-mcp_codeql_test_accept` | `codeql test accept` |
| Extract test DB | `mcp_ql-mcp_codeql_test_extract` | `codeql test extract` |
| Format QL files | `mcp_ql-mcp_codeql_query_format` | `codeql query format` |
| Compile query | `mcp_ql-mcp_codeql_query_compile` | `codeql query compile` |
| Validate query | `mcp_ql-mcp_validate_codeql_query` | (none) |
| Discover tests | `mcp_ql-mcp_codeql_resolve_tests` | manual `find` |
| List queries | `mcp_ql-mcp_codeql_resolve_queries` | `codeql resolve queries` |
| Search QL code | `mcp_ql-mcp_search_ql_code` | `grep` on `.ql`/`.qll` |
| Find class | `mcp_ql-mcp_find_class_position` | manual search |
| Find predicate | `mcp_ql-mcp_find_predicate_position` | manual search |
| QL diagnostics | `mcp_ql-mcp_codeql_lsp_diagnostics` | (none) |
| Document symbols | `mcp_ql-mcp_codeql_lsp_document_symbols` | (none) |
| Go-to-definition | `mcp_ql-mcp_codeql_lsp_definition` | (none) |
| Find references | `mcp_ql-mcp_codeql_lsp_references` | (none) |
| Code completion | `mcp_ql-mcp_codeql_lsp_completion` | (none) |
| Run ad-hoc query | `mcp_ql-mcp_codeql_query_run` | `codeql query run` |
| Decode BQRS | `mcp_ql-mcp_codeql_bqrs_decode` | `codeql bqrs decode` |
| BQRS info | `mcp_ql-mcp_codeql_bqrs_info` | `codeql bqrs info` |
| Interpret BQRS | `mcp_ql-mcp_codeql_bqrs_interpret` | `codeql bqrs interpret` |
| Query metadata | `mcp_ql-mcp_codeql_resolve_metadata` | `codeql resolve metadata` |
| Generate scaffold | `mcp_ql-mcp_create_codeql_query` | (none) |
| Quick evaluate | `mcp_ql-mcp_quick_evaluate` | (none) |

## Running Tests

**ql-mcp (preferred):** Use `mcp_ql-mcp_codeql_test_run` with a `tests` array of absolute directory paths.

**CLI fallback:** The `codeql test run` command is the fallback way to test CodeQL queries. It:
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

**ql-mcp (preferred):** Use `mcp_ql-mcp_codeql_test_accept` with a `tests` array.

**CLI fallback:** After reviewing test results and confirming they are correct:

```bash
# Accept test results (updates .expected files)
codeql test accept <test-directory-path>

# Example:
codeql test accept javascript/frameworks/cap/test/sql-injection
```

## Formatting Queries

**ql-mcp (preferred):** Use `mcp_ql-mcp_codeql_query_format` with a `files` array. Returns the formatted output.

**CLI fallback:** Always format QL files before committing:

```bash
# Format a single query file
codeql query format --in-place <query-file.ql>

# Format a library file
codeql query format --in-place <library-file.qll>
```

## Compiling Queries

**ql-mcp (preferred):** Use `mcp_ql-mcp_codeql_query_compile` with a `query` path. Also consider `mcp_ql-mcp_validate_codeql_query` for static validation.

**CLI fallback:** Verify query syntax:

```bash
# Compile query to check for errors
codeql query compile <query-file.ql>
```

## Discovering Tests and Queries

**ql-mcp (preferred):**
- Use `mcp_ql-mcp_codeql_resolve_tests` to discover all `.qlref` and `.ql` test files under a directory.
- Use `mcp_ql-mcp_codeql_resolve_queries` to list all queries under a source directory.

## Ad-Hoc Query Execution and Result Inspection

**ql-mcp only:** For ad-hoc exploration, use `mcp_ql-mcp_codeql_test_extract` to extract a test database, then `mcp_ql-mcp_codeql_query_run` to run a query, then inspect results with:
- `mcp_ql-mcp_codeql_bqrs_info` — list result sets and column types in a `.bqrs` file
- `mcp_ql-mcp_codeql_bqrs_decode` — decode BQRS to tabular output (set `entities` to `url` for file:line locations)
- `mcp_ql-mcp_codeql_bqrs_interpret` — interpret BQRS as SARIF-style alerts

## QL Code Navigation (ql-mcp only)

These tools have no CLI equivalent and are available only via `ql-mcp`:
- `mcp_ql-mcp_search_ql_code` — search QL code by pattern across files
- `mcp_ql-mcp_find_class_position` — find the location of a class in a `.qll` file
- `mcp_ql-mcp_find_predicate_position` — find the location of a predicate in a `.qll` file
- `mcp_ql-mcp_codeql_lsp_diagnostics` — check QL code snippets for errors
- `mcp_ql-mcp_codeql_lsp_document_symbols` — list symbols in a QL file
- `mcp_ql-mcp_codeql_lsp_definition` — jump to definition
- `mcp_ql-mcp_codeql_lsp_references` — find all references
- `mcp_ql-mcp_codeql_lsp_completion` — get code completions

## Viewing Test Results

```bash
# View actual test results
cat <test-directory>/*.actual

# View expected results
cat <test-directory>/*.expected

# Compare differences
diff <test-directory>/*.expected <test-directory>/*.actual
```

## Test-Driven Development (TDD) Workflow

For **new** queries or models, follow this TDD approach to generate `.expected` files proactively:

### Step 1: Define Detection Target
Document what the query/model should detect:
- Specific API calls, patterns, or code constructs
- Source and sink locations for data flow
- Expected number of results

### Step 2: Create Test Code
Write test cases demonstrating the pattern:
```javascript
// test.js - Example showing vulnerable pattern
const userInput = req.data.id; // Source at line 1
db.run(`SELECT * FROM table WHERE id = ${userInput}`); // Sink at line 2
```

### Step 3: Generate .expected File
**BEFORE running tests**, create the `.expected` file based on your analysis:

**For model tests:**
```bash
# Create .expected with predicted matches
# Format: | location | context | location | code |
cat > test.expected << 'EOF'
| test.js:2:1:2:50 | test.js:2 | test.js:2:1:2:50 | db.run(...) |
EOF
```

**For query tests:**
```bash
# Create .expected with predicted data flow and alerts
cat > test.expected << 'EOF'
edges
| test.js:1:15:1:25 | req.data.id | test.js:2:40:2:49 | userInput | provenance |  |

nodes
| test.js:1:15:1:25 | req.data.id | semmle.label | req.data.id |
| test.js:2:40:2:49 | userInput | semmle.label | userInput |

#select
| test.js:2:1:2:50 | db.run(...) | test.js:1:15:1:25 | req.data.id | test.js:2:40:2:49 | userInput | This query depends on a $@. | test.js:1:15:1:25 | req.data.id | user-provided value |
EOF
```

### Step 4: Implement Query/Model
Write the CodeQL code to detect the pattern.

### Step 5: Run Tests
```bash
# ql-mcp (preferred): use mcp_ql-mcp_codeql_test_run with tests array
# CLI fallback:
codeql test run <test-directory>
```

### Step 6: Validate Results
**Ideal outcome:** Test passes immediately (actual matches expected)
```bash
# If test passes - no action needed!

# If test fails - analyze differences
diff <test-directory>/*.expected <test-directory>/*.actual
```

### Step 7: Iterate if Needed
- If actual has extra results → false positives, refine query
- If actual missing results → false negatives, expand query
- Update `.expected` only if your initial analysis was incorrect

### Step 8: Format and Commit
```bash
# ql-mcp (preferred): use mcp_ql-mcp_codeql_query_format with files array
# CLI fallback:
codeql query format --in-place <query-file.ql>
```

## Traditional Workflow (Updating Existing Tests)

When modifying existing queries/models:

```bash
# 1. Format query files
#    ql-mcp: mcp_ql-mcp_codeql_query_format
codeql query format --in-place <query-file.ql>

# 2. Run tests
#    ql-mcp: mcp_ql-mcp_codeql_test_run
codeql test run <test-directory>

# 3. Review results
cat <test-directory>/*.actual

# 4. ONLY accept new results (i.e. update .expected results) if
#    you are certain that all lines (i.e. results) in the .actual
#    file are correct and, thus, to be expected.
#    ql-mcp: mcp_ql-mcp_codeql_test_accept
codeql test accept <test-directory>
```

## Understanding .expected Files

The `.expected` file format varies depending on the query type:

### Model Tests (Library .qll files)

Model tests validate CodeQL library modeling. Each line in the `.expected` file represents a single result tuple:

```
| <file>:<start_line>:<start_col>:<end_line>:<end_col> | <file>:<line> | <file>:<start_line>:<start_col>:<end_line>:<end_col> | <code_representation> |
```

**Example from `javascript/frameworks/cap/test/models/cql/insert/insert.expected`:**
```
| insert.js:2:14:5:2 | insert.js:2 | insert.js:2:14:5:2 | INSERT( ... " },\\n]) |
| insert.js:6:14:9:2 | insert.js:6 | insert.js:6:14:9:2 | INSERT( ... " },\\n]) |
```

Each line represents:
- Column 1: Location of the matched AST node (file:start_line:start_col:end_line:end_col)
- Column 2: Context location (file:line)
- Column 3: Full location range
- Column 4: String representation of the code

### Query Tests (Security .ql files)

Query tests for security vulnerabilities include data flow information. The `.expected` file has multiple sections:

**Section 1: `edges` - Data flow edges showing taint propagation**
```
edges
| <source_location> | <source_code> | <sink_location> | <sink_code> | provenance | <config> |
```

**Section 2: `nodes` - All data flow nodes involved**
```
nodes
| <location> | <code> | semmle.label | <label> |
```

**Section 3: `subpaths` - Additional path information (optional)**

**Section 4: `#select` - Final query results (alerts)**
```
#select
| <alert_location> | <alert_element> | <source_location> | <source> | <sink_location> | <sink> | <message> | <source_location> | <source> | <link_text> |
```

**Example from `javascript/frameworks/cap/test/queries/loginjection/log-injection-without-protocol-none/log-injection-without-protocol-none.expected`:**
```
edges
| srv/service1.js:7:19:7:35 | { messageToPass } | srv/service1.js:7:21:7:33 | messageToPass | provenance |  |
| srv/service1.js:7:21:7:33 | messageToPass | srv/service1.js:9:38:9:50 | messageToPass | provenance |  |

nodes
| srv/service1.js:7:19:7:35 | { messageToPass } | semmle.label | { messageToPass } |
| srv/service1.js:7:21:7:33 | messageToPass | semmle.label | messageToPass |

#select
| srv/service2.js:9:32:9:44 | messageToPass | srv/service1.js:7:39:7:46 | req.data | srv/service2.js:9:32:9:44 | messageToPass | Log entry depends on a $@. | srv/service1.js:7:39:7:46 | req.data | user-provided value |
```

### Finding .expected Files

Use `mcp_ql-mcp_codeql_resolve_tests` to discover test files, or these shell commands to locate `.expected` files:

```bash
# Find all .expected files for CAP framework
find javascript/frameworks/cap/ -type f -name "*.expected"

# Find all .expected files for UI5 framework
find javascript/frameworks/ui5/ -type f -name "*.expected"

# Find all .expected files for XSJS framework
find javascript/frameworks/xsjs/ -type f -name "*.expected"

# Find only model test .expected files
find javascript/frameworks/cap/test/models/ -type f -name "*.expected"

# Find only query test .expected files
find javascript/frameworks/cap/test/queries/ -type f -name "*.expected"
```

### Interpreting Results

- **Model tests**: Each line = one instance of the modeled API/pattern detected
- **Query tests**:
  - `edges` = data flow paths from source to sink
  - `nodes` = all intermediate steps in taint tracking
  - `#select` = actual security alerts that would be shown to users

When validating tests:
1. Count the lines in `#select` section to know how many alerts are expected
2. Verify each alert shows the correct source and sink locations
3. Check that the data flow path in `edges` makes logical sense
4. Ensure no false positives (alerts that shouldn't be there)
5. Ensure no false negatives (missing alerts that should be there)

## Important Notes

- **Prefer `ql-mcp` tools** over `codeql` CLI commands when available — they provide structured output and automatic logging.
- **Do NOT use** `codeql query run` for testing - use `mcp_ql-mcp_codeql_test_run` (or `codeql test run`) instead.
- Use `mcp_ql-mcp_codeql_query_run` + `mcp_ql-mcp_codeql_bqrs_decode` only for ad-hoc exploration outside of tests.
- Tests automatically handle database extraction, query execution, and result comparison.
- Always review `.actual` files before accepting with `mcp_ql-mcp_codeql_test_accept` (or `codeql test accept`).
- Each line in `.expected` represents one result from the query execution.
- For path queries, the `#select` section contains the final alerts shown to users.
- Model tests have simpler output (just matched nodes), query tests include full data flow.
