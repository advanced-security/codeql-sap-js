/**
 * @name XML model recognition and binding-mode regression test
 * @description Verifies constructed and manifest XML models expose path-specific content and modes.
 * @kind table
 * @id test/ui5-xml-model-modes
 * @tags test
 */

import advanced_security.javascript.frameworks.ui5.UI5DataModels
import advanced_security.javascript.frameworks.ui5.UI5View
import javascript

from UI5BindingPath binding, UI5XmlModel model, string kind, string mode
where
  binding.getModel() = model and
  binding.getPropertyName() = "value" and
  (if model instanceof XmlModel then kind = "constructed" else kind = "manifest") and
  (if model.hasTwoWayBinding() then mode = "TwoWay" else mode = "readonly")
select binding.getBinding().getBindingTarget().asXmlAttribute().getElement().getAttributeValue("id"),
  kind, getModelBindingPath(binding), mode
