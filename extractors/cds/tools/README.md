# CodeQL CDS Extractor

A robust CodeQL extractor for [Core Data Services (CDS)][CDS] files used in [SAP Cloud Application Programming (CAP)][CAP] model projects. This extractor processes `.cds` files and compiles them into `.cds.json` files for CodeQL analysis while maintaining project-aware parsing and dependency resolution.

## Overview

The CodeQL CDS extractor is designed to efficiently process CDS projects by:

- **Project-Aware Processing**: Analyzes CDS files as related project configurations rather than independent definitions
- **Optimized Dependency Management**: Caches and reuses `@sap/cds` and `@sap/cds-dk` dependencies across projects
- **Enhanced Precision**: Reduces false-positives in CodeQL queries by understanding cross-file relationships
- **Performance Optimization**: Avoids duplicate processing and unnecessary dependency installations

## Architecture

The extractor uses an `autobuild` approach with the following key components:

### Core Components

- **`cds-extractor.ts`**: Main entry point that orchestrates the extraction process
- **`src/cds/parser/`**: CDS project discovery and dependency graph building
- **`src/cds/compiler/`**: Compilation orchestration and `.cds.json` generation
- **`src/packageManager/`**: Dependency installation and caching
- **`src/logging/`**: Unified logging and performance tracking
- **`src/environment.ts`**: Environment setup and validation
- **`src/codeql.ts`**: CodeQL JavaScript extractor integration

### Extraction Process

1. **Environment Setup**: Validates CodeQL tools and system requirements
2. **Project Discovery**: Recursively scans for CDS projects and builds dependency graph
3. **Dependency Management**: Installs and caches required CDS compiler dependencies
4. **CDS Compilation**: Compiles `.cds` files to `.cds.json` using project-aware compilation
5. **JavaScript Extraction**: Runs CodeQL's JavaScript extractor on source and compiled files

## Usage

### Prerequisites

- Node.js (accessible via `node` command)
- CodeQL CLI tools
- SAP CDS projects with `.cds` files

### Running the Extractor

The extractor is typically invoked by CodeQL during database creation:

```bash
codeql database create --language=cds --source-root=/path/to/project my-database
```

### Manual Execution

For development and testing purposes:

```bash
# Build the extractor
npm run build

# Run directly (from project source root)
node dist/cds-extractor.js /path/to/source/root
```

## Development

> **⚠️ IMPORTANT NOTE**: Any changes to the CDS extractor's compilation task behavior (including how and where `cds compile` commands are executed, project detection logic, or output file generation patterns) **MUST** be reflected in the `extractors/cds/tools/test/cds-compilation-for-actions.test.sh` script. The `.github/workflows/run-codeql-unit-tests-javascript.yml` workflow executes this script during the "Compile CAP CDS files" step to simulate the CDS extractor's compilation process for unit tests. If the script and extractor implementations diverge, the `CodeQL - Run Unit Tests (javascript)` workflow will fail on PRs, causing status check failures. Always review and update the test script when modifying compilation behavior to maintain consistency between local testing and CI/CD environments.

### Project Structure

```text
extractors/cds/tools/
├── cds-extractor.ts          # Main entry point
├── src/                      # Source code modules
│   ├── cds/                  # CDS-specific functionality
│   │   ├── compiler/         # Compilation orchestration
│   │   └── parser/           # Project discovery and parsing
│   ├── logging/              # Logging and performance tracking
│   ├── packageManager/       # Dependency management
│   ├── codeql.ts            # CodeQL integration
│   ├── diagnostics.ts       # Error reporting
│   ├── environment.ts       # Environment setup
│   ├── filesystem.ts        # File system utilities
│   └── utils.ts             # General utilities
├── test/                     # Test suites
├── dist/                     # Compiled JavaScript output
└── package.json             # Project configuration
```

### Building

```bash
# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Run all checks and build
npm run build:all
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Code Quality

```bash
# Lint TypeScript files
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Configuration

### Environment Variables

The extractor respects several CodeQL environment variables:

- `CODEQL_DIST`: Path to CodeQL distribution
- `CODEQL_EXTRACTOR_CDS_WIP_DATABASE`: Target database path
- `LGTM_INDEX_FILTERS`: File filtering configuration

### CDS Project Detection

Projects are detected based on:

- Presence of `package.json` files
- CDS files (`.cds`) in the project directory tree
- Valid CDS dependencies (`@sap/cds`, `@sap/cds-dk`) in package.json

### Compilation Strategy

The extractor uses a sophisticated compilation approach:

1. **Dependency Graph Building**: Maps relationships between CDS projects
2. **Smart Caching**: Reuses compiled outputs and dependency installations
3. **Error Recovery**: Handles compilation failures gracefully
4. **Performance Tracking**: Monitors compilation times and resource usage

## Performance Features

### Optimized Dependency Management

- **Shared Dependency Cache**: Single installation per unique dependency combination
- **Isolated Environments**: Dependencies installed in temporary cache directories
- **No Source Modification**: Original project files remain unchanged

### Efficient Processing

- **Project-Level Compilation**: Compiles related CDS files together
- **Duplicate Avoidance**: Prevents redundant processing of imported files
- **Memory Tracking**: Monitors and reports memory usage throughout extraction

### Scalability

- **Large Codebase Support**: Optimized for enterprise-scale CDS projects
- **Parallel Processing**: Where possible, processes independent projects concurrently
- **Resource Management**: Cleans up temporary files and cached dependencies

## Integration with `cds` CLI

### Installation of CDS (Node) Dependencies

#### Installation of `@sap/cds` and `@sap/cds-dk`

The CDS extractor attempts to optimize performance for most projects by caching the installation of the unique combinations of resolved CDS dependencies across all projects under a given source root.

The "unique combinations of resolved CDS dependencies" means that we resolve the **latest** available version **within the semantic version range** for each `@sap/cds` and `@sap/cds-dk` dependency specified in the `package.json` file for a given CAP project.

In practice, this means that if "project-a" requires `@sap/cds@^6.0.0` and "project-b" requires `@sap/cds@^7.0.0` while the latest available version is `@sap/cds@9.0.0` (as a trivial example), the extractor will install `@sap/cds@9.0.0` once and reuse it for both projects.

This is much faster than installing all dependencies for every project individually, especially for large projects with many CDS files. However, this approach has some limitations and trade-offs:

- This latest-first approach is more likely to choose the same version for multiple projects, which can reduce analysis time and can improve consistency in analysis between projects.
- This approach does not read (or respect) the `package-lock.json` file, which means that we are more likely to use a `cds` version that is different from the one most recently tested/used by the project developers.
- We are more likely to encounter incompatibility issues where a particular project hasn't been tested with the latest version of `@sap/cds` or `@sap/cds-dk`.

We can mitigate some of these issues through a (to be implemented) compilation retry mechanism for projects where some CDS compilation task(s) fail to produce the expected `.cds.json` output file(s).
The proposed retry mechanism would install the full set of dependencies for the affected project(s) while respecting the `package-lock.json` file, and then re-run the compilation for the affected project(s).

```text
TODO: retry mechanism expected before next release of the CDS extractor
```

#### Installation of Additional Project-Specific Dependencies

```text
TODO: implement installation of dependencies required for compilation to succeed for a given project
```

### Integration with `cds compile` command

The CDS extractor uses the `cds compile` command to compile `.cds` files into `.cds.json` files, which are then processed by CodeQL's JavaScript extractor.

Where possible, a single `model.cds.json` file is generated for each project, containing all the compiled definitions from the project's `.cds` files. This results in a faster extraction process overall with minimal duplication of CDS code elements (e.g., annotations, entities, services, etc.) within the CodeQL database created from the extraction process.

Where project-level compilation is not possible (e.g., due to project structure), the extractor generates individual `.cds.json` files for each `.cds` file in the project. The main downside to this approach is that if one `.cds` file imports another `.cds` file, the imported definitions will be duplicated in the CodeQL database, which can lead to false positives in queries that expect unique definitions.

```text
TODO: use the unique (session) ID of the CDS extractor run to as the `<session>` part of `<basename>.<session>.cds.json` and set JS extractor env vars to only extractor `.<session>.cds.json` files
```

### Integration with `cds env` command

The current version of the CDS extractor expects CAP projects to follow the [default project structure][CAP-project-structure], particularly regarding the names of the (`app`, `db`, & `srv`) subdirectories in which the extractor will look for `.cds` files to process (in addition to the root directory of the project).

The proposed solution will use the `cds env` command to discover configurations that affect the structure of the project and/or the expected "compilation tasks" for the project, such as any user customization of environment configurations such as:

- `cds.folders.app`
- `cds.folders.db`
- `cds.folders.srv`

```text
TODO : add support for integration with `cds env` CLI command as a means of consistently getting configurations for CAP projects
```

## Integration with `codeql` CLI

### File Processing

The extractor processes both:

- **Source Files**: Original `.cds` files for source code analysis
- **Compiled Files**: Generated `.cds.json` files for semantic analysis

### Database Population

- Integrates with CodeQL's JavaScript extractor for final database population
- Maintains proper file relationships and source locations
- Supports CodeQL's standard indexing and filtering mechanisms

## Troubleshooting

### Common Issues

1. **Missing Node.js**: Ensure `node` command is available in PATH
2. **CDS Dependencies**: Verify projects have valid `@sap/cds` dependencies
3. **Compilation Failures**: Check CDS syntax and cross-file references
4. **Memory Issues**: Monitor memory usage for very large projects

### Debugging

The extractor provides comprehensive logging:

- **Performance Tracking**: Times for each extraction phase
- **Memory Usage**: Memory consumption at key milestones
- **Error Reporting**: Detailed error messages with context
- **Project Discovery**: Information about detected CDS projects

### Log Levels

- `info`: General progress and milestone information
- `warn`: Non-critical issues that don't prevent extraction
- `error`: Critical failures that may affect extraction quality

## References

- [SAP Cloud Application Programming Model][CAP]
  - [Default Structure of a CAP Project][CAP-project-structure]
- [Core Data Services (CDS)][CDS]
  - [Project-Specific Configurations][CDS-ENV-project-configs]
- [Conceptual Definition Language (CDL)][CDL]
- [CodeQL Documentation](https://codeql.github.com/docs/)

[CAP]: https://cap.cloud.sap/docs/about/
[CAP-project-structure]: https://cap.cloud.sap/docs/get-started/#project-structure
[CDS]: https://cap.cloud.sap/docs/cds/
[CDS-ENV-project-configs]: https://cap.cloud.sap/docs/node.js/cds-env#project-specific-configurations
[CDL]: https://cap.cloud.sap/docs/cds/cdl
