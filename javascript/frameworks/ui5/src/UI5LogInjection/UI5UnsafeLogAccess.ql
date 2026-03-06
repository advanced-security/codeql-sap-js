/**
 * @name Access to user-controlled UI5 Logs
 * @description Log entries from user-controlled sources should not be further processed.
 * @kind path-problem
 * @problem.severity warning
 * @security-severity 5
 * @precision medium
 * @id js/ui5-unsafe-log-access
 * @tags security
 *       external/cwe/cwe-117
 */

import javascript
import advanced_security.javascript.frameworks.ui5.dataflow.UI5DataFlow
import advanced_security.javascript.frameworks.ui5.UI5UnsafeLogAccessQuery

module UI5UnsafeLogAccessFlow = TaintTracking::Global<UI5UnsafeLogAccess>;

module UI5UnsafeLogAccessFlowUI5PathGraph =
  UI5PathGraph<UI5UnsafeLogAccessFlow::PathNode, UI5UnsafeLogAccessFlow::PathGraph>;

import UI5UnsafeLogAccessFlowUI5PathGraph

from
  UI5UnsafeLogAccessFlowUI5PathGraph::UI5PathNode source,
  UI5UnsafeLogAccessFlowUI5PathGraph::UI5PathNode sink,
  UI5UnsafeLogAccessFlowUI5PathGraph::UI5PathNode primarySource, LogEntriesNode logEntries
where
  UI5UnsafeLogAccessFlow::flowPath(source.getPathNode(), sink.getPathNode()) and
  primarySource = source.getAPrimarySource() and
  inSameWebApp(source.getFile(), logEntries.getFile())
select logEntries, primarySource, sink, "Accessed log entries depend on $@.", primarySource,
  "user-provided data"
