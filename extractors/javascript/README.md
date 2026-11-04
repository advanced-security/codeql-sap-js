# Extension to the JavaScript extractor to support CDS compilation

Copy `pre-finalize.sh`, `pre-finalize.cmd`, and their `index-ui5.js` helper together
into a JavaScript extractor's `tools` directory to enable SAP CAP CDS compilation
and UI5 XML extraction during `codeql database create`. Node.js is required.

The script requires that the `cds` extractor is available when `codeql database init` is called. This can either be through providing the extractors parent directory using the `--search-path` bundle, or by including the extractor (and this pre-finalize script) in a custom bundle created by the [CodeQL Development Toolkit (qlt)](https://github.com/advanced-security/codeql-development-toolkit).

Both launchers apply ordered source-path filters to UI5 XML indexing without treating
file-type opt-ins such as `include:**/*.json` as XML path restrictions.
File-type includes remain ordered so XML types can be re-included after exclusions.
XML type re-inclusions stay within the source-include scope. The shared helper uses
CodeQL response files to avoid platform command-line limits.