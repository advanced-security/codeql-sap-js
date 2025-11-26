/**
 * This file is included for use in custom CodeQL bundles (https://github.com/advanced-security/codeql-bundle).
 * The contents of this file will be included in the standard library `Customizations.qll`, and will therefore
 * be included in the out-of-the-box security queries.
 */

/* We import under alias to avoid any potential naming conflicts */
import advanced_security.javascript.frameworks.cap.RemoteFlowSources as CAPRemoteFlowSources
