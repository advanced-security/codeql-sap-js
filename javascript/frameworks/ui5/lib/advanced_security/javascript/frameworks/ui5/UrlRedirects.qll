import advanced_security.javascript.frameworks.ui5.UI5View
private import advanced_security.javascript.frameworks.ui5.dataflow.FlowSteps
import semmle.javascript.security.dataflow.ClientSideUrlRedirectCustomizations

/**
 * A declarative UI5 control property that interprets its bound value as a client-side URL.
 */
class UI5BindingUrlRedirectSink extends ClientSideUrlRedirect::Sink {
  UI5BindingUrlRedirectSink() {
    exists(UI5View view, UI5BindingPath bindingPath |
      bindingPath = view.getASink("url-redirection") and
      this = bindingPath.getNode()
    )
  }
}
