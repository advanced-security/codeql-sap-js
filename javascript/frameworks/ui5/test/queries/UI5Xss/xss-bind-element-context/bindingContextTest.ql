/**
 * @name UI5 binding context resolution test
 * @description Verifies that UI5 binding paths resolve to their absolute contexts.
 * @kind table
 * @id test/ui5-binding-context-resolution
 * @tags test
 */

import advanced_security.javascript.frameworks.ui5.UI5View

from UI5BindingPath path
select path, path.getAbsolutePath()
