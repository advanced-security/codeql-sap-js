/**
 * @name Client-side cross-site scripting with UI5 customizations
 * @description Tests standard XSS detection across UI5 model bindings.
 * @kind path-problem
 * @problem.severity error
 * @id js/xss-with-ui5
 * @tags security
 *       external/cwe/cwe-079
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
