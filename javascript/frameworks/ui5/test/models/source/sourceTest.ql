/**
 * @id xss-sources
 * @name XSS sources
 * @kind problem
 * @problem.severity error
 */

import javascript
import advanced_security.javascript.frameworks.ui5.UI5DataFlow
import semmle.javascript.security.dataflow.DomBasedXssQuery as DomBasedXss

class UI5ExtLogISource extends DomBasedXss::Source {
  UI5ExtLogISource() { this = ModelOutput::getASourceNode("ui5-remote").asSource() }
}

from DomBasedXss::Source source
select source, source.toString()
