import javascript
import advanced_security.javascript.frameworks.ui5.dataflow.DataFlow
import advanced_security.javascript.frameworks.ui5.UI5LogInjectionQuery

class ClientRequestInjectionVector extends DataFlow::Node {
  ClientRequestInjectionVector() {
    exists(ClientRequest req |
      this = req.getUrl() or
      this = req.getADataNode()
    )
  }
}

class UI5LogEntryFlowState extends string {
  UI5LogEntryFlowState() { this = ["not-logged-not-accessed", "logged-and-accessed"] }
}

module UI5LogEntryToHttp implements DataFlow::StateConfigSig {
  class FlowState = UI5LogEntryFlowState;

  predicate isSource(DataFlow::Node node, FlowState state) {
    node instanceof RemoteFlowSource and
    state = "not-logged-not-accessed"
  }

  predicate isAdditionalFlowStep(
    DataFlow::Node start, FlowState preState, DataFlow::Node end, FlowState postState
  ) {
    UI5LogInjection::isAdditionalFlowStep(start, end) and
    preState = postState
    or
    /*
     * NOTE: This disjunct is a labeled version of LogArgumentToListener in
     * FlowSteps.qll, a DataFlow::SharedFlowStep. As the class is considered
     * legacy on version 2.4.0, we leave the two here (labeled) and there
     * (unlabeled). This is something we should also tidy up when we migrate
     * to the newer APIs.
     */

    inSameWebApp(start.getFile(), end.getFile()) and
    start =
      ModelOutput::getATypeNode("SapLogger")
          .getMember(["debug", "error", "fatal", "info", "trace", "warning"])
          .getACall()
          .getAnArgument() and
    end = ModelOutput::getATypeNode("SapLogEntries").asSource() and
    preState = "not-logged-not-accessed" and
    postState = "logged-and-accessed"
  }

  predicate isSink(DataFlow::Node node, FlowState state) {
    node instanceof ClientRequestInjectionVector and
    state = "logged-and-accessed"
  }
}
