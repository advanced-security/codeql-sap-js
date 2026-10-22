/**
 * @name UI5 fragment reference resolution test
 * @description Verifies that fragment references resolve to the matching UI5 controls.
 * @kind table
 * @id test/ui5-fragment-reference-resolution
 * @tags test
 */

import javascript
import advanced_security.javascript.frameworks.ui5.UI5Control

from UI5View view, UI5Control control, ControlReference reference
where
  control = view.getControl() and
  reference = control.getAReference() and
  controlReferenceBelongsToView(reference, view) and
  reference.getNumArgument() = 2
select reference, reference.getArgument(0).toString(), control.getFile().getBaseName(),
  control.getQualifiedType() + "#" + control.getId()
