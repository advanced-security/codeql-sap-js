/**
 * @name UI5 loader callback selection
 * @description Resolves dependencies to success factories rather than error callbacks or export flags.
 * @kind table
 * @id test/ui5-loader-callback-selection
 * @tags test
 */

import advanced_security.javascript.frameworks.ui5.UI5ModuleLoader
import javascript
import semmle.javascript.security.dataflow.DomBasedXssQuery

from Sink sink
where sink.getFile().getBaseName() = "loader.variants.js"
select sink, sink.asExpr().(StringLiteral).getValue()
