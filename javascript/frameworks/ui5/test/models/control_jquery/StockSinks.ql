/**
 * @name UI5 jQuery sinks from models as data
 * @description Checks modeled HTML sinks with the UI5 loader adapter but no security customizations.
 * @kind problem
 * @id js/ui5-stock-jquery-sinks-test
 * @tags security
 *       external/cwe/cwe-079
 */

import advanced_security.javascript.frameworks.ui5.UI5ModuleLoader
import javascript
import semmle.javascript.security.dataflow.DomBasedXssQuery

from Sink sink
where sink.getFile().getBaseName() = ["app.controller.js", "required.controller.js"]
select sink, sink.asExpr().(StringLiteral).getValue()
