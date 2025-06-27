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

DataFlow::Node getQueryOfSink(DataFlow::Node sink) {
  exists(CqlRunMethodCall cqlRunMethodCall |
    sink = cqlRunMethodCall.(CqlRunMethodCall).getAQueryParameter() and
    result = sink
  )
  or
  exists(CqlShortcutMethodCallWithStringConcat shortcutCall |
    sink = shortcutCall.(CqlQueryRunnerCall).getAQueryParameter() and
    result = shortcutCall
  )
  or
  exists(AwaitExpr await, CqlClauseWithStringConcatParameter cqlClauseWithStringConcat |
    sink = await.flow() and
    await.getOperand() = cqlClauseWithStringConcat.(CqlClause).asExpr() and
    result = cqlClauseWithStringConcat.(CqlClause).flow()
  )
}

from CqlInjectionConfiguration sql, DataFlow::PathNode source, DataFlow::PathNode sink
where sql.hasFlowPath(source, sink)
select getQueryOfSink(sink.getNode()), source, sink, "This CQL query depends on a $@.",
  source.getNode(), "user-provided value"
