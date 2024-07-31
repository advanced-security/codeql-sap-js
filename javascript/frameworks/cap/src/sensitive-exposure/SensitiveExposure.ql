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

class TreeSitterXmlElement extends XmlElement {
  TreeSitterXmlElement() { this.getFile().getName().matches("%.ts.xml") }

  string getURL() {
    result =
      "file://" + this.getFile().getName().splitAt(".ts.xml") + ":" +
        (this.getAttributeValue("srow").toInt() + 1) + ":" +
        (this.getAttributeValue("scol").toInt() + 1) + ":" +
        (this.getAttributeValue("erow").toInt() + 1) + ":" + this.getAttributeValue("ecol").toInt()
  }
}

TreeSitterXmlElement sensitiveAnnotation(SensitiveExposureSource s) {
  result.hasName("annotate_element") and
  exists(TreeSitterXmlElement name |
    name = result.getAChild() and
    name.hasName("identifier") and
    name.getTextValue() = s.(PropRead).getPropertyName()
  )
}

from
  SensitiveLogExposureConfig config, DataFlow::PathNode source, DataFlow::PathNode sink,
  TreeSitterXmlElement annotation
where
  config.hasFlowPath(source, sink) and
  annotation = sensitiveAnnotation(source.getNode())
select sink, source, sink, "Log entry depends on a $@ piece of information.", annotation,
  "sensitive"
