/**
 * This file is included for use in custom CodeQL bundles (https://github.com/advanced-security/codeql-bundle).
 * The contents of this file will be included in the standard library `Customizations.qll`, and will therefore
 * be included in the out-of-the-box security queries.
 */

/*
 * Keep these imports private because this module is injected into `javascript.qll`.
 * Re-exporting them from there breaks recursive standard-library module resolution.
 * Keep UI5 HTML and request-forgery sink adapters out of this shared entry point.
 * URL-redirect sinks are shared because there is no dedicated UI5 redirect query.
 */

private import advanced_security.javascript.frameworks.ui5.RemoteFlowSources
private import advanced_security.javascript.frameworks.ui5.Sanitizers
private import advanced_security.javascript.frameworks.ui5.UrlRedirects
