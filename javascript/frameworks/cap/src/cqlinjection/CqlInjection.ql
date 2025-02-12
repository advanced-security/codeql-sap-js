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
import semmle.javascript.security.dataflow.SqlInjectionCustomizations::SqlInjection
import advanced_security.javascript.frameworks.cap.CQL
import advanced_security.javascript.frameworks.cap.RemoteFlowSources
import semmle.javascript.dataflow.DataFlow

module CqlInjectionConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) { source instanceof RemoteFlowSource }

  predicate isSink(DataFlow::Node sink) { sink instanceof CQLSink }

  predicate isBarrier(DataFlow::Node node) {
    // super.isSanitizer(node) or
    node instanceof Sanitizer
  }

  predicate isAdditionalFlowStep(DataFlow::Node pred, DataFlow::Node succ) {
    //string concatenation in a clause arg taints the clause
    exists(TaintedClause clause |
      clause.getArgument() = pred.asExpr() and
      clause.asExpr() = succ.asExpr()
    )
    or
    //less precise, any concat in the alternative sql stmt construction techniques
    exists(ParseCQLTaintedClause parse |
      parse.getAnArgument() = pred and
      parse = succ
    )
  }
}

module CqlInjectionFlow = TaintTracking::Global<CqlInjectionConfig>;

import CqlInjectionFlow::PathGraph

from CqlInjectionFlow::PathNode source, CqlInjectionFlow::PathNode sink
where CqlInjectionFlow::flowPath(source, sink)
select sink.getNode(), source, sink, "This query depends on a $@.", source.getNode(),
  "user-provided value"
