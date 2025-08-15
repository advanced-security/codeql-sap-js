import javascript
import advanced_security.javascript.frameworks.xsjs.AsyncXSJS
import semmle.javascript.security.dataflow.ServerSideUrlRedirectQuery as UrlRedirect

module Configuration implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node start) {
    UrlRedirect::ServerSideUrlRedirectConfig::isSource(start)
    or
    start instanceof RemoteFlowSource
  }

  predicate isSink(DataFlow::Node end) {
    exists(XSJSRequestOrResponseHeaders headers |
      end = headers.getHeaderSetCall("location").getArgument(1)
    )
  }
}
