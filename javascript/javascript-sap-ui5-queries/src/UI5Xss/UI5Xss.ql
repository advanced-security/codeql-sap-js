/**
 * @id javascript/javascript-sap-ui5-queries/UI5Xss
 * @name UI5Xss
 * @description Writing user input directly to a UI5 View allows for
 *              a cross-site scripting vulnerability.
 * @kind path-problem
 * @precision high
 * @security-severity 6.1
 * @problem.severity error
 * @tags javascript-sap-ui5-queries
*        security
 *       external/cwe/cwe-079
 *       external/cwe/cwe-116
 */
 
import javascript
import models.UI5XssDataFlow::PathGraph

from
  UI5XssConfiguration cfg, UI5PathNode source, UI5PathNode sink, UI5PathNode primarySource,
  UI5PathNode primarySink
where
  cfg.hasFlowPath(source.asDataFlowPathNode(), sink.asDataFlowPathNode()) and
  primarySource = source.getAPrimarySource() and
  primarySink = sink.getAPrimarySink()
select primarySink, primarySource, primarySink, "XSS vulnerability due to $@.", primarySource,
  "user-provided value"
