import advanced_security.javascript.frameworks.ui5.UI5DataFlow 
import semmle.javascript.security.dataflow.DomBasedXssQuery as DomBasedXss

class Configuration extends DomBasedXss::Configuration {
  override predicate isAdditionalFlowStep(
    DataFlow::Node start, DataFlow::Node end, DataFlow::FlowLabel inLabel,
    DataFlow::FlowLabel outLabel
  ) {
    super.isAdditionalFlowStep(start, end, inLabel, outLabel)
    or
    UI5DataFlow::isAdditionalFlowStep(start, end, inLabel, outLabel)
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
    node.(DataFlow::CallNode).getReceiver().asExpr().(PropAccess).getQualifiedName() = "jQuery.sap" and
    node.(DataFlow::CallNode).getCalleeName() =
      ["encodeCSS", "encodeJS", "encodeURL", "encodeURLParameters", "encodeXML", "encodeHTML"]
  }
}

/**
 * An html injection sink associated with a `UI5BoundNode`
 */
private class UI5ModelHtmlISink extends UI5DataFlow::UI5ModelHtmlISink, DomBasedXss::Sink { }

private class UI5ExtHtmlISink extends DomBasedXss::Sink {
  UI5ExtHtmlISink() { this = ModelOutput::getASinkNode("ui5-html-injection").asSink() }
}

predicate isUI5Sink(UI5PathGraph::UI5PathNode sink) {
    sink.asDataFlowPathNode().getNode() instanceof UI5ModelHtmlISink or
    sink.asDataFlowPathNode().getNode() instanceof UI5ExtHtmlISink
}