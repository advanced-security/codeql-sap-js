/**
 * @id ui5-bindings
 * @name UI5 bindings
 * @kind problem
 * @problem.severity error
 */

import javascript
import advanced_security.javascript.frameworks.UI5.UI5View

from UI5BindingPath path
select path, path.getAbsolutePath()
