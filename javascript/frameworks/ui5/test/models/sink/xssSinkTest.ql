/**
 * @id xss-sinks
 * @name XSS sinks
 * @kind problem
 * @problem.severity error
 */

import javascript
import advanced_security.javascript.frameworks.ui5.UI5DataFlow
import semmle.javascript.security.dataflow.DomBasedXssQuery as DomBasedXss

class UI5ExtHtmlISink extends DomBasedXss::Sink {
  UI5ExtHtmlISink() { this = ModelOutput::getASinkNode("ui5-html-injection").asSink() }
}

from DomBasedXss::Sink sink
select sink, sink.toString()
