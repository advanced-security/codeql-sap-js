/**
 * @name UI5 Client-side cross-site scripting
 * @description Compatibility query for UI5 cross-site scripting results.
 *              The standard js/xss query is used for code scanning.
 * @kind path-problem
 * @problem.severity error
 * @security-severity 7.8
 * @precision high
 * @id js/ui5-xss
 * @tags security
 *       external/cwe/cwe-079
 *       external/cwe/cwe-116
 */

import javascript
import advanced_security.javascript.frameworks.ui5.UI5XssQuery
import advanced_security.javascript.frameworks.ui5.dataflow.UI5DataFlow

module UI5XssFlow = TaintTracking::Global<UI5Xss>;

module UI5XssUI5PathGraph = UI5PathGraph<UI5XssFlow::PathNode, UI5XssFlow::PathGraph>;

import UI5XssUI5PathGraph

from
  UI5XssUI5PathGraph::UI5PathNode source, UI5XssUI5PathGraph::UI5PathNode sink,
  UI5XssUI5PathGraph::UI5PathNode primarySource, UI5XssUI5PathGraph::UI5PathNode primarySink
where
  UI5XssFlow::flowPath(source.getPathNode(), sink.getPathNode()) and
  UI5Xss::isSource(source.asDataFlowNode()) and
  UI5Xss::isSink(sink.asDataFlowNode()) and
  primarySource = source.getAPrimarySource() and
  primarySink = sink.getAPrimaryHtmlISink()
select primarySink, primarySource, primarySink, "XSS vulnerability due to $@.", primarySource,
  "user-provided value"
