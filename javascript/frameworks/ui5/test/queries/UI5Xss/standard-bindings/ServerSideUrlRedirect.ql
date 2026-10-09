/**
 * @name Server-side URL redirect with UI5 customizations
 * @description Verifies UI5 client bindings do not create server-side redirect results.
 * @kind path-problem
 * @problem.severity warning
 * @id js/server-side-unvalidated-url-redirection-with-ui5
 * @tags security
 *       external/cwe/cwe-601
 */

import javascript
import advanced_security.javascript_sap_ui5_all.Customizations as UI5Customizations
import semmle.javascript.security.dataflow.ServerSideUrlRedirectQuery
import ServerSideUrlRedirectFlow::PathGraph

from ServerSideUrlRedirectFlow::PathNode source, ServerSideUrlRedirectFlow::PathNode sink
where ServerSideUrlRedirectFlow::flowPath(source, sink)
select sink.getNode(), source, sink, "Untrusted URL redirection depends on a $@.", source.getNode(),
  "user-provided value"
