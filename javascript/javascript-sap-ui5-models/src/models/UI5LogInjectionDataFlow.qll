import javascript
import models.UI5View
import models.UI5DataFlowShared
private import DataFlow::PathGraph as DataFlowPathGraph
import semmle.javascript.security.dataflow.LogInjectionQuery as LogInjection

module PathGraph {
  newtype TNode =
    TUI5BindingPathNode(UI5BindingPath path) or
    TDataFlowPathNode(DataFlow::Node node)

  class UI5PathNode extends TNode {
    DataFlow::PathNode asDataFlowPathNode() { this = TDataFlowPathNode(result.getNode()) }

    UI5BindingPath asUI5BindingPathNode() { this = TUI5BindingPathNode(result) }

    string toString() {
      result = this.asDataFlowPathNode().toString()
      or
      result = this.asUI5BindingPathNode().toString()
    }

    predicate hasLocationInfo(
      string filepath, int startline, int startcolumn, int endline, int endcolumn
    ) {
      this.asDataFlowPathNode()
          .getNode()
          .hasLocationInfo(filepath, startline, startcolumn, endline, endcolumn)
      or
      this.asUI5BindingPathNode()
          .getLocation()
          .hasLocationInfo(filepath, startline, startcolumn, endline, endcolumn)
    }

    UI5PathNode getAPrimarySource() {
      not this.asDataFlowPathNode().getNode() instanceof UI5ModelSource and
      this.asDataFlowPathNode() = result.asDataFlowPathNode()
      or
      this.asDataFlowPathNode().getNode().(UI5ModelSource).getBindingPath() =
        result.asUI5BindingPathNode() and
      result.asUI5BindingPathNode() = any(UI5View view).getASource()
    }

    UI5PathNode getAPrimarySink() { this.asDataFlowPathNode() = result.asDataFlowPathNode() }
  }

  query predicate nodes(UI5PathNode nd) {
    exists(nd.asUI5BindingPathNode())
    or
    DataFlowPathGraph::nodes(nd.asDataFlowPathNode())
  }

  query predicate edges(UI5PathNode pred, UI5PathNode succ) {
    DataFlowPathGraph::edges(pred.asDataFlowPathNode(), succ.asDataFlowPathNode())
    or
    pred.asUI5BindingPathNode() =
      succ.asDataFlowPathNode().getNode().(UI5ModelSource).getBindingPath() and
    pred.asUI5BindingPathNode() = any(UI5View view).getASource()
  }

  class UI5LogInjectionConfiguration extends LogInjection::LogInjectionConfiguration {
    override predicate isAdditionalFlowStep(
      DataFlow::Node start, DataFlow::Node end, DataFlow::FlowLabel inLabel,
      DataFlow::FlowLabel outLabel
    ) {
      UI5Shared::isAdditionalFlowStep(start, end, inLabel, outLabel)
    }
  }

  /**
   * An remote source associated with a `UI5BoundNode`
   */
  class UI5ModelSource extends UI5Shared::UI5BoundNode, LogInjection::Source {
    UI5ModelSource() { bindingPath = any(UI5View view).getASource() }
  }

  private class SinkFromModel extends LogInjection::Sink {
    SinkFromModel() { this = ModelOutput::getASinkNode("log-injection").asSink() }
  }
}
