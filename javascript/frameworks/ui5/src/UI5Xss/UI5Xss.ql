/**
 * @name UI5 Client-side cross-site scripting
 * @description Writing user input directly to a UI5 View allows for
 *              a cross-site scripting vulnerability.
 * @kind path-problem
 * @problem.severity error
 * @security-severity 6.1
 * @precision high
 * @id js/ui5-xss
 * @tags security
 *       external/cwe/cwe-079
 *       external/cwe/cwe-116
 */

import javascript
import advanced_security.javascript.frameworks.ui5.dataflow.DataFlow
import advanced_security.javascript.frameworks.ui5.UI5XssQuery

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
