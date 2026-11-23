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

/** Prefers an annotated association over its foreign-key target. */
private SensitiveAnnotatedAttribute getPrivacyPropertyAttribute(CdlEntity entity, string name) {
  result = entity.getAttribute(name)
  or
  exists(CdlAttribute association |
    association = entity.getForeignKeyAssociation(name) and
    if association instanceof SensitiveAnnotatedAttribute
    then result = association
    else result = association.getForeignKeyTarget(name)
  )
}

private SensitiveAnnotatedAttribute getDefaultPrivacyAttribute(CdlEntity entity, string name) {
  result = getPrivacyPropertyAttribute(entity, name) and
  not exists(entity.getAttribute(name).getTargetEntity())
}

/** A query result with statically resolved selected fields. */
private class QueryResult extends DataFlow::SourceNode {
  CqlSelectClause query;
  CdlEntity entity;

  QueryResult() {
    query.isFinal() and
    this = query.getAnAwait().flow() and
    entity = query.getAccessingEntityDefinition()
  }

  /** Holds if the result is the entire entity, with no projection. */
  predicate selectsWholeEntity() { not hasProjection(query) }

  SensitiveAnnotatedAttribute getSensitiveProperty(string propertyPath) {
    this.selectsWholeEntity() and result = getDefaultPrivacyAttribute(entity, propertyPath)
    or
    exists(Expr argument, string outputPath, string cdsPath, CdlEntity owner, string name |
      argument = getAProjectionArgument(query) and
      getAProjectedProperty(argument, outputPath, cdsPath) and
      resolveProjectedPath(entity, cdsPath, owner, name) and
      (
        name != "*" and
        propertyPath = outputPath and
        result = getPrivacyPropertyAttribute(owner, name)
        or
        name = "*" and
        exists(string field |
          result = getDefaultPrivacyAttribute(owner, field) and
          propertyPath = outputPath.substring(0, outputPath.length() - 1) + field and
          not getAProjectedProperty(getAProjectionArgument(query), propertyPath, _)
        )
      )
    )
  }
}

/** Holds if `read` reads an array element, by numeric index, computed index, or `for..of` loop. */
private predicate isElementRead(DataFlow::PropRead read) {
  read.getPropertyName().regexpMatch("^[0-9]+$")
  or
  not exists(read.getPropertyName())
}

/** Holds if the callback of `method` receives an element of its receiver as first parameter. */
private predicate hasElementCallback(string method) {
  method = ["map", "forEach", "find", "findLast", "filter", "some", "every", "flatMap"]
}

/** Holds if `method` returns an element of its receiver, or an array of such elements. */
private predicate returnsElements(string method) {
  method =
    [
      "at", "pop", "shift", "find", "findLast", "filter", "slice", "splice", "sort", "reverse",
      "toSorted", "toReversed", "concat", "flat"
    ]
}

/** Holds if `path` is the result itself, the sensitive `selectedPath`, or a prefix of it. */
private predicate isTrackedPath(QueryResult query, string selectedPath, string path) {
  exists(query.getSensitiveProperty(selectedPath)) and
  path = ["", selectedPath, selectedPath.prefix(selectedPath.indexOf("."))]
}

/**
 * Follows local aliases, array elements, inline callbacks, and selected paths.
 * Helper and named callback parameters are not followed, because they are shared by all callers.
 */
private DataFlow::SourceNode getResultAtPath(QueryResult query, string path) {
  isTrackedPath(query, _, path) and
  (
    path = "" and result = query
    or
    exists(string parentPath, string name |
      path != "" and
      name = getLastSegment(path) and
      (
        not path.matches("%.%") and parentPath = ""
        or
        parentPath = path.regexpCapture("^(.*)\\.[^.]+$", 1)
      ) and
      result = getResultAtPath(query, parentPath).getAPropertyRead(name)
    )
    or
    exists(DataFlow::PropRead read |
      read.getBase().getALocalSource() = getResultAtPath(query, path) and
      isElementRead(read) and
      result = read
    )
    or
    exists(DataFlow::MethodCallNode call |
      call.getReceiver().getALocalSource() = getResultAtPath(query, path) and
      (
        hasElementCallback(call.getMethodName()) and
        result = call.getArgument(0).(DataFlow::FunctionNode).getParameter(0)
        or
        returnsElements(call.getMethodName()) and result = call
      )
    )
  )
}

class SensitiveExposureSource extends DataFlow::Node {
  SensitiveAnnotatedAttribute attribute;
  string flowState;

  SensitiveExposureSource() {
    exists(EntityReferenceFromEntities reference |
      this = reference.getAPropertyRead() and
      attribute =
        getPrivacyPropertyAttribute(reference.getCqlDefinition(),
          this.(DataFlow::PropRead).getPropertyName()) and
      flowState = "field"
    )
    or
    exists(QueryResult query, string selectedPath, string path |
      attribute = query.getSensitiveProperty(selectedPath) and
      isTrackedPath(query, selectedPath, path) and
      (if path = selectedPath then flowState = "field" else flowState = "record") and
      this = getResultAtPath(query, path) and
      (
        this = query
        or
        path != "" and
        this instanceof DataFlow::PropRead and
        not isElementRead(this.(DataFlow::PropRead))
      )
    )
  }

  SensitiveAnnotatedAttribute getCdsField(string state) { result = attribute and state = flowState }
}

module SensitiveLogExposureConfig implements DataFlow::StateConfigSig {
  class FlowState extends string {
    FlowState() { this = ["field", "record"] }
  }

  predicate isSource(DataFlow::Node source, FlowState state) {
    exists(source.(SensitiveExposureSource).getCdsField(state))
  }

  predicate isSink(DataFlow::Node sink, FlowState state) {
    state = ["field", "record"] and
    (
      sink instanceof CdsLogSink
      or
      exists(LoggerCall log | sink = log.getAMessageComponent())
    )
  }

  predicate isBarrierIn(DataFlow::Node node, FlowState state) {
    state = "record" and
    node instanceof DataFlow::PropRead and
    not isElementRead(node.(DataFlow::PropRead))
  }

  predicate allowImplicitRead(DataFlow::Node node, DataFlow::ContentSet contents) {
    isSink(node, _) and contents = DataFlow::ContentSet::anyProperty()
  }
}

module SensitiveLogExposureConfigFlow = TaintTracking::GlobalWithState<SensitiveLogExposureConfig>;

import SensitiveLogExposureConfigFlow::PathGraph

from
  SensitiveLogExposureConfigFlow::PathNode source, SensitiveLogExposureConfigFlow::PathNode sink,
  SensitiveAnnotatedAttribute field
where
  SensitiveLogExposureConfigFlow::flowPath(source, sink) and
  // Link one field deterministically when a record contains several sensitive fields.
  field =
    min(SensitiveAnnotatedAttribute candidate |
      candidate = source.getNode().(SensitiveExposureSource).getCdsField(source.getState())
    |
      candidate order by candidate.getName(), candidate.getLocation().toString()
    )
select sink, source, sink, "Log entry contains data annotated as sensitive from $@.", field,
  field.getName()
