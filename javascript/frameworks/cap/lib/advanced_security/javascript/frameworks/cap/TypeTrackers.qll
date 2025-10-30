/**
 * Collection of type trackers for interprocedural tracking of values.
 */

import javascript
import advanced_security.javascript.frameworks.cap.CDS

private SourceNode serviceInstanceFromCdsConnectTo(TypeTracker t, string serviceName) {
  t.start() and
  exists(CdsConnectToCall cdsConnectToCall |
    (
      result = cdsConnectToCall
      or
      result.asExpr().(AwaitExpr).getOperand() = cdsConnectToCall.asExpr()
    ) and
    serviceName = cdsConnectToCall.getArgument(0).getStringValue()
  )
  or
  exists(TypeTracker t2 | result = serviceInstanceFromCdsConnectTo(t2, serviceName).track(t2, t))
}

SourceNode serviceInstanceFromCdsConnectTo(string serviceName) {
  result = serviceInstanceFromCdsConnectTo(TypeTracker::end(), serviceName)
}

private SourceNode cdsServeCall(TypeTracker t) {
  exists(CdsServeCall cdsServe | result = cdsServe)
  or
  exists(TypeTracker t2 | result = cdsServeCall(t).track(t2, t))
}

SourceNode cdsServeCall() { result = cdsServeCall(TypeTracker::end()) }

private SourceNode cdsApplicationServiceInstantiation(TypeTracker t) {
  exists(CdsApplicationServiceClass cds | result = cds.getAnInstantiation()) or
  exists(TypeTracker t2 | result = cdsApplicationServiceInstantiation(t).track(t2, t))
}

SourceNode cdsApplicationServiceInstantiation() {
  result = cdsApplicationServiceInstantiation(TypeTracker::end())
}

private SourceNode isHandlerParameter(TypeTracker t, Handler handler) {
  result = handler.getParameter(0) or
  exists(TypeTracker t2 | result = isHandlerParameter(t, handler).track(t2, t))
}

SourceNode isHandlerParameter(Handler handler) {
  result = isHandlerParameter(TypeTracker::end(), handler)
}
