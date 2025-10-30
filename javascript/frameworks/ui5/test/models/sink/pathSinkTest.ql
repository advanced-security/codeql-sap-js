/**
 * @id path-sinks
 * @name Path injection sinks
 * @kind problem
 * @problem.severity error
 */

import javascript
import semmle.javascript.security.dataflow.TaintedPathQuery
import advanced_security.javascript.frameworks.ui5.dataflow.DataFlow as UI5DataFlow

class UI5ExtPathISink extends DataFlow::Node {
  UI5ExtPathISink() { this = ModelOutput::getASinkNode("ui5-path-injection").asSink() }
}

from UI5ExtPathISink sink
select sink, sink.toString()
