/**
 * @name Server-side URL redirect with UI5 customizations
 * @kind path-problem
 * @problem.severity warning
 * @id js/server-side-unvalidated-url-redirection-with-ui5
 */

import javascript
import advanced_security.javascript_sap_ui5_all.Customizations as UI5Customizations
import semmle.javascript.security.dataflow.ServerSideUrlRedirectQuery
import ServerSideUrlRedirectFlow::PathGraph

from ServerSideUrlRedirectFlow::PathNode source, ServerSideUrlRedirectFlow::PathNode sink
where ServerSideUrlRedirectFlow::flowPath(source, sink)
select sink.getNode(), source, sink, "Untrusted URL redirection depends on a $@.", source.getNode(),
  "user-provided value"
