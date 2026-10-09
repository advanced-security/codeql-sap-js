/**
 * @name UI5 XML model binding flow
 * @description Tests XML model aliases, manifest models, binding modes, and path-specific HTML flows.
 * @kind table
 * @id test/ui5-xml-model-binding-flow
 * @tags test
 */

import advanced_security.javascript_sap_ui5_all.Customizations as UI5Customizations
import javascript
import semmle.javascript.security.dataflow.DomBasedXssQuery

string nodeLabel(DataFlow::Node node) {
  result = node.(DataFlow::XmlAttributeNode).getAttribute().getElement().getAttributeValue("id")
  or
  node.(DataFlow::MethodCallNode).getMethodName() = "getValue" and result = "edit-handler"
  or
  exists(DataFlow::MethodCallNode read | node = read and read.getMethodName() = "getProperty" |
    if read.getArgument(0).getStringValue() = "/written"
    then result = "written-api"
    else result = "other-api"
  )
}

from DomBasedXssFlow::PathNode source, DomBasedXssFlow::PathNode sink
where DomBasedXssFlow::flowPath(source, sink)
select nodeLabel(source.getNode()), nodeLabel(sink.getNode())
