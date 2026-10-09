/**
 * @name XSJS response header models
 * @description Tests header access, content types, and reflected-XSS flow with positive and negative cases.
 * @kind table
 * @id test/xsjs-response-headers
 * @tags test
 */

import javascript
import advanced_security.javascript.frameworks.xsjs.AsyncXSJS
import advanced_security.javascript.frameworks.xsjs.XSJSReflectedXssQuery

module HeaderFlow = TaintTracking::Global<Configuration>;

predicate observed(string kind, DataFlow::Node node) {
  exists(XSJSRequestOrResponse response | node = response.getHeaders() and kind = "headers")
  or
  exists(XSJSResponse response |
    node = response and response.isScriptableContentType() and kind = "scriptable"
  )
  or
  Configuration::isSink(node) and kind = "sink"
}

from string kind, string label
where
  exists(DataFlow::Node node |
    observed(kind, node) and label = node.asExpr().getEnclosingFunction().getName()
  )
  or
  exists(DataFlow::Node source, DataFlow::Node sink |
    kind = "flow" and
    HeaderFlow::flow(source, sink) and
    label =
      source.asExpr().getEnclosingFunction().getName() + " -> " +
        sink.asExpr().getEnclosingFunction().getName()
  )
select kind, label
