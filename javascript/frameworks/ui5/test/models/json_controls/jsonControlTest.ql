/**
 * @name UI5 JSON control recognition test
 * @description Verifies that JSONView control definitions are recognized as UI5 controls.
 * @kind table
 * @id test/ui5-json-control-recognition
 * @tags test
 */

import javascript
import advanced_security.javascript.frameworks.ui5.UI5Control

from UI5Control control
where exists(control.asJsonControl())
select control, control.getQualifiedType(), control.getId()
