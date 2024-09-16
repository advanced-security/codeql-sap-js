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

SourceNode entityAccesses(TypeTracker t, string entityNamespace) {
  t.start() and
  exists(EntityEntry e | result = e and entityNamespace = e.getNamespace())
  or
  exists(TypeTracker t2 | result = entityAccesses(t2, entityNamespace).track(t2, t))
}

SourceNode entityAccesses(string entityNamespace) {
  result = entityAccesses(TypeTracker::end(), entityNamespace)
}

class SensitiveExposureFieldSource extends DataFlow::Node {
  SensitiveAnnotatedAttribute cdsField;
  SensitiveAnnotatedEntity entity;
  string namespace;

  SensitiveExposureFieldSource() {
    this = entityAccesses(namespace).getAPropertyRead().getAPropertyRead() and
    //field name is same as some cds declared field
    this.(PropRead).getPropertyName() = cdsField.getName() and
    //entity name is the same as some cds declared entity
    entityAccesses(namespace).getAPropertyRead().toString() = entity.getShortName() and
    //and that field belongs to that entity in the cds
    entity.(CdlEntity).getAttribute(cdsField.getName()) = cdsField and
    //and the namespace is the same (fully qualified id match)
    entity.(NamespacedEntity).getNamespace() = namespace
  }

  SensitiveAnnotatedAttribute getCdsField() { result = cdsField }
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
select sink, source, sink, "Log entry depends on the $@.",
  source.getNode().(SensitiveExposureFieldSource).getCdsField(),
  "potentially sensitive field `" +
    source.getNode().(SensitiveExposureFieldSource).getCdsField().getName() + "`"
