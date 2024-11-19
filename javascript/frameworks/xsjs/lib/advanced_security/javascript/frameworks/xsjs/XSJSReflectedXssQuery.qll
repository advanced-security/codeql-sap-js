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

SourceNode xssSecure(TypeTracker t) {
  t.start() and
  result = moduleImport("@sap/xss-secure")
  or
  exists(TypeTracker t2 | result = xssSecure(t2).track(t2, t))
}

SourceNode xssSecure() { result = xssSecure(TypeTracker::end()) }

class Configuration extends TaintTracking::Configuration {
  Configuration() { this = "XSJS Reflected XSS Query" }

  override predicate isSource(DataFlow::Node start) {
    super.isSource(start) or
    start instanceof RemoteFlowSource
  }

  override predicate isSink(DataFlow::Node end) {
    super.isSink(end)
    or
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

  override predicate isSanitizer(DataFlow::Node node) {
    super.isSanitizer(node) or
    node instanceof DomBasedXss::Sanitizer or
    node =
      xssSecure()
          .getAMemberInvocation(["encodeCSS", "encodeHTML", "encodeJS", "encodeURL", "encodeXML"])
  }
}
