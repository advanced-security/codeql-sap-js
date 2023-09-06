import javascript
import models.UI5DataFlowShared
private import DataFlow::PathGraph as DataFlowPathGraph
import semmle.javascript.security.dataflow.DomBasedXssQuery as DomBasedXss

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

    UI5PathNode getAPrimarySink() {
      not this.asDataFlowPathNode().getNode() instanceof UI5ModelSink and
      this.asDataFlowPathNode() = result.asDataFlowPathNode()
      or
      this.asDataFlowPathNode().getNode().(UI5ModelSink).getBindingPath() =
        result.asUI5BindingPathNode() and
      result.asUI5BindingPathNode() = any(UI5View view).getAnHtmlISink()
    }
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
    or
    succ.asUI5BindingPathNode() =
      pred.asDataFlowPathNode().getNode().(UI5ModelSink).getBindingPath() and
    succ.asUI5BindingPathNode() = any(UI5View view).getAnHtmlISink()
  }

  class UI5XssConfiguration extends DomBasedXss::Configuration {
    override predicate isAdditionalFlowStep(
      DataFlow::Node start, DataFlow::Node end, DataFlow::FlowLabel inLabel,
      DataFlow::FlowLabel outLabel
    ) {
      super.isAdditionalFlowStep(start, end, inLabel, outLabel) or
      UI5Shared::isAdditionalFlowStep(start, end, inLabel, outLabel)
    }

    override predicate isSanitizer(DataFlow::Node node) {
      super.isSanitizer(node)
      or
      // value read from a non-string property
      exists(string prop_name |
        node = any(Metadata m | not m.isUnrestrictedStringType(prop_name)).getProperty(prop_name)
      )
      or
      // UI5 sanitizers
      exists(SapAmdModuleDefinition d, DataFlow::ParameterNode par |
        node = par.getACall() and
        par.getParameter() =
          d.getDependencyParameter("sap/base/security/" +
              ["encodeCSS", "encodeJS", "encodeURL", "encodeURLParameters", "encodeXML"])
      )
      or
      // UI5 jQuery sanitizers
      node.(DataFlow::CallNode).getReceiver().asExpr().(PropAccess).getQualifiedName() =
        "jQuery.sap" and
      node.(DataFlow::CallNode).getCalleeName() =
        ["encodeCSS", "encodeJS", "encodeURL", "encodeURLParameters", "encodeXML", "encodeHTML"]
    }
  }

  /**
   * An remote source associated with a `UI5BoundNode`
   */
  class UI5ModelSource extends UI5Shared::UI5BoundNode, DomBasedXss::Source {
    UI5ModelSource() { bindingPath = any(UI5View view).getASource() }
  }

  /**
   * An html injection sink associated with a `UI5BoundNode`
   */
  class UI5ModelSink extends UI5Shared::UI5BoundNode, DomBasedXss::Sink {
    UI5View view;

    UI5ModelSink() {
      not view.getController().getModel().(JsonModel).isOneWayBinding() and
      bindingPath = view.getAnHtmlISink()
    }
  }
}
