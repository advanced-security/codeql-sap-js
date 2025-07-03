/**
 * @name CQL query built from user-controlled sources
 * @description Building a CQL query from user-controlled sources is vulnerable to insertion of
 *              malicious code by the user.
 * @kind path-problem
 * @problem.severity error
 * @security-severity 8.8
 * @precision high
 * @id js/cap-sql-injection
 * @tags security
 */

import javascript
import DataFlow::PathGraph
import advanced_security.javascript.frameworks.cap.CAPCqlInjectionQuery

from CqlInjectionConfiguration sql, DataFlow::PathNode source, DataFlow::PathNode sink
where sql.hasFlowPath(source, sink)
select sink.getNode().(CqlInjectionSink).getQuery(), source, sink,
  "This CQL query depends on a $@.", source.getNode(), "user-provided value"
