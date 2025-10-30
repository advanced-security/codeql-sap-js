/**
 * @name XSJS URL Redirect
 * @description Setting the `location` response header to an uncontrolled value
 *              allows for redirection to an arbitrary URL.
 * @kind path-problem
 * @problem.severity error
 * @security-severity 6.1
 * @precision medium
 * @id js/xsjs-url-redirect
 * @tags security
 */

import javascript
import advanced_security.javascript.frameworks.xsjs.XSJSUrlRedirectQuery

module ConfigurationFlow = TaintTracking::Global<Configuration>;

import ConfigurationFlow::PathGraph

from ConfigurationFlow::PathNode source, ConfigurationFlow::PathNode sink
where ConfigurationFlow::flowPath(source, sink)
select sink, source, sink, "$@ depends on a $@.", sink, "This URL", source, "user-provided value"
