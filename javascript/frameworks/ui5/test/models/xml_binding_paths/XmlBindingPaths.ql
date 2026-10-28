/**
 * @name XML model binding path parser regression test
 * @description Recognizes XML attribute and text property paths in default and named models.
 * @kind table
 * @id test/ui5-xml-binding-paths
 * @tags test
 */

import advanced_security.javascript.frameworks.ui5.Bindings
import javascript
import semmle.javascript.XML as XMLData

from BindingPath binding, XMLData::XmlAttribute attribute
where
  attribute = binding.getBinding().getBindingTarget().asXmlAttribute() and
  attribute.getElement().getFile().getBaseName() = "xml-paths.view.xml"
select attribute.getElement().getAttributeValue("id"), binding.asString()
