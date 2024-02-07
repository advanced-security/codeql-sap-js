/**
 * @name Uncontrolled data in logging call
 * @description Building log entries from user-controlled sources is vulnerable to
 *              insertion of forged log entries by a malicious user.
 * @kind path-problem
 * @problem.severity error
 * @security-severity 7.8
 * @precision medium
 * @id js/cap-log-injection
 * @tags security
 */

import javascript
import DataFlow::PathGraph
import semmle.javascript.security.dataflow.LogInjectionQuery
import advanced_security.javascript.frameworks.cap.CDS

/**
 * A source of remote user controlled input.
 */
class CapRemoteSource extends Source, CDS::RequestSource { }

/**
 * An argument to a logging mechanism.
 */
class CapLoggingSink extends Sink, CDS::CdsLogSink { }

from Configuration config, DataFlow::PathNode source, DataFlow::PathNode sink
where config.hasFlowPath(source, sink)
select sink.getNode(), source, sink, "Log entry depends on a $@.", source.getNode(),
  "user-provided value"