/**
 * @name UI5 jQuery sinks with QL customizations
 * @description Checks that modeled element references integrate with the native jQuery sinks.
 * @kind problem
 * @id js/ui5-customized-jquery-sinks-test
 * @tags security
 *       external/cwe/cwe-079
 */

import advanced_security.javascript_sap_ui5_all.Customizations as UI5Customizations
import javascript
import semmle.javascript.security.dataflow.DomBasedXssQuery

from Sink sink
where sink.getFile().getBaseName() = ["app.controller.js", "required.controller.js"]
select sink, sink.asExpr().(StringLiteral).getValue()
