/**
 * @name List all HTML injection sinks
 * @description List all HTML injection sinks
 * @kind problem
 * @problem.severity info
 * @precision high
 * @id js/xsjs-list-log-injection-sinks
 * @tags diagnostics
 */

import javascript

from DataFlow::Node sink, string kind
where
  sink = ModelOutput::getASinkNode(kind).asSink() and
  kind = "html-injection"
select sink, "XSJS HTML injection sink with kind: " + kind
