import javascript
import advanced_security.javascript.frameworks.xsjs.AsyncXSJS
import semmle.javascript.security.dataflow.SqlInjectionQuery as SqlInjection

class XSJSDBConnectionPrepareStatementArgument extends DataFlow::ValueNode {
  XSJSDBConnectionPrepareStatementArgument() {
    exists(XSJSDatabaseConnectionReference connection |
      this = connection.getStatementPreparingCall().getArgument(0)
    )
  }

  predicate isConcatenated() { this.getAPredecessor+() instanceof StringOps::ConcatenationNode }
}

module Configuration implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node start) {
    SqlInjection::SqlInjectionConfig::isSource(start)
    or
    start instanceof RemoteFlowSource
  }

  predicate isSink(DataFlow::Node end) {
    end.(XSJSDBConnectionPrepareStatementArgument).isConcatenated()
  }

  predicate isBarrier(DataFlow::Node node) { SqlInjection::SqlInjectionConfig::isBarrier(node) }

  predicate isAdditionalFlowStep(DataFlow::Node node1, DataFlow::Node node2) {
    SqlInjection::SqlInjectionConfig::isAdditionalFlowStep(node1, node2)
  }
}
