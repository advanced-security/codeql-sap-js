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
import advanced_security.javascript.frameworks.cap.CQL
import advanced_security.javascript.frameworks.cap.CAPLogInjectionQuery
import semmle.javascript.frameworks.Logging

EntityReferenceFromEntities entityAccesses(string entityNamespace) {
  entityNamespace = result.getEntitiesCallNamespace()
}

abstract class SensitiveExposureSource extends DataFlow::Node {
  abstract SensitiveAnnotatedElement getCdsElement();

  abstract string getMessage();
}

/** An annotated CDS field reference, such as `Authors.email`. */
class SensitiveExposureFieldSource extends SensitiveExposureSource instanceof PropRead {
  SensitiveAnnotatedAttribute cdlAttribute;
  SensitiveAnnotatedEntity cdlEntity;
  string namespace;

  SensitiveExposureFieldSource() {
    this = entityAccesses(namespace).getAPropertyRead() and
    this.getPropertyName() = cdlAttribute.getName() and
    cdlEntity.(CdlEntity).getAttribute(cdlAttribute.getName()) = cdlAttribute and
    cdlEntity.(NamespacedEntity).getNamespace() = namespace
  }

  override SensitiveAnnotatedAttribute getCdsElement() { result = cdlAttribute }

  override string getMessage() {
    result = "Log entry depends on the $@ field which is annotated as potentially sensitive."
  }
}

/** An awaited sensitive entity result, such as `await SELECT.one.from(Authors)`. */
class SensitiveQueryResultSource extends SensitiveExposureSource {
  SensitiveAnnotatedEntity cdlEntity;

  SensitiveQueryResultSource() {
    exists(CqlSelectClause cqlClause, AwaitExpr await |
      cqlClause.isFinal() and
      cdlEntity = cqlClause.getAccessingEntityDefinition() and
      exists(SensitiveAnnotatedAttribute attribute |
        attribute = cdlEntity.(CdlEntity).getAttribute(attribute.getName())
      ) and
      await.getOperand() = cqlClause.asExpr() and
      this = await.flow()
    )
  }

  override SensitiveAnnotatedEntity getCdsElement() { result = cdlEntity }

  override string getMessage() {
    result =
      "Log entry depends on data from the $@ entity, which contains fields annotated as potentially sensitive."
  }
}

/** A field read from a sensitive result, such as `author.email`. */
class PropertyReadOfSensitiveQueryResult extends DataFlow::Node instanceof PropRead {
  SensitiveQueryResultSource queryResult;

  PropertyReadOfSensitiveQueryResult() {
    this.(DataFlow::PropRead).getBase().getALocalSource() = queryResult
  }

  predicate isSensitive() {
    exists(SensitiveAnnotatedAttribute attribute |
      attribute =
        queryResult
            .getCdsElement()
            .(CdlEntity)
            .getAttribute(this.(DataFlow::PropRead).getPropertyName())
    )
  }
}

module SensitiveLogExposureConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) { source instanceof SensitiveExposureSource }

  predicate isSink(DataFlow::Node sink) {
    sink instanceof CdsLogSink
    or
    exists(LoggerCall log | sink = log.getAMessageComponent())
  }

  predicate isBarrier(DataFlow::Node node) {
    node instanceof PropertyReadOfSensitiveQueryResult and
    not node.(PropertyReadOfSensitiveQueryResult).isSensitive()
  }
}

module SensitiveLogExposureConfigFlow = TaintTracking::Global<SensitiveLogExposureConfig>;

import SensitiveLogExposureConfigFlow::PathGraph

from SensitiveLogExposureConfigFlow::PathNode source, SensitiveLogExposureConfigFlow::PathNode sink
where SensitiveLogExposureConfigFlow::flowPath(source, sink)
select sink, source, sink, source.getNode().(SensitiveExposureSource).getMessage(),
  source.getNode().(SensitiveExposureSource).getCdsElement(),
  source.getNode().(SensitiveExposureSource).getCdsElement().getName()
