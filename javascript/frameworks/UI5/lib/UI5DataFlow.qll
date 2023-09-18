import javascript
import models.UI5::UI5
import models.UI5View
import models.UI5AMDModule
private import DataFlow::PathGraph as DataFlowPathGraph

module UI5DataFlow {
  /**
   * Additional Flow Step:
   * Binding path in the model <-> control metadata
   */
  private predicate bidiModelControl(DataFlow::Node start, DataFlow::Node end) {
    exists(DataFlow::SourceNode property, Metadata metadata, UI5BoundNode node |
      // same project
      inSameUI5Project(metadata.getFile(), node.getFile()) and
      (
        // same control
        metadata.getControl().getName() = node.getBindingPath().getControlQualifiedType()
        or
        // extended control
        exists(Extension subclass |
          metadata.getControl().getDefine().getExtendingDefine() = subclass.getDefine() and
          node.getBindingPath().getControlQualifiedType() = subclass.getName()
        )
      ) and
      property = metadata.getProperty(node.getBindingPath().getPropertyName()) and
      (
        start = property and end = node
        or
        start = node and end = property
      )
    )
  }

  predicate isAdditionalFlowStep(
    DataFlow::Node start, DataFlow::Node end, DataFlow::FlowLabel inLabel,
    DataFlow::FlowLabel outLabel
  ) {
    inLabel = "taint" and
    outLabel = "taint" and
    (
      bidiModelControl(start, end)
      or
      // handler argument node to handler parameter
      exists(UI5Handler h |
        start = h.getBindingPath().getNode() and
        // ideally we would like to show an intermediate node where
        // the handler is bound to a control, but there is no sourceNode there
        // `end = h.getBindingPath() or start = h.getBindingPath()`
        end = h.getParameter(0)
      )
      or
      /* 1. Control metadata property being the intermediate flow node */
      exists(string propName, Metadata metadata |
        // writing site -> control metadata
        start = metadata.getAWrite(propName).getArgument(1) and
        end = metadata.getProperty(propName)
        or
        // control metadata -> reading site
        start = metadata.getProperty(propName) and
        end = metadata.getARead(propName)
      )
      or
      /* 2. Model property being the intermediate flow node */
      // JS object property (corresponding to binding path) -> getProperty('/path')
      start = end.(GetBoundValue).getBind()
      or
      // setProperty('/path') -> JS object property (corresponding to binding path)
      end = start.(SetBoundValue).getBind()
      // or
      /* 3. Argument to JSONModel constructor being the intermediate flow node */
      // exists(UI5 model, GetBoundValue getP |
      //   start = getP and
      //   model.getPathString() = getP.getArgument(0).asExpr().(StringLiteral).getValue() and
      //   end = model.(JsonModel).getAnArgument() and
      //   end.asExpr() instanceof StringLiteral
      // )
    )
  }

  /**
   * Models dataflow nodes bound to a UI5 View via binding path
   */
  class UI5BoundNode extends DataFlow::Node {
    UI5BindingPath bindingPath;

    UI5BindingPath getBindingPath() { result = bindingPath }

    UI5BoundNode() {
      /* The relevant portion of the content of a JSONModel */
      exists(Property p, JsonModel model |
        // The property bound to an UI5View source
        this.(DataFlow::PropRef).getPropertyNameExpr() = p.getNameExpr() and
        // The binding path refers to this model
        bindingPath.getAbsolutePath() = model.getPathString(p) and
        inSameUI5Project(this.getFile(), bindingPath.getFile())
      )
      or
      /* The URI string to the JSONModel constructor call */
      exists(JsonModel model |
        this = model.getArgument(0) and
        this.asExpr() instanceof StringLiteral and
        bindingPath.getAbsolutePath() = model.getPathString() and
        inSameUI5Project(this.getFile(), bindingPath.getFile())
      )
    }
  }

  /**
   * An remote source associated with a `UI5BoundNode`
   */
  class UI5ModelSource extends UI5DataFlow::UI5BoundNode {
    UI5ModelSource() { bindingPath = any(UI5View view).getASource() }
  }

  /**
   * An html injection sink associated with a `UI5BoundNode`
   */
  class UI5ModelHtmlISink extends UI5DataFlow::UI5BoundNode {
    UI5View view;

    UI5ModelHtmlISink() {
      not view.getController().getModel().(JsonModel).isOneWayBinding() and
      bindingPath = view.getAnHtmlISink()
    }
  }

  /**
   * Models calls to `Model.getProperty` and `Model.getObject`
   */
  class GetBoundValue extends DataFlow::MethodCallNode {
    UI5BoundNode bind;

    GetBoundValue() {
      // direct read access to a binding path
      this.getCalleeName() = ["getProperty", "getObject"] and
      bind.getBindingPath().getAbsolutePath() = this.getArgument(0).getStringValue() and
      exists(DataFlow::SourceNode receiverSource, UI5Model model |
        receiverSource = this.getReceiver().getALocalSource() and
        model = bind.getBindingPath().getModel()
      |
        model = receiverSource
        or
        model.getController().getAModelReference() = receiverSource
      )
    }

    UI5BoundNode getBind() { result = bind }
  }

  /**
   * Models calls to `Model.setProperty` and `Model.setObject`
   */
  class SetBoundValue extends DataFlow::Node {
    UI5BoundNode bind;

    SetBoundValue() {
      exists(DataFlow::MethodCallNode setProp |
        // direct access to a binding path
        this = setProp.getArgument(1) and
        setProp.getCalleeName() = ["setProperty", "setObject"] and
        bind.getBindingPath().getAbsolutePath() = setProp.getArgument(0).getStringValue() and
        exists(DataFlow::SourceNode receiverSource, UI5Model model |
          receiverSource = setProp.getReceiver().getALocalSource()
        |
          model = bind.getBindingPath().getModel() and
          (
            model = receiverSource
            or
            model.getController().getAModelReference() = receiverSource
          )
        )
      )
    }

    UI5BoundNode getBind() { result = bind }
  }
}

module UI5PathGraph {
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
      not this.asDataFlowPathNode().getNode() instanceof UI5DataFlow::UI5BoundNode and
      this.asDataFlowPathNode() = result.asDataFlowPathNode()
      or
      this.asDataFlowPathNode().getNode().(UI5DataFlow::UI5BoundNode).getBindingPath() =
        result.asUI5BindingPathNode() and
      result.asUI5BindingPathNode() = any(UI5View view).getASource()
    }

    UI5PathNode getAPrimaryHtmlISink() {
      not this.asDataFlowPathNode().getNode() instanceof UI5DataFlow::UI5BoundNode and
      this.asDataFlowPathNode() = result.asDataFlowPathNode()
      or
      this.asDataFlowPathNode().getNode().(UI5DataFlow::UI5BoundNode).getBindingPath() =
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
    // all dataflow edges
    DataFlowPathGraph::edges(pred.asDataFlowPathNode(), succ.asDataFlowPathNode()) and
    // exclude duplicate edge from model to handler parameter
    not exists(UI5Handler h |
      pred.asDataFlowPathNode().getNode() = h.getBindingPath().getNode() and
      succ.asDataFlowPathNode().getNode() = h.getParameter(0)
    )
    or
    pred.asUI5BindingPathNode() =
      succ.asDataFlowPathNode().getNode().(UI5DataFlow::UI5BoundNode).getBindingPath() and
    pred.asUI5BindingPathNode() = any(UI5View view).getASource()
    or
    succ.asUI5BindingPathNode() =
      pred.asDataFlowPathNode().getNode().(UI5DataFlow::UI5BoundNode).getBindingPath() and
    succ.asUI5BindingPathNode() = any(UI5View view).getAnHtmlISink()
    or
    // flow to event handler parameter through the binding argument
    pred.asDataFlowPathNode().getNode() = succ.asUI5BindingPathNode().getNode()
    or
    exists(UI5Handler h |
      pred.asUI5BindingPathNode() = h.getBindingPath() and
      succ.asDataFlowPathNode().getNode() = h.getParameter(0)
    )
  }
}
