/**
 * @name UI5 URL redirect sinks
 * @description Lists declarative UI5 properties modeled as client-side URL redirect sinks.
 * @kind problem
 * @problem.severity error
 * @id ui5-url-redirect-sinks
 * @tags test
 */

import advanced_security.javascript.frameworks.ui5.UI5View

from UI5BindingPath sink
where sink = any(UI5View view).getASink("url-redirection")
select sink,
  "UI5 URL redirect sink on `" + sink.getControlTypeName() + "." + sink.getPropertyName() + "`."
