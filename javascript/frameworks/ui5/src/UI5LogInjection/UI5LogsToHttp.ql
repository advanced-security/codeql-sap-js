/**
 * @name UI5 Log injection in outbound network request
 * @description Building log entries from user-controlled sources is vulnerable to
 *              insertion of forged log entries by a malicious user.
 * @kind path-problem
 * @problem.severity warning
 * @security-severity 6.5
 * @precision medium
 * @id js/ui5-log-injection-to-http
 * @tags security
 *       external/cwe/cwe-117
 */

import javascript
import advanced_security.javascript.frameworks.ui5.UI5LogsToHttpQuery
import advanced_security.javascript.frameworks.ui5.dataflow.DataFlow

module UI5LogsToHttpFlow = TaintTracking::GlobalWithState<UI5LogEntryToHttp>;

module UI5LogsToHttpUI5PathGraph =
  UI5PathGraph<UI5LogsToHttpFlow::PathNode, UI5LogsToHttpFlow::PathGraph>;

import UI5LogsToHttpUI5PathGraph

from
  UI5LogsToHttpUI5PathGraph::UI5PathNode source, UI5LogsToHttpUI5PathGraph::UI5PathNode sink,
  UI5LogsToHttpUI5PathGraph::UI5PathNode primarySource
where
  UI5LogsToHttpFlow::flowPath(source.getPathNode(), sink.getPathNode()) and
  primarySource = source.getAPrimarySource()
select sink, primarySource, sink, "Outbound network request depends on $@ log data.", primarySource,
  "user-provided"
