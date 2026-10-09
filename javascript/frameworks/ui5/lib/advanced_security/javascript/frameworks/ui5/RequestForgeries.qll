import advanced_security.javascript.frameworks.ui5.UI5View
private import advanced_security.javascript.frameworks.ui5.dataflow.FlowSteps
import semmle.javascript.security.dataflow.RequestForgeryCustomizations

/**
 * A declarative UI5 control property that makes a client-side request to its bound URL.
 */
class UI5BindingRequestForgerySink extends RequestForgery::Sink {
  UI5BindingRequestForgerySink() {
    exists(UI5View view, UI5BindingPath bindingPath |
      bindingPath = view.getASink("request-forgery") and
      this = bindingPath.getNode()
    )
  }

  override DataFlow::Node getARequest() { result = this }

  override string getKind() { result = "URL" }
}
