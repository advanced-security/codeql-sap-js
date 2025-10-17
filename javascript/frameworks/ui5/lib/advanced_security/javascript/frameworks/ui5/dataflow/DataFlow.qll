import javascript
import semmle.javascript.dataflow.DataFlow as StdLibDataFlow
import advanced_security.javascript.frameworks.ui5.UI5
import advanced_security.javascript.frameworks.ui5.UI5View
import advanced_security.javascript.frameworks.ui5.RemoteFlowSources
import advanced_security.javascript.frameworks.ui5.dataflow.FlowSteps
private import PatchDataFlow

/**
 * A statically visible part of a local model's content that has a binding path referring to it in a
 * control declaration acting as an HTML injection sink.
 *
 * e.g.1. Given a JSON model `oModel` declared in a controller handler and an HTML injection sink
 * `SomeSinkControl` as:
 * ```javascript
 * let oModel = new JSONModel({ y: null });
 * ```
 * and
 * ```xml
 * <SomeSinkControl x="{/y}"/>
 * ```
 * The content `y: null` of `oModel` is recognized as an instance of this class.
 *
 * e.g.2. Given a JSON model `oModel` which gains its content from a JSON file and an HTML injection
 * sink `SomeSinkControl` as:
 * ```javascript
 * let oModel = new JSONModel("controller/contents.json");
 * ```
 * and
 * ```xml
 * <SomeSinkControl x="{/y}"/>
 * ```
 * where `controller/contents.json` contains
 * ```json
 * { "y": null }
 * ```
 * The content `y: null` of `oModel` is recognized as an instance of this class.
 */
class LocalModelContentBoundBidirectionallyToHtmlISinkControl extends DomBasedXss::Sink {
  UI5BindingPath bindingPath;
  UI5Control controlDeclaration;

  LocalModelContentBoundBidirectionallyToHtmlISinkControl() {
    exists(UI5InternalModel internalModel |
      this = bindingPath.getNode() and
      (
        this instanceof PropWrite and
        internalModel.getArgument(0).getALocalSource().asExpr() =
          this.(PropWrite).getPropertyNameExpr().getParent+()
        or
        this.asExpr() instanceof StringLiteral and
        internalModel.asExpr() = this.asExpr().getParent()
      ) and
      any(UI5View view).getAnHtmlISink() = bindingPath and
      internalModel.(JsonModel).isTwoWayBinding() and
      controlDeclaration = bindingPath.getControlDeclaration()
    )
  }

  UI5BindingPath getBindingPath() { result = bindingPath }

  UI5Control getControlDeclaration() { result = controlDeclaration }
}

module UI5PathGraph<PathNodeSig ConfigPathNode, PathGraphSig<ConfigPathNode> ConfigPathGraph> {
  private newtype TNode =
    TUI5BindingPathNode(UI5BindingPath path) or
    TDataFlowNode(DataFlow::Node node)

  class UI5PathNode extends TNode {
    DataFlow::Node asDataFlowNode() { this = TDataFlowNode(result) }

    UI5BindingPath asUI5BindingPathNode() { this = TUI5BindingPathNode(result) }

    predicate isDataFlowNode() { exists(this.asDataFlowNode()) }

    predicate isUI5BindingPathNode() { exists(this.asUI5BindingPathNode()) }

    string toString() {
      result = this.asDataFlowNode().toString()
      or
      result = this.asUI5BindingPathNode().toString()
    }

    File getFile() {
      result = this.asDataFlowNode().getFile()
      or
      result = this.asUI5BindingPathNode().getView()
    }

    predicate hasLocationInfo(
      string filepath, int startline, int startcolumn, int endline, int endcolumn
    ) {
      this.asDataFlowNode().hasLocationInfo(filepath, startline, startcolumn, endline, endcolumn)
      or
      this.asUI5BindingPathNode()
          .getLocation()
          .hasLocationInfo(filepath, startline, startcolumn, endline, endcolumn)
    }

    ConfigPathNode getPathNode() { result.getNode() = this.asDataFlowNode() }

    UI5PathNode getAPrimarySource() {
      if this.asDataFlowNode() instanceof LocalModelContentBoundBidirectionallyToSourceControl
      then
        result.asUI5BindingPathNode() =
          this.asDataFlowNode()
              .(LocalModelContentBoundBidirectionallyToSourceControl)
              .getBindingPath()
      else result = this
    }

    UI5PathNode getAPrimaryHtmlISink() {
      if
        this.asDataFlowNode() instanceof LocalModelContentBoundBidirectionallyToHtmlISinkControl or
        this.asDataFlowNode() instanceof UI5ExternalModel // TODO: Narrow it down to ExternalModelBoundToHtmlISinkControl
      then
        result.asUI5BindingPathNode() =
          this.asDataFlowNode()
              .(LocalModelContentBoundBidirectionallyToHtmlISinkControl)
              .getBindingPath()
        or
        /* Look for the control with the binding path associated with the model */
        result.asUI5BindingPathNode().getModel().(UI5ExternalModel) = this.asDataFlowNode() and
        result.asUI5BindingPathNode() = any(UI5View view).getAnHtmlISink()
      else result = this
    }
  }

  query predicate nodes(UI5PathNode ui5PathNode) {
    exists(ui5PathNode.asUI5BindingPathNode())
    or
    exists(ConfigPathNode pathNode |
      pathNode.getNode() = ui5PathNode.asDataFlowNode() and
      ConfigPathGraph::nodes(pathNode, _, _)
    )
  }

  private module CustomPathGraphEdges {
    /**
     * An edge from the binding path in a view to a corresponding content of an internal model. e.g.
     * Given an XML declaration of a use of the control C, and a local model `oModel` it refers to:
     * ```xml
     * <C x="{/y}"/>
     * ```
     * and
     * ```javascript
     * let oModel = new JSONModel({ y: null });
     * ```
     *
     * establishes an edge from `x="{/y}"` to `y: null`.
     *
     * c.f. `FlowSteps::InternalModelContentToCustomMetadataPropertyStep`.
     */
    predicate bindingPathToInternalModelContent(
      UI5PathNode ui5PathNodePred, UI5PathNode ui5PathNodeSucc
    ) {
      exists(UI5BindingPath bindingPath |
        bindingPath = ui5PathNodePred.asUI5BindingPathNode() and
        ui5PathNodeSucc.asDataFlowNode() = bindingPath.getNode()
      )
    }

    /**
     * An edge from a content of an internal model to the corresponding binding path in a view,
     * which makes it an edge in the opposite direction as of `bindingPathToInternalModelContent`
     * above.
     * In order to ensure that the edge indeed holds, we check if the model's binding mode is
     * declared as two-way.
     *
     * c.f. `FlowSteps::InternalModelContentToCustomMetadataPropertyStep`.
     */
    predicate internalModelContentToBindingPath(
      UI5PathNode ui5PathNodePred, UI5PathNode ui5PathNodeSucc
    ) {
      exists(UI5BindingPath bindingPath, UI5InternalModel internalModel, Node boundNode |
        bindingPath = ui5PathNodeSucc.asUI5BindingPathNode() and
        boundNode = bindingPath.getNode() and
        (
          boundNode instanceof PropWrite and
          internalModel.(JsonModel).getAProperty() = boundNode // TODO: Generalize to UI5InternalModel
          or
          boundNode.asExpr() instanceof StringLiteral and
          ui5PathNodePred.asDataFlowNode() = boundNode
        ) and
        ui5PathNodePred.asDataFlowNode() = boundNode and
        internalModel.(JsonModel).isTwoWayBinding()
      )
    }
  }

  query predicate edges(UI5PathNode ui5PathNodePred, UI5PathNode ui5PathNodeSucc) {
    /* Include all existing dataflow edges */
    exists(ConfigPathNode pathNodeFrom, ConfigPathNode pathNodeTo |
      pathNodeFrom.getNode() = ui5PathNodePred.asDataFlowNode() and
      pathNodeTo.getNode() = ui5PathNodeSucc.asDataFlowNode() and
      ConfigPathGraph::edges(pathNodeFrom, pathNodeTo, _, _)
    ) and
    /* ========= TODO: Legacy code ========= */
    /* Exclude duplicate edge from model to handler parameter */
    not exists(UI5Handler h |
      ui5PathNodePred.asDataFlowNode() = h.getBindingPath().getNode() and
      ui5PathNodeSucc.asDataFlowNode() = h.getParameter(0)
    )
    or
    /* Flow to event handler parameter through the binding argument */
    exists(UI5Handler h |
      ui5PathNodePred.asUI5BindingPathNode() = h.getBindingPath() and
      ui5PathNodeSucc.asDataFlowNode() = h.getParameter(0)
    )
    or
    /* ===================================== */
    CustomPathGraphEdges::bindingPathToInternalModelContent(ui5PathNodePred, ui5PathNodeSucc)
    or
    CustomPathGraphEdges::internalModelContentToBindingPath(ui5PathNodePred, ui5PathNodeSucc)
    or
    /* Model with contents not statically observable */
    ui5PathNodePred.asUI5BindingPathNode().getModel() = ui5PathNodeSucc.asDataFlowNode() and
    ui5PathNodePred.asUI5BindingPathNode() = any(UI5View view).getASource()
    or
    ui5PathNodeSucc.asUI5BindingPathNode().getModel() = ui5PathNodePred.asDataFlowNode() and
    ui5PathNodeSucc.asUI5BindingPathNode() = any(UI5View view).getAnHtmlISink()
  }
}

module TrackPlaceAtCallConfig implements DataFlow::ConfigSig {
  /**
   * A child element instantiation.
   */
  predicate isSource(DataFlow::Node node) { node instanceof ElementInstantiation }

  /**
   * An "extension point" exposed from a parent element instantiation to
   * register a child to itself.
   */
  predicate isSink(DataFlow::Node node) { node instanceof ControlPlaceAtCall }

  /**
   * Step from data being written and the property that is being written to.
   * Needed to express the fact that the child control is usually written to
   * a property of a parent control to establish the child-parent relationship.
   *
   * NOTE: The "extension point" exposed by the parent control can come in the
   * form of:
   *
   * 1. `new Parent({ children: [ new Child( ... ) ] })`
   * 2. `new Parent(...).children[0] = new Child( ... )`
   * 3. `new Parent(...).addChild(new Child( ... ))`
   *
   * The first and second cases are (nested) `PropWrite`s to `getArgument(0)`
   * and are easily covered. But the third case poses a new problem of identifying
   * methods that writes to the `children` property, which CodeQL can't verify
   * because its definition is in the library.
   *
   * - [X] Mark all method calls: overgeneralizes, can infer dumb things
   *       (`sap.m.FlexBox.removeItem` comes to mind), but would still work for all
   *       true cases
   * - [ ] Heuristic by prefix: not an attractive option since heuristics can fail
   */
  predicate isAdditionalFlowStep(DataFlow::Node start, DataFlow::Node end) {
    exists(DataFlow::PropWrite propWrite |
      start = propWrite.getRhs() and
      end = propWrite.getBase()
    )
    or
    exists(DataFlow::MethodCallNode maybeAddingChildAPICall |
      start = maybeAddingChildAPICall.getAnArgument() and
      end = maybeAddingChildAPICall.getReceiver()
    )
    or
    exists(DataFlow::MethodCallNode call |
      start = call.getReceiver() and
      end = call
    )
    or
    exists(DataFlow::NewNode new |
      start = new.getAnArgument() and
      end = new
    )
  }
}
