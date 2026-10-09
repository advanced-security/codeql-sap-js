/**
 * @name Server-side request forgery with UI5 customizations
 * @description Verifies UI5 client bindings do not create server-side request-forgery results.
 * @kind path-problem
 * @problem.severity error
 * @id js/request-forgery-with-ui5
 * @tags security
 *       external/cwe/cwe-918
 */

import javascript
import advanced_security.javascript_sap_ui5_all.Customizations as UI5Customizations
import semmle.javascript.security.dataflow.RequestForgeryQuery
import RequestForgeryFlow::PathGraph

from RequestForgeryFlow::PathNode source, RequestForgeryFlow::PathNode sink, DataFlow::Node request
where
  RequestForgeryFlow::flowPath(source, sink) and
  request = sink.getNode().(Sink).getARequest()
select request, source, sink, "The $@ of this request depends on a $@.", sink.getNode(),
  sink.getNode().(Sink).getKind(), source, "user-provided value"
