/**
 * @name UI5 XSS sinks from models as data
 * @description Lists standard HTML sinks using the UI5 loader adapter without UI5 security customizations.
 * @kind problem
 * @id js/ui5-stock-xss-sinks-test
 * @tags security
 *       external/cwe/cwe-079
 */

import advanced_security.javascript.frameworks.ui5.UI5ModuleLoader
import javascript
import semmle.javascript.security.dataflow.DomBasedXssQuery

from Sink sink
where sink.getFile().getBaseName() = "app.controller.js"
select sink
