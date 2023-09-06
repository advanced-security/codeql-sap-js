/**
 * @id javascript/javascript-sap-ui5-queries/UI5LogInjection
 * @name UI5LogInjection
 * @description Building log entries from user-controlled sources is vulnerable to
 *              insertion of forged log entries by a malicious user.
 * @kind path-problem
 * @problem.severity error
 * @security-severity 7.8
 * @precision medium
 * @tags javascript-sap-ui5-queries
 *       security
 *       external/cwe/cwe-117
 */

 import javascript
 import models.UI5LogInjectionDataFlow::PathGraph

 from
   UI5LogInjectionConfiguration cfg, UI5PathNode source, UI5PathNode sink, UI5PathNode primarySource,
   UI5PathNode primarySink
 where
   cfg.hasFlowPath(source.asDataFlowPathNode(), sink.asDataFlowPathNode()) and
   primarySource = source.getAPrimarySource() and
   primarySink = sink.getAPrimarySink()
 select primarySink, primarySource, primarySink, "Log entry depends on a $@.", primarySource,
   "user-provided value"
 