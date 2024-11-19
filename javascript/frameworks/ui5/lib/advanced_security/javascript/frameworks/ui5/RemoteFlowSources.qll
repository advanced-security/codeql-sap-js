import javascript
import advanced_security.javascript.frameworks.ui5.UI5
import advanced_security.javascript.frameworks.ui5.UI5View
private import semmle.javascript.frameworks.data.internal.ApiGraphModelsExtensions as ApiGraphModelsExtensions

private class DataFromRemoteControlReference extends RemoteFlowSource, MethodCallNode {
  DataFromRemoteControlReference() {
    exists(UI5Control sourceControl, string typeAlias, ControlReference controlReference |
      ApiGraphModelsExtensions::typeModel(typeAlias, sourceControl.getImportPath(), _) and
      ApiGraphModelsExtensions::sourceModel(typeAlias, _, "remote", _) and
      sourceControl.getAReference() = controlReference and
      controlReference.flowsTo(this.getReceiver()) and
      this.getMethodName() = "getValue"
    )
  }

  override string getSourceType() { result = "Data from a remote control" }
}

class LocalModelContentBoundBidirectionallyToSourceControl extends RemoteFlowSource {
  UI5BindingPath bindingPath;
  UI5Control controlDeclaration;

  LocalModelContentBoundBidirectionallyToSourceControl() {
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
      any(UI5View view).getASource() = bindingPath and
      internalModel.(JsonModel).isTwoWayBinding() and
      controlDeclaration = bindingPath.getControlDeclaration()
    )
  }

  override string getSourceType() {
    result = "Local model bidirectionally bound to a input control"
  }

  UI5BindingPath getBindingPath() { result = bindingPath }

  UI5Control getControlDeclaration() { result = controlDeclaration }
}

abstract class UI5ExternalModel extends UI5Model, RemoteFlowSource {
  abstract string getName();
}

/** Model which gains content from an SAP OData service. */
class ODataServiceModel extends UI5ExternalModel {
  string modelName;

  override string getSourceType() { result = "ODataServiceModel" }

  ODataServiceModel() {
    exists(MethodCallNode setModelCall, CustomController controller |
      /*
       * 1. This flows from a DF node corresponding to the parent component's model to the `this.setModel` call
       * i.e. Aims to capture something like `this.getOwnerComponent().getModel("someModelName")` as in
       * `this.getView().setModel(this.getOwnerComponent().getModel("someModelName"))`
       */

      modelName = this.getArgument(0).getALocalSource().asExpr().(StringLiteral).getValue() and
      this.getCalleeName() = "getModel" and
      controller.getOwnerComponentRef().flowsTo(this.(MethodCallNode).getReceiver()) and
      this.flowsTo(setModelCall.getArgument(0)) and
      setModelCall.getMethodName() = "setModel" and
      setModelCall.getReceiver() = controller.getAViewReference() and
      /* 2. The component's manifest.json declares the DataSource as being of OData type */
      controller.getOwnerComponent().getExternalModelDef(modelName).getDataSource() instanceof
        ODataDataSourceManifest
    )
    or
    /*
     * A constructor call to sap.ui.model.odata.v2.ODataModel.
     */

    this instanceof NewNode and
    (
      exists(RequiredObject oDataModel |
        oDataModel.flowsTo(this.getCalleeNode()) and
        oDataModel.getDependencyType() = "sap/ui/model/odata/v2/ODataModel"
      )
      or
      this.getCalleeName() = "ODataModel"
    ) and
    modelName = "<no name>"
  }

  override string getName() { result = modelName }
}

private class RouteParameterAccess extends RemoteFlowSource instanceof PropRead {
  override string getSourceType() { result = "RouteParameterAccess" }

  RouteParameterAccess() {
    exists(
      ControllerHandler handler, RouteManifest routeManifest, ParameterNode handlerParameter,
      MethodCallNode getParameterCall
    |
      handler.isAttachedToRoute(routeManifest.getName()) and
      this.asExpr().getEnclosingFunction() = handler.getFunction() and
      handlerParameter = handler.getParameter(0) and
      getParameterCall.getMethodName() = "getParameter" and
      getParameterCall.getReceiver().getALocalSource() = handlerParameter and
      (
        routeManifest.matchesPathString(this.getPropertyName()) and
        this.getBase().getALocalSource() = getParameterCall
        or
        /* TODO: Why does `routeManifest.matchesPathString` not work for propertyName?? */
        this.getBase().(PropRead).getBase().getALocalSource() = getParameterCall
      )
    )
  }
}

private class DisplayEventHandlerParameterAccess extends RemoteFlowSource instanceof PropRead {
  override string getSourceType() { result = "DisplayEventHandlerParameterAccess" }

  DisplayEventHandlerParameterAccess() {
    exists(DisplayEventHandler handler, MethodCallNode getParameterCall |
      getParameterCall.getMethodName() = "getParameter" and
      this.getBase().getALocalSource() = getParameterCall and
      handler.getParameter(0) = getParameterCall.getReceiver().getALocalSource()
    )
  }
}

/**
 * Method calls that fetch a piece of data either from a library control capable of accepting user input, or from a URI parameter.
 */
private class UI5ExtRemoteSource extends RemoteFlowSource {
  UI5ExtRemoteSource() { this = ModelOutput::getASourceNode("remote").asSource() }

  override string getSourceType() {
    result = "Remote flow" // Don't discriminate between UI5-specific remote flows and vanilla ones
  }
}
