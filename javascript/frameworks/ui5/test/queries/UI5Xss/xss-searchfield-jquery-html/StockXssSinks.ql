/**
 * Lists the standard `js/xss` sinks contributed by models as data, with only the UI5
 * loader adapter to resolve dependency paths and no UI5 security customizations.
 */

import advanced_security.javascript.frameworks.ui5.UI5ModuleLoader
import javascript
import semmle.javascript.security.dataflow.DomBasedXssQuery

from Sink sink
where sink.getFile().getBaseName() = "app.controller.js"
select sink
