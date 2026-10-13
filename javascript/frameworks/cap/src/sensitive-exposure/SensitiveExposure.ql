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

/** Gets a clause such as `columns('ID')` from a fluent query. */
private CqlClause getAClause(CqlClause query, string name) {
  (result = query or result = query.getADescendantCqlClause()) and
  result.asDotExpr().getPropertyName() = name
}

/** Gets an item such as `Authors.email as contactEmail` from a column projection. */
bindingset[projection]
private string getAProjectionItem(string projection) {
  result = projection.replaceAll("{", "").replaceAll("}", "").splitAt(",").trim()
}

/** Gets `email` from a projection such as `Authors.email as contactEmail`. */
bindingset[projection]
private string getAProjectedColumn(string projection) {
  exists(string column |
    column = getAProjectionItem(projection).splitAt(" ", 0).trim() and
    result = column.splitAt(".", count(column.indexOf(".")))
  )
}

/** Gets `contactEmail` from `email as contactEmail`. */
bindingset[projection]
private string getAProjectedAlias(string projection) {
  result = getAProjectionItem(projection).splitAt(" as ", 1).trim()
}

private predicate maySelectSensitiveData(CqlSelectClause query, SensitiveAnnotatedEntity entity) {
  not exists(getAClause(query, "columns"))
  or
  exists(CqlClause columns, Expr argument |
    columns = getAClause(query, "columns") and
    argument = columns.getArgument() and
    (
      not exists(argument.getStringValue())
      or
      argument.getStringValue() = "*"
      or
      exists(SensitiveAnnotatedAttribute attribute |
        attribute = entity.(CdlEntity).getAttribute(attribute.getName()) and
        getAProjectedColumn(argument.getStringValue()) = attribute.getName()
      )
    )
  )
}

/** Holds for `await query` and `await cds.run(query)`. */
private predicate awaitsQuery(AwaitExpr await, CqlSelectClause query) {
  query.flow().getALocalSource() = await.getOperand().flow().getALocalSource()
  or
  exists(CqlRunMethodCall run |
    await.getOperand() = run.asExpr() and
    query.flow().getALocalSource() = run.getArgument(0).getALocalSource()
  )
}

/** An awaited sensitive entity result, such as `await SELECT.one.from(Authors)`. */
class SensitiveQueryResultSource extends SensitiveExposureSource {
  SensitiveAnnotatedEntity cdlEntity;
  CqlSelectClause cqlClause;

  SensitiveQueryResultSource() {
    exists(AwaitExpr await |
      cqlClause.isFinal() and
      cdlEntity = cqlClause.getAccessingEntityDefinition() and
      exists(SensitiveAnnotatedAttribute attribute |
        attribute = cdlEntity.(CdlEntity).getAttribute(attribute.getName())
      ) and
      maySelectSensitiveData(cqlClause, cdlEntity) and
      awaitsQuery(await, cqlClause) and
      this = await.flow()
    )
  }

  override SensitiveAnnotatedEntity getCdsElement() { result = cdlEntity }

  override string getMessage() {
    result =
      "Log entry depends on data from the $@ entity, which contains fields annotated as potentially sensitive."
  }

  predicate isSensitiveProperty(string propertyName) {
    exists(SensitiveAnnotatedAttribute attribute |
      attribute = cdlEntity.(CdlEntity).getAttribute(attribute.getName()) and
      (
        propertyName = attribute.getName()
        or
        exists(CqlClause columns, Expr argument |
          columns = getAClause(cqlClause, "columns") and
          argument = columns.getArgument() and
          getAProjectedColumn(argument.getStringValue()) = attribute.getName() and
          propertyName = getAProjectedAlias(argument.getStringValue())
        )
      )
    )
  }
}

/** A field read from a sensitive result, such as `author.email`. */
class PropertyReadOfSensitiveQueryResult extends DataFlow::Node instanceof PropRead {
  SensitiveQueryResultSource queryResult;

  PropertyReadOfSensitiveQueryResult() {
    this.(DataFlow::PropRead).getBase().getALocalSource() = queryResult
  }

  predicate isSensitive() {
    queryResult.isSensitiveProperty(this.(DataFlow::PropRead).getPropertyName())
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
