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
      /* Made available as a global variable */
      exists(GlobalVariable queryBase | this = queryBase.getAReference())
      or
      /* Imported from `cds.ql` */
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

abstract class CqlQueryBaseCall extends CallExpr {
  // TODO: Express "It's a global function or a local function imported from cds.ql"
}

class CqlSelectBaseCall extends CqlQueryBaseCall {
  CqlSelectBaseCall() { this.getCalleeName() = "SELECT" }
}

class CqlInsertBaseCall extends CqlQueryBaseCall {
  CqlInsertBaseCall() { this.getCalleeName() = "INSERT" }
}

/* The cds-ql docs do not mention DELETE being a function acting as a shortcut to any underlying clause. */
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
  TaggedTemplate(TaggedTemplateExpr taggedTemplateExpr) {
    exists(CqlQueryBase base | base = getRootReceiver(taggedTemplateExpr)) or
    exists(CqlQueryBaseCall call | call = getRootReceiver(taggedTemplateExpr))
  } or
  MethodCall(MethodCallExpr callExpr) {
    exists(CqlQueryBase base | base = getRootReceiver(callExpr)) or
    exists(CqlQueryBaseCall call | call = getRootReceiver(callExpr))
  } or
  ShortcutCall(CqlQueryBaseCall callExpr)

class CqlClause extends TCqlClause {
  TaggedTemplateExpr asTaggedTemplate() { this = TaggedTemplate(result) }

  MethodCallExpr asMethodCall() { this = MethodCall(result) }

  CallExpr asShortcutCall() { this = ShortcutCall(result) }

  Node flow() { result = this.asExpr().flow() }

  Expr asExpr() {
    result = this.asTaggedTemplate()
    or
    result = this.asMethodCall()
    or
    result = this.asShortcutCall()
  }

  predicate isSelect() {
    /*this.isFinal() and*/
    this.getTypeString() = "SELECT"
  }

  predicate isInsert() { /*this.isFinal() and*/ this.getTypeString() = "INSERT" }

  predicate isUpdate() { /*this.isFinal() and*/ this.getTypeString() = "UPDATE" }

  predicate isUpsert() { /*this.isFinal() and*/ this.getTypeString() = "UPSERT" }

  predicate isDelete() { /*this.isFinal() and*/ this.getTypeString() = "DELETE" }

  predicate isRead() { this.isSelect() }

  predicate isWrite() { this.isInsert() or this.isUpdate() or this.isUpsert() or this.isDelete() }

  Expr getArgument() {
    result = this.asTaggedTemplate().getTemplate() or
    result = this.asMethodCall().getAnArgument() or
    result = this.asShortcutCall().getAnArgument()
  }

  /**
   * Convert this `CqlClause` into a `DotExpr`, i.e.
   * get `` SELECT.from`Table`.where `` when given `` SELECT.from`Table`.where`cond` ``.
   */
  DotExpr asDotExpr() {
    result = this.asTaggedTemplate().getTag() or
    result = this.asMethodCall().getCallee()
  }

  string toString() {
    result = this.asTaggedTemplate().toString() or
    result = this.asMethodCall().toString() or
    result = this.asShortcutCall().toString()
  }

  string getTypeString() {
    result = getRootReceiver(this.asTaggedTemplate()).(VarRef).getName() or
    result = getRootReceiver(this.asTaggedTemplate()).(CallExpr).getCalleeName() or
    result = getRootReceiver(this.asMethodCall()).(VarRef).getName() or
    result = getRootReceiver(this.asMethodCall()).(CallExpr).getCalleeName()
  }

  Location getLocation() {
    result = this.asTaggedTemplate().getLocation() or
    result = this.asMethodCall().getLocation() or
    result = this.asShortcutCall().getLocation()
  }

  CqlQueryBase getCqlBase() { result = getRootReceiver(this.asMethodCall()) }

  CqlQueryBaseCall getCqlBaseCall() {
    result = getRootReceiver(this.asTaggedTemplate()).(CqlQueryBaseCall) or
    result = getRootReceiver(this.asMethodCall()).(CqlQueryBaseCall)
  }

  /** Describes a parent expression relation */
  Expr getParentExpr() {
    result = this.asTaggedTemplate().getParentExpr() or
    result = this.asMethodCall().getParentExpr() or
    result = this.asShortcutCall().getParentExpr()
  }

  /**
   * Possible cases for constructing a chain of clauses:
   *
   * (looking at the terminal clause and its possible parent types as tuples: (this, parent))
   * 1. MethodCall.MethodCall
   *     - example `(SELECT.from(Table),  SELECT.from(Table).where("col1='*'"))`
   * 2. ShortcutCall.MethodCall
   *     - example `(SELECT("col1, col2"), SELECT("col1, col2").from("Table"))`
   *
   * Note that ShortcutCalls cannot be added to any clause chain other than the first position, e.g.
   * ``` javascript
   * SELECT("col1, col2").INSERT(col2)  // Invalid!
   * ```
   */
  CqlClause getParentCqlClause() {
    /* ========== The parent is a shortcut call ========== */
    result.asShortcutCall() = this.asTaggedTemplate().getParentExpr().getParentExpr() or
    result.asShortcutCall() = this.asMethodCall().getParentExpr().getParentExpr() or
    result.asShortcutCall() = this.asShortcutCall().getParentExpr().getParentExpr() or
    /* ========== The parent is a tagged template ========== */
    result.asTaggedTemplate() = this.asTaggedTemplate().getParentExpr().getParentExpr() or
    result.asTaggedTemplate() = this.asMethodCall().getParentExpr().getParentExpr() or
    result.asTaggedTemplate() = this.asShortcutCall().getParentExpr().getParentExpr() or
    /* ========== The parent is a method call ========== */
    result.asMethodCall() = this.asTaggedTemplate().getParentExpr().getParentExpr() or
    result.asMethodCall() = this.asMethodCall().getParentExpr().getParentExpr() or
    result.asMethodCall() = this.asShortcutCall().getParentExpr().getParentExpr()
  }

  Expr getAnAncestorExpr() {
    result = this.asTaggedTemplate().getParentExpr+() or
    result = this.asMethodCall().getParentExpr+() or
    result = this.asShortcutCall().getParentExpr+()
  }

  CqlClause getAnAncestorCqlClause() {
    result.asTaggedTemplate() = this.getAnAncestorExpr() or
    result.asMethodCall() = this.getAnAncestorExpr() or
    result.asShortcutCall() = this.getAnAncestorExpr()
  }

  /** Describes a child expression relation */
  Expr getAChildExpr() {
    result = this.asTaggedTemplate().getAChildExpr() or
    result = this.asMethodCall().getAChildExpr() or
    result = this.asShortcutCall().getAChildExpr()
  }

  /**
   * the same chain order logic as `getParentCqlClause` but reversed
   */
  CqlClause getAChildCqlClause() {
    /* ========== The parent is a shortcut call ========== */
    result.asShortcutCall() = this.asTaggedTemplate().getAChildExpr().getAChildExpr() or
    result.asShortcutCall() = this.asMethodCall().getAChildExpr().getAChildExpr() or
    result.asShortcutCall() = this.asShortcutCall().getAChildExpr().getAChildExpr() or
    /* ========== The parent is a tagged template ========== */
    result.asTaggedTemplate() = this.asTaggedTemplate().getAChildExpr().getAChildExpr() or
    result.asTaggedTemplate() = this.asMethodCall().getAChildExpr().getAChildExpr() or
    result.asTaggedTemplate() = this.asShortcutCall().getAChildExpr().getAChildExpr() or
    /* ========== The parent is a method call ========== */
    result.asMethodCall() = this.asTaggedTemplate().getAChildExpr().getAChildExpr() or
    result.asMethodCall() = this.asMethodCall().getAChildExpr().getAChildExpr() or
    result.asMethodCall() = this.asShortcutCall().getAChildExpr().getAChildExpr()
  }

  Expr getADescendantExpr() {
    result = this.asTaggedTemplate().getAChildExpr+() or
    result = this.asMethodCall().getAChildExpr+() or
    result = this.asShortcutCall().getAChildExpr+()
  }

  CqlClause getADescendantCqlClause() {
    result.asTaggedTemplate() = this.getADescendantExpr() or
    result.asMethodCall() = this.getADescendantExpr() or
    result.asShortcutCall() = this.getADescendantExpr()
  }

  predicate isFinal() { not exists(this.getParentCqlClause()) }

  /**
   * Matches the given `CqlClause` to its method/property name, nested at arbitrary depth.
   */
  string getAnAPIName() {
    result = this.asDotExpr().getPropertyName() or
    result = this.getADescendantCqlClause().getAnAPIName()
  }

  abstract CqlClause getEntityAccessingClause();

  /**
   * Gets the reference to the entity that this clause is accessing.
   */
  ExprNode getAccessingEntityReference() {
    result = this.getEntityAccessingClause().getArgument().flow()
  }

  CdlEntity getAccessingEntityDefinition() {
    /* 1. String literals or template strings */
    result.getName() =
      this.getAccessingEntityReference().(EntityReferenceFromCqlClause).getStringValue()
    or
    /* 2. Variable whose value is a reference to an entity */
    exists(ExprNode entityReference | entityReference = this.getAccessingEntityReference() |
      result = entityReference.getALocalSource().(EntityReferenceFromEntities).getCqlDefinition()
    )
  }
}

class CqlSelectClause extends CqlClause {
  CqlSelectClause() { this.isSelect() }

  override CqlSelectClause getEntityAccessingClause() {
    result = this.getADescendantCqlClause() and
    result.asDotExpr().getPropertyName() = "from"
  }
}

class CqlInsertClause extends CqlClause {
  CqlInsertClause() { this.isInsert() }

  override CqlInsertClause getEntityAccessingClause() {
    result = this.getADescendantCqlClause() and
    result.asDotExpr().getPropertyName() = "into"
  }
}

class CqlUpdateClause extends CqlClause {
  CqlUpdateClause() { this.isUpdate() }

  override CqlUpdateClause getEntityAccessingClause() {
    result = this.getADescendantCqlClause() and
    (
      result.asDotExpr().getPropertyName() = "entity" or
      exists(result.asShortcutCall())
    )
  }
}

class CqlUpsertClause extends CqlClause {
  CqlUpsertClause() { this.isUpsert() }

  override CqlUpsertClause getEntityAccessingClause() {
    result = this.getADescendantCqlClause() and
    result.asDotExpr().getPropertyName() = "into"
  }
}

class CqlDeleteClause extends CqlClause {
  CqlDeleteClause() { this.isDelete() }

  override CqlDeleteClause getEntityAccessingClause() {
    result = this.getADescendantCqlClause() and
    result.asDotExpr().getPropertyName() = "from"
  }
}

/**
 * A possibly tainted clause
 * any clause with a string concatenation in it
 * regardless of where that operand came from
 */
class TaintedClause instanceof CqlClause {
  TaintedClause() { exists(StringConcatenation::getAnOperand(this.getArgument().flow())) }

  string toString() { result = super.toString() }

  Expr getArgument() { result = super.getArgument() }

  Expr asExpr() { result = super.asExpr() }
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
