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
- ALWAYS run `codeql query format --in-place <file>` before committing changes to QL files.
- ALWAYS use `codeql test run` to validate query changes before committing.
- ALWAYS validate query behavior with both positive (should alert) and negative (should not alert) test cases.
- NEVER make assumptions about CAP framework behavior - validate with real code and CodeQL CLI.
- NEVER commit query changes without passing tests.

### QUERY DEVELOPMENT REQUIREMENTS

- ALWAYS include proper metadata (@name, @description, @kind, @id, @tags).
- ALWAYS import only necessary predicates and classes from the standard library.
- ALWAYS use meaningful predicate and class names that reflect their purpose.
- ALWAYS document complex logic with clear comments.
- ALWAYS alphabetically order imports from the CodeQL standard library.

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
- ALWAYS verify expected results before accepting with `codeql test accept`.
- ALWAYS use `codeql test run` with a PrintAST query to understand unfamiliar patterns.

## PREFERENCES

- PREFER using CodeQL's standard library classes and predicates over custom implementations.
- PREFER precise modeling that minimizes false positives.
- PREFER test cases that represent real-world CAP usage patterns.
- PREFER to explore AST with PrintAST queries before implementing new models.

## CONSTRAINTS

- NEVER modify CAP framework source code - only model it in CodeQL.
- NEVER skip test validation.
- NEVER commit without formatting QL files.
- NEVER assume CAP patterns without CodeQL CLI validation.

## RELATED PROMPTS

For detailed guidance on CAP framework development tasks, refer to:
- `.github/prompts/cap_framework_development.prompt.md` - Comprehensive CAP modeling guide
- `.github/prompts/test_driven_ql_development.prompt.md` - TDD best practices for QL
- `.github/prompts/cli_resources.prompt.md` - CodeQL CLI command reference
