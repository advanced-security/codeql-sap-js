import javascript
import advanced_security.javascript.frameworks.ui5.dataflow.DataFlow
import semmle.javascript.security.dataflow.LogInjectionQuery

module UI5LogInjection implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node node) { node instanceof RemoteFlowSource }

  predicate isBarrier(DataFlow::Node node) { LogInjectionConfig::isBarrier(node) }

  predicate isSink(DataFlow::Node node) {
    node = ModelOutput::getASinkNode("ui5-log-injection").asSink()
  }
}
