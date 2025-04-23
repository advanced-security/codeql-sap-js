/**
 * @name UI5 Log injection in outbound network request
 * @description Building log entries from user-controlled sources is vulnerable to
 *              insertion of forged log entries by a malicious user.
 * @kind path-problem
 * @problem.severity warning
 * @security-severity 6.5
 * @precision medium
 * @id js/ui5-log-injection-to-http
 * @tags security
 *       external/cwe/cwe-117
 */

import javascript
import advanced_security.javascript.frameworks.ui5.dataflow.DataFlow
import advanced_security.javascript.frameworks.ui5.dataflow.DataFlow::UI5PathGraph
import semmle.javascript.security.dataflow.LogInjectionQuery as LogInjection

class UI5LogInjectionConfiguration extends LogInjection::LogInjectionConfiguration {
  override predicate isSource(DataFlow::Node node) { node instanceof RemoteFlowSource }

  override predicate isSink(DataFlow::Node node) {
    exists(ClientRequest req |
      node = req.getUrl() or
      node = req.getADataNode()
    )
  }
}

class UI5Logger extends RequiredObject {
  UI5Logger() { this.getDependency() = "sap/base/Log" }

  DataFlow::Node getALogListener() {
    exists(MethodCallNode addLogListenerCall |
      addLogListenerCall.getCalleeName() = "addLogListener" and
      result = addLogListenerCall.getArgument(0)
    )
  }

  MethodCallNode getLogEntriesCall() {
    result.getReceiver().getALocalSource() = this.asSourceNode() and
    result.getMethodName() = "getLogEntries"
  }
}

private predicate test(MethodCallNode call, Node receiver, SourceNode receiverSource) {
  call.getMethodName() = "getLogEntries" and
  receiver = call.getReceiver() and
  receiverSource = receiver.getALocalSource()
}

SourceNode isLogListener(TypeBackTracker t) {
  t.start() and
  exists(UI5Logger log | result = log.getALogListener())
  or
  exists(DataFlow::TypeBackTracker t2 | result = isLogListener(t2).backtrack(t2, t))
}

SourceNode isLogListener() { result = isLogListener(TypeBackTracker::end()) }

class LogListener extends DataFlow::Node {
  LogListener() { this = isLogListener() }

  FunctionNode getOnLogEntryMethod() {
    exists(DataFlow::PropWrite propWrite | propWrite.getPropertyName() = "onLogEntry" |
      result = propWrite.getRhs()
    )
  }
}

from
  UI5LogInjectionConfiguration cfg, UI5PathNode source, UI5PathNode sink, UI5PathNode primarySource
where
  cfg.hasFlowPath(source.getPathNode(), sink.getPathNode()) and
  primarySource = source.getAPrimarySource()
select sink, primarySource, sink, "Outbound network request depends on $@ log data.", primarySource,
  "user-provided"
