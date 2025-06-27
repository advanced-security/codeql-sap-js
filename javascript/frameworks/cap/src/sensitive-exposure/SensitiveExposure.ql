/**
 * @name Insertion of sensitive information into log files
 * @description Writing sensitive information to log files can allow that
 *              information to be leaked to an attacker more easily.
 * @kind path-problem
 * @problem.severity warning
 * @security-severity 7.5
 * @precision medium
 * @id js/cap-sensitive-log
 * @tags security
 *       external/cwe/cwe-532
 */

import javascript
import advanced_security.javascript.frameworks.cap.CDS
import advanced_security.javascript.frameworks.cap.CAPLogInjectionQuery
import DataFlow::PathGraph

EntityReferenceFromEntities entityAccesses(string entityNamespace) {
  entityNamespace = result.getEntitiesCallNamespace()
}

class SensitiveExposureFieldSource instanceof PropRead {
  SensitiveAnnotatedAttribute cdlAttribute;
  SensitiveAnnotatedEntity cdlEntity;
  string namespace;

  SensitiveExposureFieldSource() {
    this = entityAccesses(namespace).getAPropertyRead() and
    //field name is same as some cds declared field
    this.getPropertyName() = cdlAttribute.getName() and
    //and that field belongs to that cdlEntity in the cds
    cdlEntity.(CdlEntity).getAttribute(cdlAttribute.getName()) = cdlAttribute and
    //and the namespace is the same (fully qualified id match)
    cdlEntity.(NamespacedEntity).getNamespace() = namespace
  }

  SensitiveAnnotatedAttribute getCdsField() { result = cdlAttribute }

  string toString() { result = super.toString() }
}

class SensitiveLogExposureConfig extends TaintTracking::Configuration {
  SensitiveLogExposureConfig() { this = "SensitiveLogExposure" }

  override predicate isSource(DataFlow::Node source) {
    source instanceof SensitiveExposureFieldSource
  }

  override predicate isSink(DataFlow::Node sink) { sink instanceof CdsLogSink }
}

from SensitiveLogExposureConfig config, DataFlow::PathNode source, DataFlow::PathNode sink
where config.hasFlowPath(source, sink)
select sink, source, sink,
  "Log entry depends on the $@ field which is annotated as potentially sensitive.",
  source.getNode().(SensitiveExposureFieldSource).getCdsField(),
  source.getNode().(SensitiveExposureFieldSource).getCdsField().getName()
