---
applyTo: 'javascript/frameworks/cap/**/*.ql,javascript/frameworks/cap/**/*.qll'
description: 'Instructions for CodeQL queries and library modeling for SAP CAP framework.'
---

# Copilot Instructions for CAP Framework CodeQL Files

## PURPOSE

This file contains instructions for working with CodeQL query (`.ql`) and library (`.qll`) files for the SAP Cloud Application Programming (CAP) framework in the `javascript/frameworks/cap/` directory.

## REQUIREMENTS

### COMMON REQUIREMENTS

- ALWAYS follow test-driven development (TDD) practices using CodeQL test commands.
- ALWAYS generate `.expected` files proactively for new tests BEFORE running tests.
- ALWAYS analyze test code to predict expected results rather than only accepting actual results.
- ALWAYS use the `mcp_ql-mcp_codeql_query_format` tool (or `codeql query format --in-place <file>`) before committing changes to QL files.
- ALWAYS use the `mcp_ql-mcp_codeql_test_run` tool (or `codeql test run`) to validate individual unit tests for any changed CodeQL libraries and/or queries.
- ALWAYS prefer `ql-mcp` MCP tools over raw `codeql` CLI commands when available — they provide structured output, automatic logging, and better integration with the development workflow.
- NEVER make assumptions about CAP framework behavior - validate with real JS CAP code and/or CodeQL unit tests.
- NEVER commit query (`.ql`) or library (`.qll`) changes without first running and validating all unit test(s) associated with such changes.

### QUERY DEVELOPMENT REQUIREMENTS

- ALWAYS include proper metadata (@name, @description, @kind, @id, @tags).
- ALWAYS import only necessary predicates and classes from the standard library.
- ALWAYS use meaningful predicate and class names that reflect their purpose.
- ALWAYS document complex logic with clear comments.
- ALWAYS alphabetically order imports from the CodeQL standard library.
- ALWAYS validate query behavior with both positive (should alert) and negative (should not alert) test cases.

### LIBRARY DEVELOPMENT REQUIREMENTS

- ALWAYS model CAP-specific patterns accurately:
  - Event handlers (srv.on, srv.before, srv.after)
  - Remote flow sources from request parameters
  - CDS service definitions and implementations
  - CAP-specific data flow and taint tracking
- ALWAYS extend appropriate CodeQL standard library classes.
- ALWAYS provide source type information for remote flow sources.

### TESTING REQUIREMENTS

- ALWAYS create comprehensive test cases in `javascript/frameworks/cap/test/`.
- ALWAYS include both JavaScript and CDS files in tests when relevant.
- FOR NEW TESTS: Generate `.expected` file BEFORE implementing the query/model:
  1. Document what pattern should be detected
  2. Create test code demonstrating the pattern
  3. Manually create `.expected` file with predicted results based on analysis
  4. Implement the query/model
  5. Run `mcp_ql-mcp_codeql_test_run` (or `codeql test run`) - ideally test passes immediately
- FOR EXISTING TESTS: Verify expected results before accepting with `mcp_ql-mcp_codeql_test_accept` (or `codeql test accept`).
- ALWAYS understand the format of `.expected` files:
  - Model tests: Each line = one matched instance of the modeled API/pattern
  - Query tests: Multiple sections (edges, nodes, #select) showing data flow and alerts
- ALWAYS validate that `.expected` files contain the correct number of results.
- ALWAYS check that `#select` section in query tests shows only legitimate security alerts.
- USE `mcp_ql-mcp_codeql_resolve_tests` to discover test files, or `find javascript/frameworks/cap/ -type f -name "*.expected"` to locate expected files.

## PREFERENCES

- PREFER using CodeQL's standard library classes and predicates over custom implementations.
- PREFER precise modeling that minimizes false positives.
- PREFER test cases that represent real-world CAP usage patterns.

## CONSTRAINTS

- NEVER modify CAP framework source code - only model it in CodeQL.
- NEVER skip test validation.
- NEVER commit without formatting QL files.
- NEVER assume CAP patterns without CodeQL validation via `ql-mcp` tools or CLI.

## QL-MCP TOOLS

Prefer `ql-mcp` MCP server tools over raw CLI commands for all CodeQL operations:
- `mcp_ql-mcp_codeql_test_run` — Run unit tests (replaces `codeql test run`)
- `mcp_ql-mcp_codeql_test_accept` — Accept test results (replaces `codeql test accept`)
- `mcp_ql-mcp_codeql_query_format` — Format `.ql`/`.qll` files (replaces `codeql query format`)
- `mcp_ql-mcp_codeql_query_compile` — Compile a query (replaces `codeql query compile`)
- `mcp_ql-mcp_validate_codeql_query` — Static validation of a query file
- `mcp_ql-mcp_codeql_resolve_tests` — Discover test `.qlref`/`.ql` files in a directory
- `mcp_ql-mcp_codeql_resolve_queries` — List queries under a directory
- `mcp_ql-mcp_search_ql_code` — Search QL code by pattern across files
- `mcp_ql-mcp_find_class_position` / `mcp_ql-mcp_find_predicate_position` — Navigate QL code
- `mcp_ql-mcp_codeql_lsp_diagnostics` — Inline diagnostics for QL code snippets
- `mcp_ql-mcp_codeql_query_run` + `mcp_ql-mcp_codeql_bqrs_decode` — Run queries ad-hoc and decode BQRS results

## RELATED PROMPTS

For detailed guidance on CAP framework development tasks, refer to:
- `.github/prompts/cap_framework_development.prompt.md` - Comprehensive CAP modeling guide
- `.github/prompts/test_driven_development.prompt.md` - TDD best practices for QL
- `.github/prompts/codeql_test_commands.prompt.md` - CodeQL test command reference
