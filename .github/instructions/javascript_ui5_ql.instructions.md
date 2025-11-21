---
applyTo: 'javascript/frameworks/ui5/**/*.ql,javascript/frameworks/ui5/**/*.qll'
description: 'Instructions for CodeQL queries and library modeling for SAPUI5 framework.'
---

# Copilot Instructions for UI5 Framework CodeQL Files

## PURPOSE

This file contains instructions for working with CodeQL query (`.ql`) and library (`.qll`) files for the SAPUI5 framework in the `javascript/frameworks/ui5/` directory.

## REQUIREMENTS

### COMMON REQUIREMENTS

- ALWAYS follow test-driven development (TDD) practices using CodeQL test commands.
- ALWAYS run `codeql query format --in-place <file>` before committing changes to QL files.
- ALWAYS use `codeql test run` to validate query changes before committing.
- ALWAYS validate query behavior with both positive (should alert) and negative (should not alert) test cases.
- NEVER make assumptions about UI5 framework behavior - validate with real code and CodeQL CLI.
- NEVER commit query changes without passing tests.

### QUERY DEVELOPMENT REQUIREMENTS

- ALWAYS include proper metadata (@name, @description, @kind, @id, @tags).
- ALWAYS import only necessary predicates and classes from the standard library.
- ALWAYS use meaningful predicate and class names that reflect their purpose.
- ALWAYS document complex logic with clear comments, especially binding expression parsing.
- ALWAYS alphabetically order imports from the CodeQL standard library.

### LIBRARY DEVELOPMENT REQUIREMENTS

- ALWAYS model UI5-specific patterns accurately:
  - MVC architecture (Views, Controllers, Models)
  - Data binding expressions and injection risks
  - UI5 view XML files and control bindings
  - Remote flow sources from routing and HTTP requests
  - XSS vulnerabilities in view rendering
  - Path injection in resource loading
  - Formula injection in data exports
  - Log injection and unsafe logging
- ALWAYS extend appropriate CodeQL standard library classes.
- ALWAYS provide source type information for remote flow sources.
- ALWAYS handle both JavaScript controllers and XML views in modeling.

### TESTING REQUIREMENTS

- ALWAYS create comprehensive test cases in `javascript/frameworks/ui5/test/`.
- ALWAYS include both JavaScript controllers and XML views in tests.
- ALWAYS verify expected results before accepting with `codeql test accept`.
- ALWAYS use `codeql test run` with a PrintAST query to understand unfamiliar patterns.
- ALWAYS test binding expression parsing separately.

## PREFERENCES

- PREFER using CodeQL's standard library classes and predicates over custom implementations.
- PREFER precise modeling that minimizes false positives.
- PREFER test cases that represent real-world UI5 usage patterns.
- PREFER to explore AST with PrintAST queries before implementing new models.
- PREFER to test binding expression parser changes thoroughly.

## CONSTRAINTS

- NEVER modify UI5 framework source code - only model it in CodeQL.
- NEVER skip test validation.
- NEVER commit without formatting QL files.
- NEVER assume UI5 patterns without CodeQL CLI validation.
- NEVER skip XML view file modeling for UI5-specific vulnerabilities.

## RELATED PROMPTS

For detailed guidance on UI5 framework development tasks, refer to:
- `.github/prompts/ui5_framework_development.prompt.md` - Comprehensive UI5 modeling guide
- `.github/prompts/test_driven_ql_development.prompt.md` - TDD best practices for QL
- `.github/prompts/cli_resources.prompt.md` - CodeQL CLI command reference
