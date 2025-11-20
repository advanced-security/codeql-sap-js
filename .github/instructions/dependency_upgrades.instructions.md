---
applyTo: 'extractors/cds/tools/package.json,.github/workflows/*.yml'
description: 'Instructions for upgrading dependencies including CodeQL CLI, QLT, Node.js packages, and GitHub Actions.'
---

# Copilot Instructions for Dependency Upgrades

## PURPOSE

This file contains instructions for upgrading various dependencies in the codeql-sap-js repository, including CodeQL CLI, QLT, Node.js packages, and GitHub Actions versions.

## REQUIREMENTS

### COMMON REQUIREMENTS

- ALWAYS check for security vulnerabilities before and after upgrades using `npm audit`.
- ALWAYS run comprehensive tests after dependency upgrades.
- ALWAYS check release notes for breaking changes before upgrading.
- ALWAYS validate that workflows still function after GitHub Actions upgrades.
- NEVER upgrade major versions without thorough testing.
- NEVER ignore npm audit warnings for high/critical vulnerabilities.
- NEVER skip running tests after dependency upgrades.

### NODE.JS DEPENDENCY UPGRADES

- ALWAYS run `npm outdated` to identify packages needing updates.
- ALWAYS run `npm audit` to check for security vulnerabilities.
- ALWAYS run `npm run build:all` from `extractors/cds/tools/` after upgrades.
- ALWAYS update dependencies in `extractors/cds/tools/package.json`.
- PREFER semantic versioning and pin exact versions when needed for reproducibility.

### CODEQL/QLT CLI UPGRADES

- ALWAYS check latest release versions on GitHub before upgrading.
- ALWAYS update version references in `.github/workflows/*.yml`.
- ALWAYS update version references in scripts if applicable.
- ALWAYS monitor CI/CD workflows after PR creation to ensure compatibility.
- ALWAYS run CodeQL test suites in `javascript/frameworks/*/test/` after upgrade.

### GITHUB ACTIONS UPGRADES

- ALWAYS check for Dependabot alerts or newer action versions.
- ALWAYS update action versions in `.github/workflows/*.yml`.
- ALWAYS test workflow runs in PR before merging.
- ALWAYS use semantic versioning tags (e.g., v3) when available.

## PREFERENCES

- PREFER grouping related dependency updates together in one PR.
- PREFER splitting different categories of upgrades into separate PRs:
  - Node.js dependencies
  - CodeQL/QLT CLI
  - GitHub Actions
- PREFER documenting breaking changes prominently in PR descriptions.

## CONSTRAINTS

- NEVER upgrade multiple dependency categories in a single PR.
- NEVER skip checking release notes for major version upgrades.
- NEVER commit package-lock.json conflicts without resolving them.
- NEVER upgrade without validating the change works in CI/CD.

## RELATED PROMPTS

For detailed guidance on dependency upgrade tasks, refer to:
- `.github/prompts/dependency_upgrade.prompt.md` - Comprehensive upgrade procedures
