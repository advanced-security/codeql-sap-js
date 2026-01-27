import javascript
import advanced_security.javascript.frameworks.ui5.dataflow.DataFlow
import semmle.javascript.security.dataflow.LogInjectionQuery

module UI5UnsafeLogAccess implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node node) { node instanceof RemoteFlowSource }

  predicate isBarrier(DataFlow::Node node) { LogInjectionConfig::isBarrier(node) }

  predicate isSink(DataFlow::Node node) {
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
