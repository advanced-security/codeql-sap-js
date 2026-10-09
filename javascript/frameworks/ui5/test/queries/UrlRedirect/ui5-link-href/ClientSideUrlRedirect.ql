/**
 * @name Client-side URL redirect through a UI5 Link binding
 * @description Tests unvalidated URLs flowing from editable todo fields to sap.m.Link.href.
 * @kind path-problem
 * @problem.severity error
 * @id js/client-side-url-redirect-ui5-link-href
 * @tags security
 *       external/cwe/cwe-601
 */

import DataFlow::DeduplicatePathGraph<ClientSideUrlRedirectFlow::PathNode, ClientSideUrlRedirectFlow::PathGraph>
import advanced_security.javascript_sap_ui5_all.Customizations as UI5Customizations
import javascript
import semmle.javascript.security.dataflow.ClientSideUrlRedirectQuery

from PathNode source, PathNode sink
where
  ClientSideUrlRedirectFlow::flowPath(source.getAnOriginalPathNode(), sink.getAnOriginalPathNode())
select sink.getNode(), source, sink, "Untrusted URL redirection depends on a $@.", source.getNode(),
  "user-provided value"
