/**
 * @id log-sinks
 * @name Path injection sinks
 * @kind problem
 */

import javascript
import models.UI5AMDModule
import semmle.javascript.security.dataflow.TaintedPathQuery

from Configuration config, DataFlow::Node sink
where config.isSink(sink, _)
select sink, sink.toString()
