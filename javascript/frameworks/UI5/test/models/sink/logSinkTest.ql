/**
 * @id log-sinks
 * @name Log injection sinks
 * @kind problem
 * @problem.severity error
 */

import javascript
import advanced_security.javascript.frameworks.UI5.UI5DataFlow
import semmle.javascript.security.dataflow.LogInjectionQuery as LogInjectionQuery

class UI5ExtLogISink extends LogInjectionQuery::Sink {
  UI5ExtLogISink() { this = ModelOutput::getASinkNode("ui5-log-injection").asSink() }
}

from UI5ExtLogISink sink
select sink, sink.toString()
