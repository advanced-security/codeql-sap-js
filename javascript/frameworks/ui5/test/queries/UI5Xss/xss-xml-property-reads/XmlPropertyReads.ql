/**
 * @name XML model string-read regression test
 * @description Distinguishes string-valued XML property reads from DOM element objects.
 * @kind table
 * @id test/ui5-xml-string-reads
 * @tags test
 */

import advanced_security.javascript_sap_ui5_all.Customizations as UI5Customizations
import javascript
import semmle.javascript.security.dataflow.DomBasedXssQuery

from DomBasedXssFlow::PathNode source, DomBasedXssFlow::PathNode sink, DataFlow::MethodCallNode read
where
  DomBasedXssFlow::flowPath(source, sink) and
  sink.getNode() = read and
  read.getFile().getBaseName() = "app.controller.js" and
  read.getMethodName() = ["getProperty", "getObject"]
select read.getMethodName(), read.getArgument(0).getStringValue()
