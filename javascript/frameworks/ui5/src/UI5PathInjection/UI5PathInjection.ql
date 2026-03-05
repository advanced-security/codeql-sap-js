/**
 * @name UI5 Path Injection
 * @description Constructing path from an uncontrolled remote source to be passed
 *              to a filesystem API allows for manipulation of the local filesystem.
 * @kind path-problem
 * @problem.severity error
 * @security-severity 7.8
 * @precision medium
 * @id js/ui5-path-injection
 * @tags security
 *       external/cwe/cwe-022
 *       external/cwe/cwe-035
 */

import javascript
import advanced_security.javascript.frameworks.ui5.dataflow.UI5DataFlow
import advanced_security.javascript.frameworks.ui5.UI5PathInjectionQuery

module UI5PathInjectionFlow = TaintTracking::Global<UI5PathInjection>;

module UI5PathInjectionPathGraph =
  UI5PathGraph<UI5PathInjectionFlow::PathNode, UI5PathInjectionFlow::PathGraph>;

import UI5PathInjectionPathGraph

from
  UI5PathInjectionPathGraph::UI5PathNode source, UI5PathInjectionPathGraph::UI5PathNode sink,
  UI5PathInjectionPathGraph::UI5PathNode primarySource
where
  UI5PathInjectionFlow::flowPath(source.getPathNode(), sink.getPathNode()) and
  primarySource = source.getAPrimarySource()
select sink, primarySource, sink, "The path of a saved file depends on a $@.", primarySource,
  "user-provided value"
