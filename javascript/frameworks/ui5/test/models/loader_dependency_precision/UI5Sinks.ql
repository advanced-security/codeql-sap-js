/**
 * @name UI5 loader dependency precision with QL customizations
 * @description Unrelated loader dependencies must not be treated as UI5 controls or elements.
 * @kind table
 * @id test/ui5-customized-loader-dependency-precision
 * @tags test
 */

import advanced_security.javascript_sap_ui5_all.Customizations as UI5Customizations
import javascript
import semmle.javascript.security.dataflow.DomBasedXssQuery

from Sink sink
where sink.getFile().getBaseName() = "app.controller.js"
select sink, sink.asExpr().(StringLiteral).getValue()
