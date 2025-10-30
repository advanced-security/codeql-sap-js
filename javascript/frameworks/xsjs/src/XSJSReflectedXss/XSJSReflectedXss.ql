/**
 * @name XSJS Reflected XSS
 * @description Including uncontrolled value into a response body and setting it to
 *              a scriptable MIME type allows for cross-site scripting vulnerability.
 * @kind path-problem
 * @problem.severity error
 * @security-severity 7.8
 * @precision medium
 * @id js/xsjs-reflected-xss
 * @tags security
 */

import javascript
import advanced_security.javascript.frameworks.xsjs.XSJSReflectedXssQuery

module ConfigurationFlow = TaintTracking::Global<Configuration>;

import ConfigurationFlow::PathGraph

from ConfigurationFlow::PathNode source, ConfigurationFlow::PathNode sink
where ConfigurationFlow::flowPath(source, sink)
select sink, source, sink, "Reflected XSS vulnerability due to $@.", source, "user-provided value"
