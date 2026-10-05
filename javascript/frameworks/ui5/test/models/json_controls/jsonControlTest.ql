import javascript
import advanced_security.javascript.frameworks.ui5.UI5Control

from UI5Control control
where exists(control.asJsonControl())
select control, control.getQualifiedType(), control.getId()
