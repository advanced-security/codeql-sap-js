import javascript
import DataFlow
import advanced_security.javascript.frameworks.cap.CDS

/**
 * Objects from the SQL-like fluent API
 * this is the set of clauses that acts as the base of a statement
 */
class CqlQueryBase extends VarRef {
  CqlQueryBase() {
    exists(string name |
      this.getName() = name and
      name in ["SELECT", "INSERT", "DELETE", "UPDATE", "UPSERT"] and
      // Made available as a global variable
      exists(GlobalVariable queryBase | this = queryBase.getAReference())
      or
      // Imported from `cds.ql` */
      exists(CdsFacade cds |
        cds.getMember("ql").getMember(name).getAValueReachableFromSource().asExpr() = this
      )
    )
  }
}

class CqlSelectBase extends CqlQueryBase {
  CqlSelectBase() { this.getName() = "SELECT" }
}

class CqlInsertBase extends CqlQueryBase {
  CqlInsertBase() { this.getName() = "INSERT" }
}

class CqlDeleteBase extends CqlQueryBase {
  CqlDeleteBase() { this.getName() = "DELETE" }
}

class CqlUpdateBase extends CqlQueryBase {
  CqlUpdateBase() { this.getName() = "UPDATE" }
}

class CqlUpsertBase extends CqlQueryBase {
  CqlUpsertBase() { this.getName() = "UPSERT" }
}

/**
 * The cds-ql docs do not mention DELETE being a function acting as a shortcut to any underlying clause
 */
abstract class CqlQueryBaseCall extends CallExpr {
  // TODO: Express "It's a global function or a local function imported from cds.ql"
}

class CqlSelectBaseCall extends CqlQueryBaseCall {
  CqlSelectBaseCall() { this.getCalleeName() = "SELECT" }
}

class CqlInsertBaseCall extends CqlQueryBaseCall {
  CqlInsertBaseCall() { this.getCalleeName() = "INSERT" }
}

class CqlUpdateBaseCall extends CqlQueryBaseCall {
  CqlUpdateBaseCall() { this.getCalleeName() = "UPDATE" }
}

class CqlUpsertBaseCall extends CqlQueryBaseCall {
  CqlUpsertBaseCall() { this.getCalleeName() = "UPSERT" }
}

/**
 * Obtains the receiver across a variety of types of accesses
 */
Expr getRootReceiver(Expr e) {
  result = e and
  (
    e instanceof VarRef
    or
    e instanceof CallExpr and not exists(e.(CallExpr).getReceiver())
  )
  or
  result = getRootReceiver(e.(DotExpr).getBase())
  or
  result = getRootReceiver(e.(MethodCallExpr).getReceiver())
  or
  result = getRootReceiver(e.(PropAccess).getBase())
  or
  result = getRootReceiver(e.(TaggedTemplateExpr).getTag())
}

/**
 * An aggregation type for the two ways to access the fluent API
 * provided by the module cds.ql
 */
private newtype TCqlClause =
  MethodCall(MethodCallExpr callExpr) {
    exists(CqlQueryBase base | base = getRootReceiver(callExpr)) or
    exists(CqlQueryBaseCall call | call = getRootReceiver(callExpr))
  } or
  ShortcutCall(CqlQueryBaseCall callExpr)

class CqlClause extends TCqlClause {
  Expr asExpr() {
    result = this.asMethodCall()
    or
    result = this.asShortcutCall()
  }

  Expr getArgument() {
    result = this.asMethodCall().getAnArgument()
    or
    result = this.asShortcutCall().getAnArgument()
  }

  string getClauseName() {
    result = this.asMethodCall().getMethodName()
    or
    this.asShortcutCall().getCalleeName() = "SELECT" and
    result = "columns"
    or
    this.asShortcutCall().getCalleeName() in ["INSERT", "UPSERT"] and
    result = "entries"
    or
    this.asShortcutCall().getCalleeName() = "UPDATE" and
    result = "entity"
  }

  MethodCallExpr asMethodCall() { this = MethodCall(result) }

  CallExpr asShortcutCall() { this = ShortcutCall(result) }

  /**
   * Convert this `CqlClause` into a `DotExpr`, i.e.
   * `Get SELECT.from'Table' when given SELECT.from'Table'.wherecond`,
   */
  DotExpr asDotExpr() { result = this.asMethodCall().getCallee().(DotExpr) }

  string toString() {
    result = this.asMethodCall().toString() or
    result = this.asShortcutCall().toString()
  }

  Location getLocation() {
    result = this.asMethodCall().getLocation() or
    result = this.asShortcutCall().getLocation()
  }

  CqlQueryBase getCqlBase() { result = getRootReceiver(this.asMethodCall()) }

  CqlQueryBaseCall getCqlBaseCall() {
    result = getRootReceiver(this.asMethodCall()).(CqlQueryBaseCall)
  }

  /** Describes a parent expression relation */
  Expr getParentExpr() {
    result = this.asMethodCall().getParentExpr() or
    result = this.asShortcutCall().getParentExpr()
  }

  /**
   * Possible cases for constructing a chain of clauses:
   *
   * (looking at the terminal clause and its possible parent types as tuples: (this, parent))
   * 1) MethodCall.MethodCall
   *     - example `(SELECT.from(Table),  SELECT.from(Table).where("col1='*'"))`
   * 2) ShortcutCall.MethodCall
   *     - example `(SELECT("col1, col2"), SELECT("col1, col2").from("Table"))`
   *
   * ShortcutCalls cannot be added to any clause chain other than the first position
   * example - `SELECT("col1, col2").INSERT(col2)` is not valid
   */
  CqlClause getCqlParentExpr() {
    result.asMethodCall() = this.asMethodCall().getParentExpr().getParentExpr()
    or
    result.asMethodCall() = this.asShortcutCall().getParentExpr().getParentExpr()
  }

  Expr getAnAncestorExpr() {
    result = this.asMethodCall().getParentExpr+() or
    result = this.asShortcutCall().getParentExpr+()
  }

  CqlClause getAnAncestorCqlClause() {
    result.asMethodCall() = this.getAnAncestorExpr() or
    result.asShortcutCall() = this.getAnAncestorExpr()
  }

  /** Describes a child expression relation */
  Expr getAChildExpr() {
    result = this.asMethodCall().getAChildExpr() or
    result = this.asShortcutCall().getAChildExpr()
  }

  /**
   * the same chain order logic as `getCqlParentExpr` but reversed
   */
  CqlClause getAChildCqlClause() {
    result.asMethodCall() = this.asMethodCall().getAChildExpr().getAChildExpr() or
    result.asShortcutCall() = this.asMethodCall().getAChildExpr().getAChildExpr()
  }

  Expr getADescendantExpr() {
    result = this.asMethodCall().getAChildExpr+() or
    result = this.asShortcutCall().getAChildExpr+()
  }

  CqlClause getADescendantCqlClause() {
    result.asMethodCall() = this.getADescendantExpr() or
    result.asShortcutCall() = this.getADescendantExpr()
  }

  /**
   * Matches the given `CqlClause` to its method/property name, nested at arbitrary depth.
   */
  string getAnAPIName() {
    result = this.asDotExpr().getPropertyName() or
    result = this.getADescendantCqlClause().getAnAPIName()
  }
}

/**
 * A possibly tainted clause
 * any clause with a string concatenation in it
 * regardless of where that operand came from
 */
class TaintedClause extends CqlClause {
  TaintedClause() { exists(StringConcatenation::getAnOperand(this.getArgument().flow())) }
}

/**
 * Call to`cds.db.run`
 * or
 * an await surrounding a sql statement
 */
class CQLSink extends DataFlow::Node {
  CQLSink() {
    this = any(CdsFacade cds).getMember("db").getMember("run").getACall().getAnArgument()
    or
    exists(AwaitExpr a, CqlClause clause |
      a.getAChildExpr() = clause.asExpr() and this.asExpr() = clause.asExpr()
    )
  }
}

/**
 * a more heurisitic based taint step
 * captures one of the alternative ways to construct query strings:
 * `cds.parse.cql(`string`+userInput)`
 * and considers them tainted if they've been concatenated against
 * in any manner
 */
class ParseCQLTaintedClause extends CallNode {
  ParseCQLTaintedClause() {
    this = any(CdsFacade cds).getMember("parse").getMember("cql").getACall() and
    exists(DataFlow::Node n |
      n = StringConcatenation::getAnOperand(this.getAnArgument()) and
      //omit the fact that the arg of cds.parse.cql (`SELECT * from Foo`)
      //is technically a string concat
      not n.asExpr() instanceof TemplateElement
    )
  }
}
