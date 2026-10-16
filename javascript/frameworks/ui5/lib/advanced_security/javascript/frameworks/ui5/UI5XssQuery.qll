import javascript
import advanced_security.javascript.frameworks.ui5.HtmlInjections
import advanced_security.javascript.frameworks.ui5.RemoteFlowSources
import advanced_security.javascript.frameworks.ui5.Sanitizers
import advanced_security.javascript.frameworks.ui5.dataflow.FlowSteps
private import semmle.javascript.security.dataflow.DomBasedXssQuery as DomBasedXss

/**
 * Taint tracking for UI5-specific HTML sinks and path rendering.
 *
 * Standard queries share source and sanitizer customizations and legacy local JSON-model sinks.
 * The UI5-specific HTML sink adapters are not imported by the shared customization entry point.
 */
module UI5Xss implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) {
    DomBasedXss::DomBasedXssConfig::isSource(source, _)
    or
    source instanceof RemoteFlowSource
  }

  predicate isBarrier(DataFlow::Node node) {
    DomBasedXss::DomBasedXssConfig::isBarrier(node)
    or
    node instanceof DomBasedXss::Sanitizer
  }

  predicate isSink(DataFlow::Node sink) { isUI5HtmlInjectionSink(sink) }

  predicate isAdditionalFlowStep(DataFlow::Node start, DataFlow::Node end) {
    DomBasedXss::DomBasedXssConfig::isAdditionalFlowStep(start, _, end, _)
  }
}
