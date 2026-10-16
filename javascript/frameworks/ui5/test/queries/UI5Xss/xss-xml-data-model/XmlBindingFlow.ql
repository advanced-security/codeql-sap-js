/**
 * @name UI5 XML model binding flow
 * @description Tests XML model aliases, manifest models, binding modes, and path-specific HTML flows.
 * @kind table
 * @id test/ui5-xml-model-binding-flow
 * @tags test
 */

import javascript
import advanced_security.javascript.frameworks.ui5.UI5XssQuery
import advanced_security.javascript_sap_ui5_all.Customizations as UI5Customizations
import semmle.javascript.security.dataflow.DomBasedXssQuery as StandardXss

module UI5XssFlow = TaintTracking::Global<UI5Xss>;

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

from DataFlow::Node source, DataFlow::Node sink
where
  StandardXss::DomBasedXssFlow::flow(source, sink)
  or
  UI5XssFlow::flow(source, sink)
select nodeLabel(source), nodeLabel(sink)
