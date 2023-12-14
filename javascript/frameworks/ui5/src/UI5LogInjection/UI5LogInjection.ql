/**
 * @name UI5 Log injection
 * @description Building log entries from user-controlled sources is vulnerable to
 *              insertion of forged log entries by a malicious user.
 * @kind path-problem
 * @problem.severity error
 * @security-severity 7.8
 * @precision medium
 * @id js/ui5-log-injection
 * @tags security
 *       external/cwe/cwe-117
 */

import javascript
import advanced_security.javascript.frameworks.ui5.UI5DataFlow
import advanced_security.javascript.frameworks.ui5.UI5DataFlow::UI5PathGraph
import semmle.javascript.security.dataflow.LogInjectionQuery as LogInjection

class UI5LogInjectionConfiguration extends LogInjection::LogInjectionConfiguration {
  override predicate isAdditionalFlowStep(
    DataFlow::Node start, DataFlow::Node end, DataFlow::FlowLabel inLabel,
    DataFlow::FlowLabel outLabel
  ) {
    super.isAdditionalFlowStep(start, end, inLabel, outLabel)
    or
    UI5DataFlow::isAdditionalFlowStep(start, end, inLabel, outLabel)
  }
}

/**
 * An remote source associated with a `UI5BoundNode`
 */
class UI5ModelSource extends UI5DataFlow::UI5ModelSource, LogInjection::Source { }

// Sources and Sinks from data-extensions
class UI5ExtSource extends LogInjection::Source {
  UI5ExtSource() { this = ModelOutput::getASourceNode("ui5-remote").asSource() }
}

class UI5ExtLogISink extends LogInjection::Sink {
  UI5ExtLogISink() { this = ModelOutput::getASinkNode("ui5-log-injection").asSink() }
}

// log-injections source or sinks that are ui5-specific
private predicate isUI5Specific(UI5PathGraph::UI5PathNode source, UI5PathGraph::UI5PathNode sink) {
  source.asDataFlowNode() instanceof UI5ExtSource or
  source.asDataFlowNode() instanceof UI5ModelSource or
  sink.asDataFlowNode() instanceof UI5ExtLogISink
}

from
  UI5LogInjectionConfiguration cfg, UI5PathGraph::UI5PathNode source,
  UI5PathGraph::UI5PathNode sink, UI5PathGraph::UI5PathNode primarySource
where
  cfg.hasFlowPath(source.getPathNode(), sink.getPathNode()) and
  primarySource = source.getAPrimarySource() and
  /* Source or sink are UI5-specific */
  isUI5Specific(source, sink)
select sink, primarySource, sink, "Log entry depends on a $@.", primarySource, "user-provided value"
