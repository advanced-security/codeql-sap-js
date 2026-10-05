/**
 * Provides remote-flow sources for UI5 controls, bidirectional model bindings, route parameters,
 * and event data.
 */

import javascript
import advanced_security.javascript.frameworks.ui5.UI5
import advanced_security.javascript.frameworks.ui5.UI5Control
import advanced_security.javascript.frameworks.ui5.UI5View
import semmle.javascript.security.dataflow.XssThroughDomCustomizations
private import semmle.javascript.frameworks.data.internal.ApiGraphModelsExtensions

abstract private class RemoteControlAPISource extends SourceNode { }

abstract private class UI5ClientSideRemoteFlowSource extends ClientSideRemoteFlowSource {
  override ClientSideRemoteFlowKind getKind() { result = "browser" }
}

private class RemoteControlReference extends RemoteControlAPISource, ControlReference {
  RemoteControlReference() {
    exists(UI5Control sourceControl, UI5View view, string typeAlias |
      typeModel(typeAlias, sourceControl.getImportPath(), _) and
      sourceModel(typeAlias, _, "remote", _) and
      sourceControl = view.getControl() and
      sourceControl.getAReference() = this and
      controlReferenceBelongsToController(this, view.getController())
    )
  }
}

private class RemoteControlHandlerParameter extends RemoteControlAPISource, CallNode {
  RemoteControlHandlerParameter() {
    exists(UI5Control sourceControl, string typeAlias, UI5Handler handler |
      typeModel(typeAlias, sourceControl.getImportPath(), _) and
      sourceModel(typeAlias, _, "remote", _) and
      handler.getControl() = sourceControl and
      this = handler.getParameter(0).getAMemberCall("getSource")
    )
  }
}

/**
 * A remote flow source representing user-provided data fetched from UI5 input controls.
 *
 * This class models data obtained from control references (such as `HTML` or `CodeEditor`)
 * or from handler parameters, via property reads or getter methods like `getValue()` or
 * `getCurrentValue()`. These represent user input that could potentially be tainted.
 */
private class UserDataFromRemoteControlAPISource extends UI5ClientSideRemoteFlowSource {
  UserDataFromRemoteControlAPISource() {
    exists(RemoteControlAPISource remoteControlAPISource |
      /*
       * 1. The `value` or its getter of `HTML` control reference, `CodeEditor` control reference,
       * or handler parameters.
       */

      this = remoteControlAPISource.getAPropertyRead("value") or
      this = remoteControlAPISource.getAMemberCall("getValue") or
      /* 2. The `getCurrentValue` method call on `CodeEditor` control reference. */
      this = remoteControlAPISource.getAMemberCall("getCurrentValue")
    )
  }

  override string getSourceType() {
    result = "User-provided data fetched from an input control via JavaScript API"
  }
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

class UI5BindingClientSideSource extends UI5ClientSideRemoteFlowSource {
  UI5BindingPath bindingPath;

  UI5BindingClientSideSource() {
    exists(UI5InternalModel internalModel |
      internalModel.hasContentNodeForBinding(bindingPath, this) and
      any(UI5View view).getASource() = bindingPath and
      internalModel.hasTwoWayBinding()
    )
  }

  override string getSourceType() { result = "Data from a property bound to a UI5 input control" }
}

class LocalModelContentBoundBidirectionallyToSourceControl extends RemoteFlowSource {
  UI5BindingPath bindingPath;
  UI5Control controlDeclaration;

  LocalModelContentBoundBidirectionallyToSourceControl() {
    exists(UI5InternalModel internalModel |
      internalModel.hasContentNodeForBinding(bindingPath, this) and
      any(UI5View view).getASource() = bindingPath and
      internalModel.hasTwoWayBinding() and
      controlDeclaration = bindingPath.getControlDeclaration()
    )
  }

  override string getSourceType() {
    result = "Local model bidirectionally bound to a input control"
  }

  UI5BindingPath getBindingPath() { result = bindingPath }

  UI5Control getControlDeclaration() { result = controlDeclaration }
}

private class RouteParameterAccess extends UI5ClientSideRemoteFlowSource instanceof PropRead {
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

private class DisplayEventHandlerParameterAccess extends UI5ClientSideRemoteFlowSource instanceof PropRead
{
  override string getSourceType() { result = "DisplayEventHandlerParameterAccess" }

  DisplayEventHandlerParameterAccess() {
    exists(DisplayEventHandler handler |
      this = handler.getParameter(0).getAMemberCall("getParameter").getAPropertyRead()
    )
  }
}
