import javascript
import advanced_security.javascript.frameworks.ui5.UI5DataModels

from ModelReference reference, UI5Model model
where model = reference.getResolvedModel()
select reference, model
