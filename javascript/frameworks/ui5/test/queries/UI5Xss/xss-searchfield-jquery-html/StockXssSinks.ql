/**
 * Lists the standard `js/xss` sinks found WITHOUT importing the UI5 QL customizations,
 * i.e. the sinks contributed by the models-as-data rows in `ui5.model.yml` alone.
 */

import javascript
import semmle.javascript.security.dataflow.DomBasedXssQuery

from Sink sink
where sink.getFile().getBaseName() = "app.controller.js"
select sink
