/**
 * @id path-sinks
 * @name Path injection sinks
 * @kind problem
 * @problem.severity error
 */

import javascript
import advanced_security.javascript.frameworks.ui5.UI5DataFlow
import semmle.javascript.security.dataflow.TaintedPathQuery as TaintedPathQuery

class UI5ExtPathISink extends TaintedPathQuery::Sink {
  UI5ExtPathISink() { this = ModelOutput::getASinkNode("ui5-path-injection").asSink() }
  }

from TaintedPathQuery::Sink sink
select sink, sink.toString()
