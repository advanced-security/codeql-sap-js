/**
 * @id xss-sinks
 * @name XSS sinks
 * @kind problem
 */

import javascript
import models.UI5View
import models.UI5XssDataFlow::PathGraph

Locatable getUI5SinkLocation(DataFlow::Node node, string bindingPathStr) {
  result = node.(UI5ModelSink).getBindingPath() and
  result = any(UI5View view).getAnHtmlISink() and
  bindingPathStr = node.(UI5ModelSink).getBindingPath().getAbsolutePath()
  or
  result = node.asExpr() and
  not node.asExpr() instanceof StringLiteral and // exception on JSONModel's URI argument
  bindingPathStr = node.toString()
}

from DataFlow::Configuration cfg, DataFlow::Node sink, string sinkBindingPathStr
where cfg.isSink(sink, _)
select getUI5SinkLocation(sink, sinkBindingPathStr), sink.toString()
