/**
 * @name Client-side cross-site scripting with UI5 customizations
 * @kind path-problem
 * @problem.severity error
 * @id js/xss-event-handlers-with-ui5
 */

import javascript
import advanced_security.javascript_sap_ui5_all.Customizations as UI5Customizations
import DataFlow::DeduplicatePathGraph<DomBasedXssFlow::PathNode, DomBasedXssFlow::PathGraph>
import semmle.javascript.security.dataflow.DomBasedXssQuery

from PathNode source, PathNode sink
where DomBasedXssFlow::flowPath(source.getAnOriginalPathNode(), sink.getAnOriginalPathNode())
select sink.getNode(), source, sink,
  sink.getNode().(Sink).getVulnerabilityKind() + " vulnerability due to $@.", source.getNode(),
  "user-provided value"
