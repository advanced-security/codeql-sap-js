import javascript
import DataFlow
import advanced_security.javascript.frameworks.xsjs.AsyncXSJS

class XSJSRequestBody extends RemoteFlowSource {
  XSJSRequestBody() {
    exists(SourceNode dollarRequestBody | dollarRequestBody = TypeTrackers::isXSJSRequestBody() |
      this = dollarRequestBody or
      this = dollarRequestBody.getAMethodCall(["asArrayBuffer", "asString", "asWebRequest"])
    )
  }

  override string getSourceType() { result = "Request body of an XSJS application" }
}

module TypeTrackers {
  private SourceNode isXSJSRequestBody(DataFlow::TypeTracker t) {
    t.start() and
    exists(XSJSRequest dollarRequest | result = dollarRequest.getAPropertyRead("body"))
    or
    exists(DataFlow::TypeTracker t2 | result = isXSJSRequestBody(t2).track(t2, t))
  }

  SourceNode isXSJSRequestBody() { result = isXSJSRequestBody(DataFlow::TypeTracker::end()) }
}
