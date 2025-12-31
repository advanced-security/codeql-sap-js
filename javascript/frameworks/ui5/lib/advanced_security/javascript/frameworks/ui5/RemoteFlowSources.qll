import javascript
import advanced_security.javascript.frameworks.ui5.UI5
import advanced_security.javascript.frameworks.ui5.UI5View
import semmle.javascript.security.dataflow.XssThroughDomCustomizations
private import semmle.javascript.frameworks.data.internal.ApiGraphModelsExtensions

private class DataFromRemoteControlReference extends RemoteFlowSource {
  DataFromRemoteControlReference() {
    exists(UI5Control sourceControl, string typeAlias, ControlReference controlReference |
      typeModel(typeAlias, sourceControl.getImportPath(), _) and
      sourceModel(typeAlias, _, "remote", _) and
      sourceControl.getAReference() = controlReference and
      (
        this = controlReference.getAMemberCall("getValue") or
        this = controlReference.getAPropertyRead("value")
      )
    )
  }

  override string getSourceType() { result = "Data from a remote control" }
}

private class InputControlInstantiation extends ElementInstantiation {
  InputControlInstantiation() { typeModel("UI5InputControl", this.getImportPath(), _) }
}

private module TrackPlaceAtCallConfigFlow = TaintTracking::Global<TrackPlaceAtCallConfig>;

class DataFromInstantiatedAndPlacedAtControl extends RemoteFlowSource, XssThroughDom::Source {
  InputControlInstantiation controlInstantiation;
  ControlPlaceAtCall placeAtCall;

  DataFromInstantiatedAndPlacedAtControl() {
    exists(string typeAlias, ControlReference controlReference |
      /* Double check that the type derives a remote flow source. */
      typeModel(typeAlias, controlInstantiation.getImportPath(), _) and
      sourceModel(typeAlias, _, "remote", _) and
      controlInstantiation.getId() = controlReference.getId() and
      (
        this = controlReference.getAMemberCall("getValue") or
        this = controlReference.getAPropertyRead("value")
      )
    ) and
    TrackPlaceAtCallConfigFlow::flow(controlInstantiation, placeAtCall)
  }

  override string getSourceType() {
    result = "Data from an instantiated control placed in a DOM tree"
  }
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
       * 1. This flows from a DF node corresponding to the parent component's model
       * to the `this.setModel` call. e.g.
       *
       * `this.getOwnerComponent().getModel("someModelName")` as in
       * `this.getView().setModel(this.getOwnerComponent().getModel("someModelName"))`.
       */

      modelName = this.getArgument(0).getALocalSource().asExpr().(StringLiteral).getValue() and
      this.getCalleeName() = "getModel" and
      controller.getOwnerComponentRef().flowsTo(this.(MethodCallNode).getReceiver()) and
      this.flowsTo(setModelCall.getArgument(0)) and
      setModelCall = controller.getAViewReference().getAMemberCall("setModel") and
      /*
       * 2. The component's `manifest.json` declares the DataSource as being of OData type.
       */

      controller.getOwnerComponent().getExternalModelDef(modelName).getDataSource() instanceof
        ODataDataSourceManifest
    )
    or
    /*
     * A constructor call to sap.ui.model.odata.v2.ODataModel or sap.ui.model.odata.v4.ODataModel.
     */

    this instanceof NewNode and
    (
      exists(RequiredObject oDataModel |
        oDataModel.asSourceNode().flowsTo(this.getCalleeNode()) and
        oDataModel.getDependency() in [
            "sap/ui/model/odata/v2/ODataModel", "sap/ui/model/odata/v4/ODataModel"
          ]
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
    exists(ControllerHandler handler, RouteManifest routeManifest, MethodCallNode getParameterCall |
      handler.isAttachedToRoute(routeManifest.getName()) and
      this.asExpr().getEnclosingFunction() = handler.getFunction() and
      getParameterCall = handler.getParameter(0).getAMemberCall("getParameter") and
      (
        exists(string path |
          this = getParameterCall.getAPropertyRead(path) and
          routeManifest.matchesPathString(path)
        )
        or
        this = getParameterCall.getAPropertyRead().getAPropertyRead()
      )
    )
  }
}

private class DisplayEventHandlerParameterAccess extends RemoteFlowSource instanceof PropRead {
  override string getSourceType() { result = "DisplayEventHandlerParameterAccess" }

  DisplayEventHandlerParameterAccess() {
    exists(DisplayEventHandler handler |
      this = handler.getParameter(0).getAMemberCall("getParameter").getAPropertyRead()
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

/**
 * URLSearchParams.get() and getAll() return URL query parameter values which are user-controlled.
 * e.g., `new URLSearchParams(window.location.search).get("param")`
 */
private class UrlSearchParamsSource extends RemoteFlowSource {
  UrlSearchParamsSource() {
    exists(DataFlow::NewNode newCall, DataFlow::MethodCallNode getCall |
      // Match: new URLSearchParams(...)
      newCall.getCalleeName() = "URLSearchParams" and
      // Match: .get() or .getAll() on the URLSearchParams instance
      getCall.getMethodName() = ["get", "getAll"] and
      newCall.flowsTo(getCall.getReceiver()) and
      this = getCall
    )
  }

  override string getSourceType() { result = "URL query parameter" }
}
