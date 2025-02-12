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

module CAPLogInjectionConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node start) {
    LogInjectionConfig::isSource(start) or
    start instanceof RemoteFlowSource
  }

  predicate isBarrier(DataFlow::Node node) {
    exists(HandlerParameterData handlerParameterData |
      node = handlerParameterData and
      not handlerParameterData.getType() = ["cds.String", "cds.LargeString"]
    )
  }

  predicate isSink(DataFlow::Node end) { end instanceof CdsLogSink }
}

module CAPLogInjectionFlow = TaintTracking::Global<CAPLogInjectionConfig>;
