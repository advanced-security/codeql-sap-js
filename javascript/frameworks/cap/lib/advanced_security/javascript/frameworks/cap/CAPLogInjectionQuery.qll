import javascript
import semmle.javascript.dataflow.DataFlow
import semmle.javascript.security.dataflow.LogInjectionQuery
import advanced_security.javascript.frameworks.cap.RemoteFlowSources
import advanced_security.javascript.frameworks.cap.CDS
import advanced_security.javascript.frameworks.cap.dataflow.DataFlow

/**
 * A logger obtained by a call to `log` on a CDS facade. Each logger is associated with
 * its unique name.
 */
class CdsLogger extends MethodCallNode {
  string name;

  CdsLogger() {
    exists(CdsFacade cds |
      this = cds.getMember("log").getACall() and
      name = this.getArgument(0).getALocalSource().asExpr().(StringLiteral).getValue()
    )
  }

  string getName() { result = name }
}

/**
 * A template literal that is not interpolated. It is basically a string literal
 * defined in backticks (\`\`).
 */
class ConstantOnlyTemplateLiteral extends TemplateLiteral {
  ConstantOnlyTemplateLiteral() {
    forall(Expr e | e = this.getAnElement() | e instanceof TemplateElement)
  }
}

/**
 * Arguments of calls to `cds.log.{trace, debug, info, log, warn, error}`.
 */
class CdsLogSink extends DataFlow::Node {
  CdsLogSink() {
    exists(CdsLogger log, MethodCallNode loggingMethod |
      this = loggingMethod.getAnArgument() and
      loggingMethod.getMethodName() = ["trace", "debug", "info", "log", "warn", "error"] and
      not this.asExpr() instanceof Literal and
      not this.asExpr() instanceof ConstantOnlyTemplateLiteral and
      loggingMethod.getReceiver().getALocalSource() = log
    )
  }
}

module CAPLogInjectionConfiguration implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node start) {
    LogInjectionConfig::isSource(start)
    or
    start instanceof RemoteFlowSource
  }

  predicate isBarrier(DataFlow::Node node) {
    /*
     * This predicate includes cases such as:
     * 1. A CDS entity element lacking a type annotation.
     *   - Possibly because it relies on a common aspect.
     * 2. A CDS entity element annotated with a non-string type listed above.
     *
     * Therefore, the data held by the handler parameter data (e.g. `req.data.X`)
     * has to be EXPLICITLY annotated as `String` or `LargeString` to be excluded
     * from the next condition.
     */

    exists(HandlerParameterData handlerParameterData |
      node = handlerParameterData and
      /* Note the use of `.. != ..` instead of `not .. = ..` below. */
      exists(string handlerParameterDataType |
        handlerParameterDataType = handlerParameterData.getType()
      |
        handlerParameterDataType != "cds.String" and
        handlerParameterDataType != "cds.LargeString"
      )
    )
  }

  predicate isSink(DataFlow::Node end) { end instanceof CdsLogSink }
}
