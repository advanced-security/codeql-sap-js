/**
 * @id formula-injection-sinks
 * @name Formula injection sinks
 * @kind problem
 * @problem.severity error
 */

import javascript
import advanced_security.javascript.frameworks.ui5.UI5FormulaInjectionQuery
import advanced_security.javascript.frameworks.ui5.dataflow.UI5DataFlow

from DataFlow::Node sink
where UI5FormulaInjection::isSink(sink)
select sink, sink.toString()
