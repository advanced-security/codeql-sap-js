/**
 * @name Access to user-controlled UI5 Logs
 * @description Building log entries from user-controlled sources is vulnerable to
 *              insertion of forged log entries by a malicious user.
 * @kind path-problem
 * @problem.severity warning
 * @security-severity 7.8
 * @precision medium
 * @id js/ui5-unsafe-log-access
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
  UI5LogInjectionConfiguration cfg, UI5PathNode source, UI5PathNode sink, UI5PathNode primarySource,
  API::Node logListener
where
  cfg.hasFlowPath(source.getPathNode(), sink.getPathNode()) and
  primarySource = source.getAPrimarySource() and
  logListener = ModelOutput::getATypeNode("SapLogEntries")
select sink, primarySource, sink, "Log entry depends on a $@ and is $@.",
  primarySource, "user-provided value", logListener, "further accessed"
