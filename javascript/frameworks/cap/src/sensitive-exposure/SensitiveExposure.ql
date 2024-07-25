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

class PersonalElement extends TreeSitterXmlElement {
  PersonalElement() {
    this.getName() = "annotate_element" and
    this.getAChild("annotation").getAChild("annotation_path").getAChild("identifier").getTextValue() =
      "PersonalData"
  }

  string getIdentifier() { this.getAChild("identifier").getTextValue() = result }
}

from
  SensitiveLogExposureConfig config, DataFlow::PathNode source, DataFlow::PathNode sink,
  PersonalElement annotation
where
  config.hasFlowPath(source, sink) and
  source.getNode().(PropRead).getPropertyName() = annotation.getIdentifier()
select sink, source, sink, "Log entry depends on a potentially $@.", annotation,
  "sensitive piece of information"
