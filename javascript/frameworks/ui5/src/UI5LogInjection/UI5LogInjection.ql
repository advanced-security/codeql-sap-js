/**
 * @name UI5 client-side Log injection
 * @description Building log entries from user-controlled sources is vulnerable to
 *              insertion of forged log entries by a malicious user.
 * @kind path-problem
 * @problem.severity recommendation
 * @security-severity 3.5
 * @precision medium
 * @id js/ui5-log-injection
 * @tags security
 *       external/cwe/cwe-117
 */

import javascript
import advanced_security.javascript.frameworks.ui5.UI5LogInjectionQuery
import advanced_security.javascript.frameworks.ui5.dataflow.DataFlow

module UI5LogInjectionFlow = TaintTracking::Global<UI5LogInjection>;

module UI5LogInjectionUI5PathGraph =
  UI5PathGraph<UI5LogInjectionFlow::PathNode, UI5LogInjectionFlow::PathGraph>;

import UI5LogInjectionUI5PathGraph

from
  UI5LogInjectionUI5PathGraph::UI5PathNode source, UI5LogInjectionUI5PathGraph::UI5PathNode sink,
  UI5LogInjectionUI5PathGraph::UI5PathNode primarySource
where
  UI5LogInjectionFlow::flowPath(source.getPathNode(), sink.getPathNode()) and
  primarySource = source.getAPrimarySource()
select sink, primarySource, sink, "Log entry depends on a $@.", primarySource, "user-provided value"
