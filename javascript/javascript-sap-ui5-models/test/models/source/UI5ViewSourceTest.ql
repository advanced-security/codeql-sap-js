/**
 * @id xss-ui5view-sources
 * @name XSS UI5View sources
 * @kind problem
 */

import javascript
import models.UI5View

from UI5BindingPath bp
where bp = any(UI5View ui5v).getASource()
select bp, "The binding path `" + bp.getAbsolutePath() + "` is a user input source."
