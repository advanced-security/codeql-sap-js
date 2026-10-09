/**
 * @name Client-side request forgery with UI5 customizations
 * @description Tests UI5 control values flowing into client-side request URLs.
 * @kind path-problem
 * @problem.severity error
 * @id js/client-side-request-forgery-with-ui5
 * @tags security
 *       external/cwe/cwe-918
 */

import javascript
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
