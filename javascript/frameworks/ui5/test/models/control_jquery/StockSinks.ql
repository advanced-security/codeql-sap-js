/**
 * @name UI5 jQuery sinks from models as data
 * @description Checks HTML sinks without importing the UI5 QL customizations.
 * @kind problem
 * @id js/ui5-stock-jquery-sinks-test
 * @tags security
 *       external/cwe/cwe-079
 */

import javascript
import semmle.javascript.security.dataflow.DomBasedXssQuery

from Sink sink
where sink.getFile().getBaseName() = ["app.controller.js", "required.controller.js"]
select sink, sink.asExpr().(StringLiteral).getValue()
