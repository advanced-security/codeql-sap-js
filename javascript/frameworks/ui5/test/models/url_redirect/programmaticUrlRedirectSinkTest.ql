/**
 * @name UI5 programmatic URL redirect sinks
 * @description Lists programmatic UI5 URL helper calls modeled as redirect sinks.
 * @kind problem
 * @problem.severity error
 * @id ui5-programmatic-url-redirect-sinks
 * @tags test
 */

import javascript
import advanced_security.javascript.frameworks.ui5.dataflow.UI5DataFlow as UI5DataFlow
import semmle.javascript.security.dataflow.ClientSideUrlRedirectQuery

class UI5ExtUrlRedirectSink extends DataFlow::Node {
  UI5ExtUrlRedirectSink() { this = ModelOutput::getASinkNode("url-redirection").asSink() }
}

from UI5ExtUrlRedirectSink sink
select sink, sink.toString()
