/**
 * @name Insertion of sensitive information into log files
 * @description Writing heuristically sensitive information to log files can allow that
 *              information to be leaked to an attacker more easily.
 * @kind path-problem
 * @problem.severity warning
 * @security-severity 7.5
 * @precision low
 * @id js/cap-sensitive-log-heurisitic-source
 * @tags security
 *       external/cwe/cwe-532
 */

import javascript
import advanced_security.javascript.frameworks.cap.CDS
import advanced_security.javascript.frameworks.cap.CAPLogInjectionQuery
private import semmle.javascript.security.dataflow.CleartextLoggingCustomizations::CleartextLogging as CleartextLogging

module SensitiveLogExposureConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) { source instanceof CleartextLogging::Source }

  predicate isSink(DataFlow::Node sink) { sink instanceof CdsLogSink }

  predicate isAdditionalFlowStep(DataFlow::Node src, DataFlow::Node trg) {
    CleartextLogging::isAdditionalTaintStep(src, trg)
  }

  predicate isBarrier(DataFlow::Node sink) { sink instanceof CleartextLogging::Barrier }

  /**
   * This predicate is an intentional cartesian product of any sink node and any content that represents a property.
   * Normally Cartesian products are bad but in this case it is what we want, to capture all properties of objects that make their way to sinks.
   */
  predicate allowImplicitRead(DataFlow::Node node, DataFlow::ContentSet contents) {
    // Assume all properties of a logged object are themselves logged.
    contents = DataFlow::ContentSet::anyProperty() and
    isSink(node)
  }
}

module SensitiveLogExposureFlow = TaintTracking::Global<SensitiveLogExposureConfig>;

import SensitiveLogExposureFlow::PathGraph

from SensitiveLogExposureFlow::PathNode source, SensitiveLogExposureFlow::PathNode sink
where SensitiveLogExposureFlow::flowPath(source, sink)
select sink, source, sink, "This logs sensitive data returned by $@ as clear text.",
  source.getNode(), source.getNode().(CleartextLogging::Source).describe()
