---
applyTo: 'javascript/frameworks/xsjs/**/*.ql,javascript/frameworks/xsjs/**/*.qll'
description: 'Instructions for CodeQL queries and library modeling for SAP XSJS framework.'
---

# Copilot Instructions for XSJS Framework CodeQL Files

## PURPOSE

This file contains instructions for working with CodeQL query (`.ql`) and library (`.qll`) files for the SAP XSJS (XS JavaScript) framework in the `javascript/frameworks/xsjs/` directory.

## REQUIREMENTS

### COMMON REQUIREMENTS

- ALWAYS follow test-driven development (TDD) practices using CodeQL test commands.
- ALWAYS use the `mcp_ql-mcp_codeql_query_format` tool (or `codeql query format --in-place <file>`) before committing changes to QL files.
- ALWAYS use the `mcp_ql-mcp_codeql_test_run` tool (or `codeql test run`) to validate individual unit tests for any changed CodeQL libraries and/or queries.
- ALWAYS prefer `ql-mcp` MCP tools over raw `codeql` CLI commands when available — they provide structured output, automatic logging, and better integration with the development workflow.
- NEVER make assumptions about XSJS framework behavior - validate with real JS XSJS code and/or CodeQL unit tests.
- NEVER commit query (`.ql`) or library (`.qll`) changes without first running and validating all unit test(s) associated with such changes.

### QUERY DEVELOPMENT REQUIREMENTS

- ALWAYS include proper metadata (@name, @description, @kind, @id, @tags).
- ALWAYS import only necessary predicates and classes from the standard library.
- ALWAYS use meaningful predicate and class names that reflect their purpose.
- ALWAYS document complex logic with clear comments.
- ALWAYS alphabetically order imports from the CodeQL standard library.
- ALWAYS validate query behavior with both positive (should alert) and negative (should not alert) test cases.

### LIBRARY DEVELOPMENT REQUIREMENTS

- ALWAYS model XSJS-specific patterns accurately:
  - $.request and $.response objects
  - Database connection handling
  - XSJS-specific APIs and libraries
  - Remote flow sources from HTTP requests
  - SQL injection vulnerabilities in database queries
  - XSS vulnerabilities in response writing
  - Path injection in file operations
- ALWAYS extend appropriate CodeQL standard library classes.
- ALWAYS provide source type information for remote flow sources.

### TESTING REQUIREMENTS

- ALWAYS create comprehensive test cases in `javascript/frameworks/xsjs/test/`.
- ALWAYS include realistic XSJS code patterns in tests.
- ALWAYS verify expected results before accepting with `mcp_ql-mcp_codeql_test_accept` (or `codeql test accept`).
- ALWAYS understand the format of `.expected` files:
  - Model tests: Each line = one matched instance of the modeled API/pattern
  - Query tests: Multiple sections (edges, nodes, #select) showing data flow and alerts
- ALWAYS validate that `.expected` files contain the correct number of results.
- ALWAYS check that `#select` section in query tests shows only legitimate security alerts.
- USE `mcp_ql-mcp_codeql_resolve_tests` to discover test files, or `find javascript/frameworks/xsjs/ -type f -name "*.expected"` to locate expected files.

## PREFERENCES

- PREFER using CodeQL's standard library classes and predicates over custom implementations.
- PREFER precise modeling that minimizes false positives.
- PREFER test cases that represent real-world XSJS usage patterns.

## CONSTRAINTS

- NEVER modify XSJS framework source code - only model it in CodeQL.
- NEVER skip test validation.
- NEVER commit without formatting QL files.
- NEVER assume XSJS patterns without CodeQL validation via `ql-mcp` tools or CLI.

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

For detailed guidance on XSJS framework development tasks, refer to:
- `.github/prompts/xsjs_framework_development.prompt.md` - Comprehensive XSJS modeling guide
- `.github/prompts/test_driven_development.prompt.md` - TDD best practices for QL
- `.github/prompts/codeql_test_commands.prompt.md` - CodeQL test command reference
