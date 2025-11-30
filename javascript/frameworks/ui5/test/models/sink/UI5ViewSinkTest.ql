/**
 * @id xss-ui5view-sinks
 * @name XSS UI5View sinks
 * @kind problem
 * @problem.severity error
 */

import javascript
import advanced_security.javascript.frameworks.ui5.UI5View

from UI5BindingPath bp
where
  bp = any(UI5View ui5v).getAnHtmlISink() and
  not bp.getControlDeclaration().isSanitizedControl()
select bp, "The binding path `" + bp.toString() + "` is an HTML injection sink."
