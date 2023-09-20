/**
 * @id xss-ui5view-sources
 * @name XSS UI5View sources
 * @kind problem
 * @problem.severity error
 */

import javascript
import advanced_security.javascript.frameworks.ui5.UI5View

from UI5BindingPath bp
where bp = any(UI5View ui5v).getASource()
select bp, "The binding path `" + bp.getAbsolutePath() + "` is a user input source."
