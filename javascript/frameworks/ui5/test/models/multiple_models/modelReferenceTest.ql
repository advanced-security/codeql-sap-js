/**
 * @name UI5 model reference resolution test
 * @description Verifies that model references resolve to their associated UI5 models.
 * @kind table
 * @id test/ui5-model-reference-resolution
 * @tags test
 */

import javascript
import advanced_security.javascript.frameworks.ui5.UI5DataModels

from ModelReference reference, UI5Model model
where model = reference.getResolvedModel()
select reference, model
