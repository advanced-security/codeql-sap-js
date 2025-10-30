import javascript
import advanced_security.javascript.frameworks.xsjs.AsyncXSJS
import semmle.javascript.security.dataflow.ReflectedXssQuery as ReflectedXssQuery

class XSJSResponseSetBodyCall extends MethodCallNode {
  XSJSResponse response;

  XSJSResponseSetBodyCall() {
    this.getMethodName() = "setBody" and
    this.getReceiver() = response
  }

  XSJSResponse getParentXSJSResponse() { result = response }
}

module Configuration implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node start) {
    ReflectedXssQuery::ReflectedXssConfig::isSource(start) or
    start instanceof RemoteFlowSource
  }

  predicate isSink(DataFlow::Node end) {
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

  predicate isBarrier(DataFlow::Node node) {
    ReflectedXssQuery::ReflectedXssConfig::isBarrier(node)
  }
}
