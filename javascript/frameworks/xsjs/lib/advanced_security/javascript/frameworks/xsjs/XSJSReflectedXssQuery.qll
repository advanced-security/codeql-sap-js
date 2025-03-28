import javascript
import advanced_security.javascript.frameworks.xsjs.AsyncXSJS
import semmle.javascript.security.dataflow.DomBasedXssQuery as DomBasedXss

class XSJSResponseSetBodyCall extends MethodCallNode {
  XSJSResponse response;

  XSJSResponseSetBodyCall() {
    this.getMethodName() = "setBody" and
    this.getReceiver() = response
  }

  XSJSResponse getParentXSJSResponse() { result = response }
}

class Configuration extends TaintTracking::Configuration {
  Configuration() { this = "XSJS Reflected XSS Query" }

  override predicate isSource(DataFlow::Node start) {
    exists(DomBasedXss::Configuration domBasedXssConfiguration |
      domBasedXssConfiguration.isSource(start)
    ) or
    start instanceof RemoteFlowSource
  }

  override predicate isSink(DataFlow::Node end) {
    exists(XSJSResponseSetBodyCall setBody, XSJSResponse thisOrAnotherXSJSResponse |
      thisOrAnotherXSJSResponse = setBody.getParentXSJSResponse() or
      thisOrAnotherXSJSResponse = setBody.getParentXSJSResponse().getAPredOrSuccResponse()
    |
      end = setBody.getArgument(0) and
      (
        thisOrAnotherXSJSResponse.isScriptableContentType() or
        thisOrAnotherXSJSResponse.contentTypeIsDependentOnRemote()
      )
    )
  }
}
