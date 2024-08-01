/**
 * @name UI5 client-side Log injection
 * @description Log entries should not include user-controlled data.
 * @kind path-problem
 * @problem.severity recommendation
 * @security-severity 7.8
 * @precision medium
 * @id js/ui5-log-injection
 * @tags security
 *       external/cwe/cwe-117
 */

import javascript
import advanced_security.javascript.frameworks.ui5.dataflow.DataFlow
import advanced_security.javascript.frameworks.ui5.dataflow.DataFlow::UI5PathGraph
import semmle.javascript.security.dataflow.LogInjectionQuery as LogInjection

class UI5LogInjectionConfiguration extends LogInjection::LogInjectionConfiguration {
  override predicate isSource(DataFlow::Node node) { node instanceof RemoteFlowSource }

  override predicate isSink(DataFlow::Node node) {
    node = ModelOutput::getASinkNode("ui5-log-injection").asSink()
  }
}

from
  UI5LogInjectionConfiguration cfg, UI5PathNode source, UI5PathNode sink, UI5PathNode primarySource
where
  cfg.hasFlowPath(source.getPathNode(), sink.getPathNode()) and
  primarySource = source.getAPrimarySource()
select sink, primarySource, sink, "Log entry depends on a $@.", primarySource, "user-provided value"
