import javascript
import advanced_security.javascript.frameworks.ui5.UI5
import advanced_security.javascript.frameworks.ui5.UI5Control
import advanced_security.javascript.frameworks.ui5.UI5View
import advanced_security.javascript.frameworks.ui5.dataflow.UI5DataFlow
private import advanced_security.javascript.frameworks.ui5.dataflow.FlowSteps
private import semmle.javascript.frameworks.data.internal.ApiGraphModelsExtensions
private import semmle.javascript.security.dataflow.DomBasedXssCustomizations

/**
 * A declarative UI5 control property that interprets its bound value as HTML.
 */
class UI5BindingHtmlInjectionSink extends DomBasedXss::Sink {
  UI5BindingHtmlInjectionSink() {
    exists(UI5View view, UI5BindingPath bindingPath |
      bindingPath = view.getAnHtmlISink() and
      not bindingPath.getControlDeclaration().isHTMLSanitized() and
      this = bindingPath.getNode()
    )
  }
}

/**
 * An HTML injection sink on a reference to a library control.
 */
private class UI5HTMLControlReferenceContentAPI extends DomBasedXss::Sink {
  UI5HTMLControlReferenceContentAPI() {
    exists(
      UI5Control sinkControl, UI5View view, string typeAlias, ControlReference controlReference
    |
      typeModel(typeAlias, sinkControl.getImportPath(), _) and
      sinkModel(typeAlias, _, "ui5-html-injection", _) and
      sinkControl = view.getControl() and
      sinkControl.getAReference() = controlReference and
      controlReferenceBelongsToController(controlReference, view.getController()) and
      (
        this = controlReference.getAMemberCall("setContent").getArgument(0) or
        this = controlReference.getAPropertyWrite("content").getRhs()
      )
    ) and
    not this instanceof DynamicallySetElementValueOfInstantiatedHTMLControlPlacedAtDom
  }
}

/**
 * An HTML injection sink defined by a Model-as-Data entry.
 */
private class UI5ExtHtmlISink extends DomBasedXss::Sink {
  UI5ExtHtmlISink() {
    this = ModelOutput::getASinkNode("ui5-html-injection").asSink() and
    not this instanceof DynamicallySetElementValueOfInstantiatedHTMLControlPlacedAtDom
  }
}

private module TrackPlaceAtCallConfigFlow = TaintTracking::Global<TrackPlaceAtCallConfig>;

abstract class DynamicallySetElementValueOfHTML extends DataFlow::Node { }

/**
 * HTML assigned to a dynamically instantiated UI5 HTML control that is placed in the DOM.
 */
class DynamicallySetElementValueOfInstantiatedHTMLControlPlacedAtDom extends DynamicallySetElementValueOfHTML,
  DomBasedXss::Sink
{
  DataFlow::Node root;
  ControlPlaceAtCall placeAtCall;

  DynamicallySetElementValueOfInstantiatedHTMLControlPlacedAtDom() {
    exists(NewNode new | root = new |
      new = ModelOutput::getATypeNode("UI5HTMLControl").getAnInstantiation() and
      (
        this = new.getAnArgument().(ObjectLiteralNode).getAPropertyWrite("content").getRhs()
        or
        this = new.getAPropertyWrite("content").getRhs()
        or
        this = new.getAMemberCall("setContent").getAnArgument()
      )
    ) and
    TrackPlaceAtCallConfigFlow::flow(root, placeAtCall)
  }
}

class DynamicallySetElementValueOfHTMLControlReference extends DynamicallySetElementValueOfHTML {
  DynamicallySetElementValueOfHTMLControlReference() {
    exists(ControlReference controlReference |
      controlReference.isLibraryControlReference("sap.m.HTML")
    |
      this = controlReference.getAPropertyWrite("content")
      or
      this = controlReference.getAMemberCall("setContent").getArgument(0)
    )
  }
}

/**
 * An unrestricted string property of a locally implemented UI5 control.
 */
class LocalModelStringPropertySource extends DomBasedXss::Source {
  LocalModelStringPropertySource() {
    this = any(PropertyMetadata property | property.isUnrestrictedStringType())
  }
}

predicate isUI5HtmlInjectionSink(DataFlow::Node node) {
  node instanceof UI5BindingHtmlInjectionSink
  or
  node instanceof LocalModelContentBoundBidirectionallyToHtmlISinkControl
  or
  node instanceof UI5HTMLControlReferenceContentAPI
  or
  node instanceof UI5ExtHtmlISink
  or
  node instanceof DynamicallySetElementValueOfInstantiatedHTMLControlPlacedAtDom
}
