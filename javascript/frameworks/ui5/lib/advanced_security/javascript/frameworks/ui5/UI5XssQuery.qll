import javascript
import advanced_security.javascript.frameworks.ui5.dataflow.DataFlow as UI5DataFlow
import advanced_security.javascript.frameworks.ui5.UI5View
private import semmle.javascript.frameworks.data.internal.ApiGraphModelsExtensions
private import semmle.javascript.security.dataflow.DomBasedXssQuery as DomBasedXss

module UI5Xss implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node start) {
    DomBasedXss::DomBasedXssConfig::isSource(start, _)
    or
    start instanceof RemoteFlowSource
  }

  predicate isBarrier(DataFlow::Node node) {
    /* 1. Already a sanitizer defined in `DomBasedXssQuery::Configuration` */
    DomBasedXss::DomBasedXssConfig::isBarrier(node)
    or
    /* 2. Value read from a non-string control property */
    exists(PropertyMetadata m | not m.isUnrestrictedStringType() | node = m)
    or
    /* 3-1. Sanitizers provided by `sap.base.security` */
    exists(SapDefineModule d, DataFlow::ParameterNode par |
      node = par.getACall() and
      par =
        d.getRequiredObject("sap/base/security/" +
            ["encodeCSS", "encodeJS", "encodeURL", "encodeURLParameters", "encodeXML"])
            .asSourceNode()
    )
    or
    /* 3-2. Sanitizers provided by `jQuery.sap` */
    node.(DataFlow::CallNode).getReceiver().asExpr().(PropAccess).getQualifiedName() = "jQuery.sap" and
    node.(DataFlow::CallNode).getCalleeName() =
      ["encodeCSS", "encodeJS", "encodeURL", "encodeURLParameters", "encodeXML", "encodeHTML"]
  }

  predicate isSink(DataFlow::Node node) {
    node instanceof UI5ExtHtmlISink or
    node instanceof UI5ModelHtmlISink or
    node instanceof DynamicallySetElementValueOfInstantiatedHTMLControlPlacedAtDom
  }

  predicate isAdditionalFlowStep(DataFlow::Node start, DataFlow::Node end) {
    /* Already an additional flow step defined in `DomBasedXssQuery::Configuration` */
    DomBasedXss::DomBasedXssConfig::isAdditionalFlowStep(start, _, end, _)
    or
    /* TODO: Legacy code */
    /* Handler argument node to handler parameter */
    exists(UI5Handler h |
      start = h.getBindingPath().getNode() and
      /*
       * Ideally we would like to show an intermediate node where
       * the handler is bound to a control, but there is no sourceNode there
       * `end = h.getBindingPath() or start = h.getBindingPath()`
       */

      end = h.getParameter(0)
    )
  }
}

/**
 * An HTML injection sink associated with a `UI5BoundNode`, typically for library controls acting as sinks.
 */
class UI5ModelHtmlISink extends DataFlow::Node {
  UI5ModelHtmlISink() { exists(UI5View view | view.getAnHtmlISink().getNode() = this) }
}

/**
 * An HTML injection sink typically for custom controls whose RenderManager calls acting as sinks.
 */
private class UI5ExtHtmlISink extends DataFlow::Node {
  UI5ExtHtmlISink() {
    this = ModelOutput::getASinkNode("ui5-html-injection").asSink() and
    /* Exclude property writes to HTML controls; they are covered in a separate class below. */
    not this instanceof DynamicallySetElementValueOfInstantiatedHTMLControlPlacedAtDom
  }
}

private class HTMLControlInstantiation extends ElementInstantiation {
  HTMLControlInstantiation() { typeModel("UI5HTMLControl", this.getImportPath(), _) }
}

private module TrackPlaceAtCallConfigFlow = TaintTracking::Global<TrackPlaceAtCallConfig>;

abstract class DynamicallySetElementValueOfHTML extends DataFlow::Node { }

/**
 * The DOM value of a UI5 control that is dynamically generated then placed at
 * a certain position in a DOM.
 */
class DynamicallySetElementValueOfInstantiatedHTMLControlPlacedAtDom extends DynamicallySetElementValueOfHTML
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
    /* Ensure that this is placed somewhere in the DOM. */
    TrackPlaceAtCallConfigFlow::flow(root, placeAtCall)
  }
}

class DynamicallySetElementValueOfHTMLControlReference extends DynamicallySetElementValueOfHTML {
  DynamicallySetElementValueOfHTMLControlReference() {
    /* 2. The content is written to the reference of the control. */
    exists(ControlReference controlReference |
      controlReference.isLibraryControlReference("sap.m.HTML")
    |
      /*
       * 2-1. The content is written directly to the `content` property of the control
       * reference.
       */

      this = controlReference.getAPropertyWrite("content")
      or
      /* 2-2. The content is written using the `setContent` setter.  */
      this = controlReference.getAMemberCall("setContent").getArgument(0)
    )
  }
}
