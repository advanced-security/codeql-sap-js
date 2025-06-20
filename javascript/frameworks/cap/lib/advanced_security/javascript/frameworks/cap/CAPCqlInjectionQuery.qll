import javascript
import semmle.javascript.security.dataflow.SqlInjectionCustomizations
import advanced_security.javascript.frameworks.cap.CQL
import advanced_security.javascript.frameworks.cap.RemoteFlowSources

/**
 * A possibly tainted clause
 * any clause with a string concatenation in it
 * regardless of where that operand came from
 */
class TaintedClause instanceof CqlClause {
  TaintedClause() { exists(StringConcatenation::getAnOperand(this.getArgument().flow())) }

  string toString() { result = super.toString() }

  Expr getArgument() { result = super.getArgument() }

  Expr asExpr() { result = super.asExpr() }
}

/**
 * a more heurisitic based taint step
 * captures one of the alternative ways to construct query strings:
 * `cds.parse.cql(`string`+userInput)`
 * and considers them tainted if they've been concatenated against
 * in any manner
 */
class ParseCQLTaintedClause extends CallNode {
  ParseCQLTaintedClause() {
    this = any(CdsFacade cds).getMember("parse").getMember("cql").getACall() and
    exists(DataFlow::Node n |
      n = StringConcatenation::getAnOperand(this.getAnArgument()) and
      //omit the fact that the arg of cds.parse.cql (`SELECT * from Foo`)
      //is technically a string concat
      not n.asExpr() instanceof TemplateElement
    )
  }
}

class CqlIConfiguration extends TaintTracking::Configuration {
  CqlIConfiguration() { this = "CqlInjection" }

  override predicate isSource(DataFlow::Node source) { source instanceof RemoteFlowSource }

  override predicate isSink(DataFlow::Node node) {
    node = any(CdsFacade cds).getMember("db").getMember("run").getACall().getAnArgument()
    or
    exists(AwaitExpr awaitExpr, CqlClause clause |
      node.asExpr() = clause.asExpr() and
      awaitExpr.getOperand() = clause.asExpr()
    )
  }

  override predicate isSanitizer(DataFlow::Node node) {
    super.isSanitizer(node) or
    node instanceof SqlInjection::Sanitizer
  }

  override predicate isAdditionalTaintStep(DataFlow::Node pred, DataFlow::Node succ) {
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
