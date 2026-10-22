/**
 * This file is included for use in custom CodeQL bundles (https://github.com/advanced-security/codeql-bundle).
 * The contents of this file will be included in the standard library `Customizations.qll`, and will therefore
 * be included in the out-of-the-box security queries.
 */

/*
 * Keep this import private because this module is injected into `javascript.qll`.
 * Re-exporting it from there breaks recursive standard-library module resolution.
 */

private import advanced_security.javascript.frameworks.cap.RemoteFlowSources
