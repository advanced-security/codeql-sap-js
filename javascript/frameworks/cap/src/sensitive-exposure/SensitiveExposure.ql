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

bindingset[projection]
private string getAProjectionItem(string projection) {
  result = projection.replaceAll("{", "").replaceAll("}", "").splitAt(",").trim()
}

/** Matches `email`, `Authors.email`, and `*`, but not `lower(email)`. */
bindingset[column]
private predicate isSimpleColumnReference(string column) {
  column = "*"
  or
  column.regexpMatch("^[A-Za-z_$][A-Za-z0-9_$]*(\\.[A-Za-z_$][A-Za-z0-9_$]*)*$")
}

bindingset[projection]
private string getAProjectedStringColumn(string projection) {
  exists(string column |
    column = getAProjectionItem(projection).splitAt(" ", 0).trim() and
    isSimpleColumnReference(column) and
    result = column.splitAt(".", count(column.indexOf(".")))
  )
}

bindingset[projection]
private string getAProjectedStringAlias(string projection) {
  result = getAProjectionItem(projection).splitAt(" as ", 1).trim()
}

private DataFlow::ObjectLiteralNode getAProjectionObject(Expr argument) {
  result = argument.flow().(DataFlow::ObjectLiteralNode)
  or
  result = argument.flow().(DataFlow::ArrayLiteralNode).getAnElement().(DataFlow::ObjectLiteralNode)
}

private string getAProjectedColumn(Expr argument) {
  result = getAProjectedStringColumn(argument.getStringValue())
  or
  result =
    getAProjectionObject(argument)
        .getAPropertyWrite("ref")
        .getRhs()
        .(DataFlow::ArrayLiteralNode)
        .getAnElement()
        .getStringValue()
}

private string getAProjectedAlias(Expr argument) {
  result = getAProjectedStringAlias(argument.getStringValue())
  or
  result = getAProjectionObject(argument).getAPropertyWrite("as").getRhs().getStringValue()
}

bindingset[argument]
private predicate isComplexStringProjection(Expr argument) {
  argument.getStringValue().regexpMatch(".*[^A-Za-z0-9_$., *].*")
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
      awaitsQuery(await, cqlClause) and
      this = await.flow()
    )
  }

  override SensitiveAnnotatedEntity getCdsElement() { result = cdlEntity }

  override string getMessage() {
    result =
      "Log entry depends on data from the $@ entity, which contains fields annotated as potentially sensitive."
  }

  private predicate hasProjectedAlias(string propertyName) {
    exists(CqlClause columns, Expr argument |
      columns = getAClause(cqlClause, "columns") and
      argument = columns.getArgument() and
      propertyName = getAProjectedAlias(argument)
    )
  }

  predicate isSensitiveProperty(string propertyName) {
    exists(SensitiveAnnotatedAttribute attribute |
      attribute = cdlEntity.(CdlEntity).getAttribute(attribute.getName()) and
      (
        propertyName = attribute.getName() and
        not hasProjectedAlias(propertyName)
        or
        exists(CqlClause columns, Expr argument |
          columns = getAClause(cqlClause, "columns") and
          argument = columns.getArgument() and
          getAProjectedColumn(argument) = attribute.getName() and
          propertyName = getAProjectedAlias(argument)
        )
      )
    )
  }

  predicate isKnownProperty(string propertyName) {
    exists(cdlEntity.(CdlEntity).getAttribute(propertyName)) and
    not hasProjectedAlias(propertyName)
    or
    exists(CqlClause columns, Expr argument, string source |
      columns = getAClause(cqlClause, "columns") and
      argument = columns.getArgument() and
      not isComplexStringProjection(argument) and
      source = getAProjectedColumn(argument) and
      propertyName = getAProjectedAlias(argument)
    )
  }
}

/** A field read from a sensitive result, such as `author.email`. */
class PropertyReadOfSensitiveQueryResult extends DataFlow::Node instanceof PropRead {
  SensitiveQueryResultSource queryResult;

  PropertyReadOfSensitiveQueryResult() {
    this.(DataFlow::PropRead).getBase().getALocalSource() = queryResult
    or
    exists(PropertyReadOfSensitiveQueryResult baseRead |
      this.(DataFlow::PropRead).getBase().getALocalSource() = baseRead and
      queryResult = baseRead.getQueryResult()
    )
  }

  SensitiveQueryResultSource getQueryResult() { result = queryResult }

  predicate isSensitive() {
    queryResult.isSensitiveProperty(this.(DataFlow::PropRead).getPropertyName())
  }

  predicate isKnown() { queryResult.isKnownProperty(this.(DataFlow::PropRead).getPropertyName()) }
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
    node.(PropertyReadOfSensitiveQueryResult).isKnown() and
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
