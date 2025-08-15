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
}

/**
 * A CQL clause parameterized with a string concatentation expression.
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
 * The CQL injection happens if a fluent API builder (`SELECT`, `INSERT`, ...) or a
 * shortcut method call (`srv.read`, `srv.create`, ...) are called with a string
 * concatentation as one of its argument, which in practice can take one of its
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
