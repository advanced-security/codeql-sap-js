/**
 * @name CAP Log injection
 * @description Building log entries from user-controlled sources is vulnerable to
 *              insertion of forged log entries by a malicious user.
 * @kind path-problem
 * @problem.severity error
 * @security-severity 6.1
 * @precision medium
 * @id js/cap-log-injection
 * @tags security
 */

import javascript
import advanced_security.javascript.frameworks.cap.dataflow.DataFlow
import advanced_security.javascript.frameworks.cap.CAPLogInjectionQuery

module CAPLogInjectionConfigurationFlow = TaintTracking::Global<CAPLogInjectionConfiguration>;

import CAPLogInjectionConfigurationFlow::PathGraph

from
  CAPLogInjectionConfigurationFlow::PathNode source, CAPLogInjectionConfigurationFlow::PathNode sink
where CAPLogInjectionConfigurationFlow::flowPath(source, sink)
select sink.getNode(), source, sink, "Log entry depends on a $@.", source.getNode(),
  "user-provided value"
