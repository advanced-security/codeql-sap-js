/**
 * @name UI5 loader dependency precision without QL customizations
 * @description Unrelated loader dependencies must not be treated as UI5 controls or elements.
 * @kind table
 * @id test/ui5-stock-loader-dependency-precision
 * @tags test
 */

import advanced_security.javascript.frameworks.ui5.UI5ModuleLoader
import javascript
import semmle.javascript.security.dataflow.DomBasedXssQuery

from Sink sink
where sink.getFile().getBaseName() = "app.controller.js"
select sink, sink.asExpr().(StringLiteral).getValue()
