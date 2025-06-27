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

## Integration with CodeQL

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
- [Core Data Services (CDS)][CDS]
- [Conceptual Definition Language (CDL)][CDL]
- [CodeQL Documentation](https://codeql.github.com/docs/)

[CAP]: https://cap.cloud.sap/docs/about/
[CDS]: https://cap.cloud.sap/docs/cds/
[CDL]: https://cap.cloud.sap/docs/cds/cdl
