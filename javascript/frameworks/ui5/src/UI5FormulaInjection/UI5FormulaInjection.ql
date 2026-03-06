/**
 * @name UI5 Formula Injection
 * @description Saving data from an uncontrolled remote source using filesystem or local storage
 *              leads to disclosure of sensitive information or forgery of entry.
 * @kind path-problem
 * @problem.severity error
 * @security-severity 7.8
 * @precision medium
 * @id js/ui5-formula-injection
 * @tags security
 *       external/cwe/cwe-1236
 */

import javascript
import advanced_security.javascript.frameworks.ui5.dataflow.UI5DataFlow
import advanced_security.javascript.frameworks.ui5.UI5FormulaInjectionQuery

module UI5FormulaInjectionFlow = TaintTracking::Global<UI5FormulaInjection>;

module UI5FormulaInjectionUI5PathGraph =
  UI5PathGraph<UI5FormulaInjectionFlow::PathNode, UI5FormulaInjectionFlow::PathGraph>;

import UI5FormulaInjectionUI5PathGraph

from
  UI5FormulaInjectionUI5PathGraph::UI5PathNode source,
  UI5FormulaInjectionUI5PathGraph::UI5PathNode sink,
  UI5FormulaInjectionUI5PathGraph::UI5PathNode primarySource
where
  UI5FormulaInjectionFlow::flowPath(source.getPathNode(), sink.getPathNode()) and
  primarySource = source.getAPrimarySource()
select sink, primarySource, sink, "The content of a saved file depends on a $@.", primarySource,
  "user-provided value"
