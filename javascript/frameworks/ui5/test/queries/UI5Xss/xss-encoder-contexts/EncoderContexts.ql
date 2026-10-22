/**
 * @name UI5 encoder HTML-context regression test
 * @description XML/HTML encoders block HTML injection; encoders for other contexts remain tainted.
 * @kind table
 * @id test/ui5-encoder-html-context
 * @tags test
 */

import advanced_security.javascript_sap_ui5_all.Customizations as UI5Customizations
import javascript
import semmle.javascript.security.dataflow.DomBasedXssQuery

from
  DomBasedXssFlow::PathNode source, DomBasedXssFlow::PathNode sink, DataFlow::CallNode encoder,
  string api
where
  DomBasedXssFlow::flowPath(source, sink) and
  sink.getNode() = encoder and
  encoder.getFile().getBaseName() = "app.controller.js" and
  (
    if encoder.getReceiver().asExpr().(PropAccess).getQualifiedName() = "jQuery.sap"
    then api = "legacy"
    else api = "module"
  )
select api, encoder.getCalleeName()
