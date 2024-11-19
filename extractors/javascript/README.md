# Extension to the JavaScript extractor to support CDS compilation

This directory contains a `pre-finalize.sh` script that can be dropped into the `tools` directory
of a JavaScript extractor to enable the automatic compilation and extraction of SAP CAP CDS files
during the `codeql database create` process.

The script requires that the `cds` extractor is available when `codeql database init` is called. This can either be through providing the extractors parent directory using the `--search-path` bundle, or by including the extractor (and this pre-finalize script) in a custom bundle created by the [CodeQL Development Toolkit (qlt)](https://github.com/advanced-security/codeql-development-toolkit).