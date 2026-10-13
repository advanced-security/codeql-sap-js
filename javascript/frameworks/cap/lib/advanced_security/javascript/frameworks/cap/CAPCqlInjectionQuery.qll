import javascript
import semmle.javascript.security.dataflow.SqlInjectionCustomizations
import advanced_security.javascript.frameworks.cap.CQL
import advanced_security.javascript.frameworks.cap.RemoteFlowSources
import advanced_security.javascript.frameworks.cap.dataflow.FlowSteps

abstract class CqlInjectionSink extends DataFlow::Node {
  /**
   * Gets the data flow node that represents the query being run, for
   * accurate reporting.
   */
  abstract DataFlow::Node getQuery();

  string getMessage() { result = "This CQL query contains a string concatenation with a $@." }
}

/**
 * A CQL clause parameterized with a string concatenation expression.
 */
class CqlClauseWithStringConcatParameter instanceof CqlClause {
  CqlClauseWithStringConcatParameter() {
    exists(DataFlow::Node queryParameter |
      queryParameter = this.getArgument().flow() and
      exists(StringConcatenation::getAnOperand(queryParameter))
    )
  }

  Location getLocation() { result = super.getLocation() }

  string toString() { result = super.toString() }
}

/** Holds if existing sinks cover the concatenated argument in `await SELECT.from("A" + input)`. */
private predicate hasExistingStringConcatSink(DataFlow::Node queryParameter) {
  exists(CqlClause cqlClause |
    queryParameter = cqlClause.getArgument().flow() and
    exists(StringConcatenation::getAnOperand(queryParameter)) and
    (
      exists(AwaitExpr await | await.getOperand() = cqlClause.getFinalClause().asExpr())
      or
      exists(CqlRunMethodCall run |
        run.getArgument(0).getALocalSource() = cqlClause.getFinalClause().flow()
      )
    )
  )
}

private predicate isSimpleObjectClause(DataFlow::Node queryParameter) {
  exists(MethodCallExpr call, DataFlow::ObjectLiteralNode object |
    queryParameter = call.getAnArgument().flow() and
    call.getMethodName() = ["having", "set", "where", "with"] and
    queryParameter.getALocalSource() = object and
    not exists(object.getAComputedPropertyName()) and
    not exists(object.getASpreadProperty()) and
    not exists(DataFlow::PropWrite write |
      write = object.getAPropertyWrite() and
      write.getRhs().getALocalSource() instanceof DataFlow::ObjectLiteralNode
    )
  )
}

private DataFlow::Node getModeledCqlQuery(DataFlow::Node queryParameter) {
  exists(CqlClause cqlClause |
    queryParameter = cqlClause.getArgument().flow() and
    result = cqlClause.getFinalClause().flow()
  )
  or
  exists(CallExpr call |
    not exists(CqlClause cqlClause | queryParameter = cqlClause.getArgument().flow()) and
    queryParameter = call.getAnArgument().flow() and
    result = call.flow()
  )
}

/** A modeled structural argument, such as `SELECT.from(entity).orderBy(ordering)`. */
class ModeledCqlStructureParameter extends CqlInjectionSink {
  DataFlow::Node query;

  ModeledCqlStructureParameter() {
    this = ModelOutput::getASinkNode("cap-cql-structure").asSink() and
    query = getModeledCqlQuery(this) and
    not isSimpleObjectClause(this) and
    not hasExistingStringConcatSink(this)
  }

  override DataFlow::Node getQuery() { result = query }

  override string getMessage() {
    result =
      "This CQL query uses a $@ as query structure, which may allow injection of identifiers or expressions."
  }
}

/**
 * An await expression that has as its operand a CQL clause that includes a
 * string concatenation operation.
 */
class AwaitCqlClauseWithStringConcatParameter extends CqlInjectionSink {
  DataFlow::Node queryParameter;
  DataFlow::Node query;
  CqlClauseWithStringConcatParameter cqlClauseWithStringConcat;
  CqlClause finalAncestorCqlClauseOfCqlClauseWithStringConcat;

  AwaitCqlClauseWithStringConcatParameter() {
    exists(AwaitExpr await |
      this = await.flow() and
      await.getOperand() = finalAncestorCqlClauseOfCqlClauseWithStringConcat.asExpr() and
      finalAncestorCqlClauseOfCqlClauseWithStringConcat =
        cqlClauseWithStringConcat.(CqlClause).getFinalClause()
    )
  }

  override DataFlow::Node getQuery() {
    result = finalAncestorCqlClauseOfCqlClauseWithStringConcat.flow()
  }
}

/**
 * The first argument passed to the call to `cds.run`, `cds.db.run`, or `srv.run`
 * whose value is a CQL query object that includes a string concatenation. e.g.
 * ``` javascript
 * // 1. CQN object constructed from Fluent API
 * const query = SELECT.from`Entity1`.where("ID=" + id);
 * cds.run(query);
 *
 * // 2. CQN object parsed from a string
 * const query = cds.parse.cql("SELECT * from Entity1 where ID =" + id);
 * cds.run(query);
 *
 * // 3. An unparsed CQL string (only valid in old versions of CAP)
 * const query = "SELECT * from Entity1 where ID =" + id;
 * Service2.run(query);
 * ```
 * The `getQuery/0` member predicate gets the `query` argument of the above calls
 * to `run`.
 */
class StringConcatParameterOfCqlRunMethodQueryArgument extends CqlInjectionSink {
  CqlRunMethodCall cqlRunMethodCall;

  StringConcatParameterOfCqlRunMethodQueryArgument() {
    this = cqlRunMethodCall.getAQueryParameter()
  }

  override DataFlow::Node getQuery() { result = this }
}

/**
 * A CQL shortcut method call (`read`, `create`, ...) parameterized with a string
 * concatenation expression. e.g.
 * ``` javascript
 * cds.read("Entity1").where(`ID=${id}`); // Notice the surrounding parentheses!
 * cds.update("Entity1").set("col1 = col1" + amount).where("col1 = " + id);
 * cds.delete("Entity1").where("ID =" + id);
 * ```
 */
class CqlShortcutMethodCallWithStringConcat instanceof CqlShortcutMethodCall {
  DataFlow::Node stringConcatParameter;

  CqlShortcutMethodCallWithStringConcat() {
    stringConcatParameter = super.getAQueryParameter() and
    exists(StringConcatenation::getAnOperand(stringConcatParameter))
  }

  Location getLocation() { result = super.getLocation() }

  string toString() { result = super.toString() }

  DataFlow::Node getStringConcatParameter() { result = stringConcatParameter }
}

/**
 * A string concatenation expression included in a CQL shortcut method call. e.g.
 * ``` javascript
 * cds.read("Entity1").where(`ID=${id}`); // Notice the surrounding parentheses!
 * cds.update("Entity1").set("col1 = col1" + amount).where("col1 = " + id);
 * cds.delete("Entity1").where("ID =" + id);
 * ```
 * This class captures the string concatenation expressions appearing above:
 * 1. `ID=${id}`
 * 2. `"col1 = col1" + amount`
 * 3. `"col1 = " + id`
 * 4. `"ID =" + id`
 */
class StringConcatParameterOfCqlShortcutMethodCall extends CqlInjectionSink {
  CqlShortcutMethodCallWithStringConcat cqlShortcutMethodCallWithStringConcat;

  StringConcatParameterOfCqlShortcutMethodCall() {
    this = cqlShortcutMethodCallWithStringConcat.getStringConcatParameter()
  }

  override DataFlow::Node getQuery() {
    result =
      cqlShortcutMethodCallWithStringConcat.(CqlShortcutMethodCall).getFinalChainedMethodCall()
  }
}

/**
 * A CQL parser call (`cds.ql`, `cds.parse.cql`, ...) parameterized with a string
 * conatenation expression.
 */
class CqlClauseParserCallWithStringConcat instanceof CqlClauseParserCall {
  CqlClauseParserCallWithStringConcat() {
    not this.getCdlString().(StringOps::Concatenation).asExpr() instanceof TemplateLiteral and
    exists(StringConcatenation::getAnOperand(this.getCdlString()))
  }

  Location getLocation() { result = super.getLocation() }

  string toString() { result = super.toString() }
}

/**
 * A data flow configuration from a remote flow source to a handful of sinks that run a CQL
 * query, either directly or indirectly by assembling one under the hood.
 *
 * CQL injection can happen when a caller-controlled value is passed to a modeled
 * structural clause such as `columns`, `groupBy`, or `orderBy`.
 *
 * It can also happen if a fluent API builder (`SELECT`, `INSERT`, ...) or a
 * shortcut method call (`srv.read`, `srv.create`, ...) is called with a string
 * concatenation as one of its arguments, which in practice can take one of the
 * following forms:
 *
 * 1. Concatentation with a string value with the `+` operator:
 *    - Concatenation with a string: `"ID=" + expr`
 *    - Concatenation with a template literal: `` `ID=` + expr ``
 * 2. Template literal that interpolates an expression in it but is not a tagged
 * template literal: `` SELECT.from`Entity`.where(`ID=${expr}`) ``
 *
 * The second case should be distinguished from the ones that have tagged template literals
 * for all of its builder calls: if the example were `` SELECT.from`Entity`.where`ID=${expr}` ``
 * instead (notice the lack of parentheses around the template literal), then the `where` call
 * becomes a parser call of the template literal following it and thus acts as a sanitizer.
 */
module CqlInjectionConfiguration implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node node) { node instanceof RemoteFlowSource }

  predicate isSink(DataFlow::Node node) { node instanceof CqlInjectionSink }

  predicate isBarrier(DataFlow::Node node) { node instanceof SqlInjection::Sanitizer }

  predicate isAdditionalFlowStep(DataFlow::Node start, DataFlow::Node end) {
    /*
     * 1. Given a call to a CQL parser, jump from the argument to the parser call itself.
     */

    exists(CqlClauseParserCall cqlParserCall |
      start = cqlParserCall.getAnArgument() and
      end = cqlParserCall
    )
    or
    /*
     * 2. Jump from a query parameter to the CQL query clause itself. e.g. Given below code:
     *
     * ``` javascript
     * await SELECT.from(Service1Entity).where("ID=" + id);
     * ```
     *
     * This step jumps from `id` in the call to `where` to the entire SELECT clause.
     */

    exists(CqlClause cqlClause |
      start = cqlClause.getArgument().flow().getAPredecessor*().(StringOps::Concatenation) and
      end = cqlClause.getFinalClause().flow()
    )
  }
}
