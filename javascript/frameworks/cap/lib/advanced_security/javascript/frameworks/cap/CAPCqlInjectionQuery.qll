import javascript
import semmle.javascript.security.dataflow.SqlInjectionCustomizations
import advanced_security.javascript.frameworks.cap.CQL
import advanced_security.javascript.frameworks.cap.RemoteFlowSources
import advanced_security.javascript.frameworks.cap.dataflow.FlowSteps

/**
 * A CQL clause parameterized with a string concatentation expression.
 */
class CqlClauseWithStringConcatParameter instanceof CqlClause {
  CqlClauseWithStringConcatParameter() {
    exists(DataFlow::Node queryParameter |
      (
        if this instanceof CqlInsertClause or this instanceof CqlUpsertClause
        then
          queryParameter = this.getArgument().flow() or
          queryParameter = this.getArgument().flow().(SourceNode).getAPropertyWrite().getRhs()
        else queryParameter = this.getArgument().flow()
      ) and
      exists(StringConcatenation::getAnOperand(queryParameter))
    )
  }

  Location getLocation() { result = super.getLocation() }

  string toString() { result = super.toString() }
}

/**
 * A CQL shortcut method call (`read`, `create`, ...) parameterized with a string
 * concatenation expression.
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

class CqlInjectionConfiguration extends TaintTracking::Configuration {
  CqlInjectionConfiguration() { this = "CQL injection from untrusted data" }

  override predicate isSource(DataFlow::Node source) { source instanceof RemoteFlowSource }

  override predicate isSink(DataFlow::Node node) {
    exists(CqlRunMethodCall cqlRunMethodCall |
      node = cqlRunMethodCall.(CqlRunMethodCall).getAQueryParameter()
    )
    or
    exists(CqlShortcutMethodCallWithStringConcat queryRunnerCall |
      node = queryRunnerCall.getStringConcatParameter()
    )
    or
    exists(AwaitExpr await, CqlClauseWithStringConcatParameter cqlClauseWithStringConcat |
      node = await.flow() and
      await.getOperand() = cqlClauseWithStringConcat.(CqlClause).asExpr()
    )
  }

  override predicate isSanitizer(DataFlow::Node node) { node instanceof SqlInjection::Sanitizer }

  override predicate isAdditionalTaintStep(DataFlow::Node start, DataFlow::Node end) {
    /*
     * 1. Given a call to a CQL parser, jump from the argument to the parser call itself.
     */

    exists(CqlClauseParserCall cqlParserCall |
      start = cqlParserCall.(CqlClauseParserCall).getAnArgument() and
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
      start = cqlClause.getArgument().flow() and
      end = cqlClause.flow()
    )
    or
    /*
     * 3. In case of INSERT and UPSERT, jump from an object write to a query parameter to the argument itself.
     * e.g. Given below code:
     *
     * ``` javascript
     * await INSERT.into(Service1Entity).entries({ id: "" + id });
     * ```
     *
     * This step jumps from `id` in the property value expression to the enclosing object `{ id: "" + id }`.
     * This in conjunction with the above step 2 will make the taint tracker jump from `id` to the entire
     * INSERT clause.
     */

    exists(CqlClause cqlClause, PropWrite propWrite |
      (cqlClause instanceof CqlInsertClause or cqlClause instanceof CqlUpsertClause) and
      cqlClause.getArgument().flow() = propWrite.getBase() and
      start = propWrite.getRhs() and
      end = propWrite.getBase()
    )
  }
}
