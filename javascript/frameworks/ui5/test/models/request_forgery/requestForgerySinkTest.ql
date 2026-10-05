/**
 * @name UI5 request-forgery sinks
 * @kind problem
 * @problem.severity error
 * @id ui5-request-forgery-sinks
 */

import advanced_security.javascript.frameworks.ui5.UI5View

from UI5BindingPath sink
where sink = any(UI5View view).getASink("request-forgery")
select sink,
  "UI5 request-forgery sink on `" + sink.getControlTypeName() + "." + sink.getPropertyName() + "`."
