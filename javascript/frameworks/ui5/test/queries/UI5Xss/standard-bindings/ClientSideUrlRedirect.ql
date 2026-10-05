/**
 * @name Client-side URL redirect with UI5 customizations
 * @kind path-problem
 * @problem.severity error
 * @id js/client-side-unvalidated-url-redirection-with-ui5
 */

import javascript
import advanced_security.javascript_sap_ui5_all.Customizations as UI5Customizations
import DataFlow::DeduplicatePathGraph<ClientSideUrlRedirectFlow::PathNode, ClientSideUrlRedirectFlow::PathGraph>
import semmle.javascript.security.dataflow.ClientSideUrlRedirectQuery

from PathNode source, PathNode sink
where
  ClientSideUrlRedirectFlow::flowPath(source.getAnOriginalPathNode(), sink.getAnOriginalPathNode())
select sink.getNode(), source, sink, "Untrusted URL redirection depends on a $@.", source.getNode(),
  "user-provided value"
