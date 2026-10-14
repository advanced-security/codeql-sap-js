/**
 * @name CQL shortcut parameter regression test
 * @description Preserves query-parameter selection across all six CRUD shortcut classes.
 * @kind table
 * @id test/cap-shortcut-parameters
 * @tags test
 */

import advanced_security.javascript.frameworks.cap.CDS
import javascript

from CqlShortcutMethodCall call, DataFlow::Node argument
where
  call.getFile().getBaseName() = "shortcuts.js" and
  argument = call.getAQueryParameter()
select call.getMethodName(), argument.getStringValue()
