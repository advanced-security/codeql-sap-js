/**
 * @id xss-sources
 * @name XSS sources
 * @kind problem
 */

import javascript
import models.UI5View
import models.UI5XssDataFlow::PathGraph

Locatable getUI5SourceLocation(DataFlow::Node node, string bindingPathStr) {
  result = node.(UI5ModelSource).getBindingPath() and
  result = any(UI5View view).getASource() and
  bindingPathStr = node.(UI5ModelSource).getBindingPath().getAbsolutePath()
  or
  result = node.asExpr() and
  not node.asExpr() instanceof StringLiteral and // exception on JSONModel's URI argument
  bindingPathStr = node.toString()
}

from DataFlow::Configuration cfg, DataFlow::Node source, string sourceBindingPathStr
where cfg.isSource(source, _)
select getUI5SourceLocation(source, sourceBindingPathStr), source.toString()
