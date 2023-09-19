/**
 * @id xss-ui5view-sinks
 * @name XSS UI5View sinks
 * @kind problem
 * @problem.severity error
 */

import javascript
import semmle.javascript.security.dataflow.DomBasedXssQuery
import advanced_security.javascript.frameworks.UI5.UI5View

from UI5BindingPath bp
where bp = any(UI5View ui5v).getAnHtmlISink()
select bp, "The binding path `" + bp.toString() + "` is an HTML injection sink."
