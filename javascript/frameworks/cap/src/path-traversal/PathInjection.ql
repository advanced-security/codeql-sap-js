/**
 * @name Use of user controlled input in CAP CDS file system utilities
 * @description Using unchecked user controlled values can allow an
 *              attacker to affect paths constructed and accessed in
 *              the filesystem.
 * @kind path-problem
 * @problem.severity warning
 * @security-severity 7.5
 * @precision medium
 * @id js/cap-path-injection
 * @tags security
 *       external/cwe/cwe-020
 *       external/cwe/cwe-022
 */

import javascript
import advanced_security.javascript.frameworks.cap.CAPPathInjectionQuery
import advanced_security.javascript.frameworks.cap.RemoteFlowSources
private import semmle.javascript.security.dataflow.TaintedPathCustomizations
private import semmle.javascript.security.dataflow.TaintedPathQuery as tq

module PathInjectionConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node node) { node instanceof RemoteFlowSource }

  predicate isSink(DataFlow::Node sink) { sink instanceof UtilsSink }

  predicate isAdditionalFlowStep(DataFlow::Node nodein, DataFlow::Node nodeout) {
    exists(PathConverters pc | pc.getPath() = nodein and nodeout = pc)
    or
    exists(PathPredicates pr | pr.getPath() = nodein and nodeout = pr)
  }

  predicate isBarrier(DataFlow::Node node) {
    node instanceof TaintedPath::Sanitizer
    or
    tq::TaintedPathConfig::isBarrier(node)
  }
}

module PathInjectionConfigFlow = TaintTracking::Global<PathInjectionConfig>;

import PathInjectionConfigFlow::PathGraph

from PathInjectionConfigFlow::PathNode source, PathInjectionConfigFlow::PathNode sink
where PathInjectionConfigFlow::flowPath(source, sink)
select sink, source, sink,
  "This CDS utils usage relies on user-provided value and can result in " +
    sink.getNode().(UtilsSink).sinkType() + "."
