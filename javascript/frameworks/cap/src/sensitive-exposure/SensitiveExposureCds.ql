/**
 * @name Insertion of sensitive information into log files
 * @description Writing sensitive information to log files can allow that
 *              information to be leaked to an attacker more easily.
 * @kind path-problem
 * @problem.severity warning
 * @security-severity 7.5
 * @precision medium
 * @id javascript/sensitive-log-cds
 * @tags security
 *       external/cwe/cwe-532
 */

import javascript
import advanced_security.javascript.frameworks.cap.CDS
import advanced_security.javascript.frameworks.cap.CAPLogInjectionQuery
import DataFlow::PathGraph
import CdsTreeSitterXml

class SensitiveExposureSource extends DataFlow::Node {
  SensitiveExposureSource() {
    exists(PropRead p, SensitiveAnnotatedElement c |
      p.getPropertyName() = c.getName() and
      this = p
    )
  }
}

class SensitiveLogExposureConfig extends TaintTracking::Configuration {
  SensitiveLogExposureConfig() { this = "SensitiveLogExposure" }

  override predicate isSource(DataFlow::Node source) { source instanceof SensitiveExposureSource }

  override predicate isSink(DataFlow::Node sink) { sink instanceof CdsLogSink }
}

CdsAnnotateElement getSensitiveAnnotation(PropRead s) {
  result.getAnnotation().getAnnotationPath().getIdentifier().getTextValue() = "PersonalData" and
  result.getIdentifier().getTextValue() = s.getPropertyName()
}

from
  SensitiveLogExposureConfig config, DataFlow::PathNode source, DataFlow::PathNode sink,
  TreeSitterXmlElement annotation
where
  config.hasFlowPath(source, sink) and
  annotation = getSensitiveAnnotation(source.getNode())
select sink, source, sink, "Log entry depends on a $@ piece of information.", annotation,
  "potentially sensitive"
