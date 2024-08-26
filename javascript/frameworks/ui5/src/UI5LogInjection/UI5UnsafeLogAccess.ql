/**
 * @name Access to user-controlled UI5 Logs
 * @description Log entries from user-controlled sources should not be further processed.
 * @kind path-problem
 * @problem.severity warning
 * @security-severity 5
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

private newtype TLogEntriesNode =
  TDataFlowNode(DataFlow::Node node) {
    node = ModelOutput::getATypeNode("SapLogEntries").getInducingNode()
  } or
  TUI5ControlNode(UI5Control control) { control.getImportPath() = "sap/ui/vk/Notifications" }

class LogEntriesNode extends TLogEntriesNode {
  DataFlow::Node asDataFlowNode() { this = TDataFlowNode(result) }

  UI5Control asUI5ControlNode() { this = TUI5ControlNode(result) }

  File getFile() {
    result = this.asDataFlowNode().getFile()
    or
    result = this.asUI5ControlNode().getView()
  }

  string toString() {
    result = this.asDataFlowNode().toString()
    or
    result = this.asUI5ControlNode().toString()
  }

  predicate hasLocationInfo(
    string filepath, int startline, int startcolumn, int endline, int endcolumn
  ) {
    this.asDataFlowNode().hasLocationInfo(filepath, startline, startcolumn, endline, endcolumn)
    or
    this.asUI5ControlNode().hasLocationInfo(filepath, startline, startcolumn, endline, endcolumn)
  }
}

from
  UI5LogInjectionConfiguration cfg, UI5PathNode source, UI5PathNode sink, UI5PathNode primarySource,
  LogEntriesNode logEntries
where
  cfg.hasFlowPath(source.getPathNode(), sink.getPathNode()) and
  primarySource = source.getAPrimarySource() and
  inSameWebApp(source.getFile(), logEntries.getFile())
select logEntries, primarySource, sink, "Accessed log entries depend on $@.", primarySource,
  "user-provided data"
