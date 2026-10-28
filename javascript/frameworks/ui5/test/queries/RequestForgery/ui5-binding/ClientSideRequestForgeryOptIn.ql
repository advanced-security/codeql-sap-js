/**
 * @name Client-side request forgery with opt-in UI5 bindings
 * @description Reports UI5 browser inputs flowing to declarative request URLs.
 * @kind path-problem
 * @problem.severity error
 * @id js/client-side-request-forgery-with-ui5-bindings
 * @tags security
 *       external/cwe/cwe-918
 */

import javascript
import advanced_security.javascript.frameworks.ui5.RequestForgeries
import advanced_security.javascript_sap_ui5_all.Customizations as UI5Customizations
import semmle.javascript.security.dataflow.ClientSideRequestForgeryQuery
import ClientSideRequestForgeryFlow::PathGraph

from
  ClientSideRequestForgeryFlow::PathNode source, ClientSideRequestForgeryFlow::PathNode sink,
  DataFlow::Node request
where
  ClientSideRequestForgeryFlow::flowPath(source, sink) and
  request = sink.getNode().(Sink).getARequest()
select request, source, sink, "The $@ of this request depends on a $@.", sink.getNode(),
  sink.getNode().(Sink).getKind(), source, "user-provided value"
