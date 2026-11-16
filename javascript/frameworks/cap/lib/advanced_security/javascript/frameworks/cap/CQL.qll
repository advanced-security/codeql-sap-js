import javascript
import DataFlow
import advanced_security.javascript.frameworks.cap.CDS

/**
 * Objects from the SQL-like fluent API that forms the basis of constructing
 * a CQL clause.
 */
class CqlQueryBase extends VarRef {
  CqlQueryBase() {
    exists(string name |
      this.getName() = name and
      name in ["SELECT", "INSERT", "DELETE", "UPDATE", "UPSERT"] and
      (
        /* Made available as a global variable */
        exists(GlobalVariable queryBase | this = queryBase.getAReference())
        or
        /* Imported from `cds.ql` */
        exists(CdsFacade cds |
          cds.getMember("ql").getMember(name).getAValueReachableFromSource().asExpr() = this
        )
      )
    )
  }
}

private predicate cqlQueryBaseName(Expr expression, string name) {
  expression = any(CqlQueryBase base) and
  name = expression.(CqlQueryBase).getName()
  or
  name in ["SELECT", "INSERT", "DELETE", "UPDATE", "UPSERT"] and
  exists(CdsFacade cds |
    cds.getMember("ql").getMember(name).getAValueReachableFromSource().asExpr() = expression
  )
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
    exists(string name | cqlQueryBaseName(e, name))
    or
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
  TTaggedTemplate(TaggedTemplateExpr taggedTemplateExpr) {
    exists(string name | cqlQueryBaseName(getRootReceiver(taggedTemplateExpr), name)) or
    exists(CqlQueryBaseCall call | call = getRootReceiver(taggedTemplateExpr))
  } or
  TMethodCall(MethodCallExpr callExpr) {
    exists(string name | cqlQueryBaseName(getRootReceiver(callExpr), name)) or
    exists(CqlQueryBaseCall call | call = getRootReceiver(callExpr))
  } or
  TShortcutCall(CqlQueryBaseCall callExpr)

class CqlClause extends TCqlClause {
  TaggedTemplateExpr asTaggedTemplate() { this = TTaggedTemplate(result) }

  MethodCallExpr asMethodCall() { this = TMethodCall(result) }

  CallExpr asShortcutCall() { this = TShortcutCall(result) }

  predicate isMethodCall() { this = TMethodCall(_) }

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
    cqlQueryBaseName(getRootReceiver(this.asTaggedTemplate()), result) or
    result = getRootReceiver(this.asTaggedTemplate()).(CallExpr).getCalleeName() or
    cqlQueryBaseName(getRootReceiver(this.asMethodCall()), result) or
    result = getRootReceiver(this.asMethodCall()).(CallExpr).getCalleeName()
  }

  Location getLocation() {
    result = this.asTaggedTemplate().getLocation() or
    result = this.asMethodCall().getLocation() or
    result = this.asShortcutCall().getLocation()
  }

  CqlQueryBase getCqlBase() { result = getRootReceiver(this.asMethodCall()) }

  CqlQueryBaseCall getCqlBaseCall() {
    result = getRootReceiver(this.asTaggedTemplate()) or
    result = getRootReceiver(this.asMethodCall())
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
   * 1. TMethodCall.TMethodCall
   *     - example `(SELECT.from(Table),  SELECT.from(Table).where("col1='*'"))`
   * 2. TShortcutCall.TMethodCall
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
   * Gets the final CQL clause that this clause is a part of.
   */
  CqlClause getFinalClause() {
    if this.isFinal()
    then result = this
    else (
      result = this.getAnAncestorCqlClause() and result.isFinal()
    )
  }

  /** Gets an await of this query, either directly or through `cds.run`. */
  AwaitExpr getAnAwait() {
    this.flow().getALocalSource() = result.getOperand().flow().getALocalSource()
    or
    exists(CqlRunMethodCall run |
      result.getOperand() = run.asExpr() and
      this.flow().getALocalSource() = run.getArgument(0).getALocalSource()
    )
  }

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

  /**
   * Gets the reference of the service that runs this CQL clause.
   */
  ServiceInstance getRunner() {
    exists(CdsTransaction tx | this = tx.getAnExecutedCqlClause() and result = tx.getRunner())
    or
    exists(SrvRun srvRun | this = srvRun.getCql() and result = srvRun.getRecipient())
  }

  CdlEntity getAccessingEntityDefinition() {
    /* 1. String literals or template strings */
    result.getName() =
      this.getAccessingEntityReference().(EntityReferenceFromCqlClause).getStringValue()
    or
    result.getUnqualifiedName() =
      this.getAccessingEntityReference().(EntityReferenceFromCqlClause).getStringValue() and
    /* The entity is accessed by its own service. */
    result = this.getRunner().getDefinition().getCdsDeclaration().getAnEntity()
    or
    /* 2. Variable whose value is a reference to an entity */
    result =
      this.getAccessingEntityReference()
          .getALocalSource()
          .(EntityReferenceFromEntities)
          .getCqlDefinition()
  }
}

class CqlSelectClause extends CqlClause {
  CqlSelectClause() { this.isSelect() }

  override CqlSelectClause getEntityAccessingClause() {
    (result = this or result = this.getADescendantCqlClause()) and
    getRootReceiver(result.asExpr()) = getRootReceiver(this.asExpr()) and
    result.asDotExpr().getPropertyName() = "from"
  }
}

/** Gets an explicit projection, including the `SELECT(columns)` shorthand. */
private CqlClause getAColumnsClause(CqlClause query) {
  (result = query or result = query.getADescendantCqlClause()) and
  getRootReceiver(result.asExpr()) = getRootReceiver(query.asExpr()) and
  (
    result.asDotExpr().getPropertyName() = "columns"
    or
    result.asShortcutCall() instanceof CqlSelectBaseCall
    or
    result.asTaggedTemplate().getTag() instanceof CqlSelectBase
    or
    result.asMethodCall().getReceiver() instanceof CqlSelectBase and
    result.asDotExpr().getPropertyName() = ["one", "distinct"]
  )
}

/**
 * Gets the projection of `SELECT.from(entity, key, columns)` or `SELECT.from(entity, columns)`.
 *
 * With a third argument, the second is always a key. Without one, CAP only treats an array or a
 * callback in the second position as columns and any other value as a key.
 */
private Expr getAFromColumnArgument(CqlSelectClause query) {
  exists(MethodCallExpr fromCall | fromCall = query.getEntityAccessingClause().asMethodCall() |
    result = fromCall.getArgument(2)
    or
    not exists(fromCall.getArgument(2)) and
    result = fromCall.getArgument(1) and
    exists(Expr source | source = result.flow().getALocalSource().asExpr() |
      source instanceof ArrayExpr or source instanceof FunctionExpr
    )
  )
}

private Expr getAColumnArgument(CqlSelectClause query) {
  result = getAColumnsClause(query).getArgument()
  or
  result = getAFromColumnArgument(query)
}

/** Holds when the query specifies columns, even if they cannot be resolved statically. */
predicate hasProjection(CqlSelectClause query) {
  exists(getAColumnsClause(query)) or exists(getAColumnArgument(query))
}

/** Gets the expression that defines `expr` when it is a local variable, else `expr` itself. */
private Expr getLocalDefinition(Expr expr) {
  result = expr.flow().getALocalSource().asExpr()
  or
  not exists(expr.flow().getALocalSource().asExpr()) and result = expr
}

/** Gets a projection argument, following local variables and flattening array-form column lists. */
Expr getAProjectionArgument(CqlSelectClause query) {
  exists(Expr definition | definition = getLocalDefinition(getAColumnArgument(query)) |
    result = definition and not definition instanceof ArrayExpr
    or
    result = getLocalDefinition(definition.(ArrayExpr).getAnElement())
  )
}

/** Gets the regular expression for an identifier, such as `email`. */
private string identifier() { result = "[A-Za-z_$][A-Za-z0-9_$]*" }

/** Gets the regular expression for an identifier or a dotted path, such as `author.name`. */
private string path() { result = identifier() + "(\\." + identifier() + ")*" }

/** Gets the regular expression for a column with an alias, capturing expression and alias. */
private string aliasedColumn() { result = "(?i)(.*) as (" + identifier() + ")" }

/** Gets the last segment of a dotted path, such as `name` for `author.name`. */
bindingset[path]
string getLastSegment(string path) { result = path.splitAt(".", count(path.indexOf("."))) }

/** Holds if `position` in `columns` is outside of every single-quoted string literal. */
bindingset[columns, position]
private predicate isOutsideLiteral(string columns, int position) {
  // A quote inside a literal is escaped by doubling it, which keeps the parity correct.
  count(int quote | quote = columns.indexOf("'") and quote < position) % 2 = 0
}

/**
 * Gets the index of a comma in `columns` that is not inside parentheses, braces, or a string
 * literal.
 */
bindingset[columns]
private int getATopLevelComma(string columns) {
  result = columns.indexOf(",") and
  isOutsideLiteral(columns, result) and
  count(int open |
    open = columns.indexOf(["(", "{"]) and open < result and isOutsideLiteral(columns, open)
  ) =
    count(int close |
      close = columns.indexOf([")", "}"]) and close < result and isOutsideLiteral(columns, close)
    )
}

/**
 * Gets a column of a projection string, keeping function arguments and nested blocks intact.
 * A nested block, such as `manager { userId }`, is one column that no result property is derived
 * from, so that its fields are not mistaken for columns of the result.
 */
bindingset[projection]
private string getAProjectionItem(string projection) {
  exists(string columns |
    columns = projection.trim().regexpCapture("(?s)^\\{(.*)\\}$", 1)
    or
    not exists(projection.trim().regexpCapture("(?s)^\\{(.*)\\}$", 1)) and columns = projection
  |
    exists(int start, int end |
      (start = 0 or start = getATopLevelComma(columns) + 1) and
      end = min(int stop | stop = [getATopLevelComma(columns), columns.length()] and stop >= start) and
      result = columns.substring(start, end).trim().regexpReplaceAll("\\s+", " ")
    )
  )
}

/** Gets the alias of a column, such as `lowerEmail` for `lower(email) as lowerEmail`. */
bindingset[item]
private string getAlias(string item) { result = item.regexpCapture(aliasedColumn(), 2) }

/** Gets the expression of a column without its alias, such as `lower(email)`. */
bindingset[item]
private string getExpression(string item) {
  result = item.regexpCapture(aliasedColumn(), 1)
  or
  not exists(getAlias(item)) and result = item
}

/** Gets the result property of a column: its alias, else its last path segment or function name. */
bindingset[item]
private string getStringColumnName(string item) {
  result = getAlias(item)
  or
  not exists(getAlias(item)) and
  (
    item.regexpMatch("\\*|" + path()) and result = getLastSegment(item)
    or
    result = item.regexpCapture("(" + identifier() + ")\\(.*", 1)
  )
}

/** Gets a path that a column reads, skipping literals and function names. */
bindingset[item]
private string getAStringColumnPath(string item) {
  getExpression(item) = "*" and result = "*"
  or
  // Literals and function names are matched too, so that they are not mistaken for columns.
  result = getExpression(item).regexpFind("'[^']*'|" + path() + "\\(?", _, _) and
  result.regexpMatch(path())
}

private DataFlow::Node getAnArrayElement(DataFlow::ObjectLiteralNode object, string property) {
  result = object.getAPropertyWrite(property).getRhs().(DataFlow::ArrayLiteralNode).getAnElement()
}

private string getObjectReferencePath(DataFlow::ObjectLiteralNode projection) {
  exists(DataFlow::ArrayLiteralNode reference |
    reference = projection.getAPropertyWrite("ref").getRhs() and
    exists(reference.getAnElement()) and
    forall(DataFlow::Node element | element = reference.getAnElement() |
      exists(element.getStringValue())
    ) and
    result =
      concat(int index, string part |
        part = reference.getElement(index).getStringValue()
      |
        part, "." order by index
      )
  )
}

/** Gets the path of a column that a CQN expression reads, including nested arguments. */
private string getAnExpressionReferencePath(DataFlow::ObjectLiteralNode expression) {
  result = getObjectReferencePath(expression)
  or
  result = getAnExpressionReferencePath(getAnArrayElement(expression, ["args", "list", "xpr"]))
}

/** Gets the result property of a CQN column: its alias, else its function or last path segment. */
private string getObjectColumnName(DataFlow::ObjectLiteralNode column) {
  result = column.getAPropertyWrite("as").getRhs().getStringValue()
  or
  not exists(column.getAPropertyWrite("as")) and
  (
    result = column.getAPropertyWrite("func").getRhs().getStringValue()
    or
    result = getLastSegment(getObjectReferencePath(column))
  )
}

/**
 * Holds if `argument` is a column of a projection, or an element of an `expand` or `inline` list.
 * Only these strings are parsed as column lists.
 */
private predicate isProjectionColumn(Expr argument) {
  argument = getAProjectionArgument(_)
  or
  argument = getAnArrayElement(_, ["expand", "inline"]).asExpr()
}

/** Relates a result property to its CDS path, including inline and expanded fields. */
predicate getAProjectedProperty(Expr argument, string propertyName, string path) {
  exists(string item |
    isProjectionColumn(argument) and item = getAProjectionItem(argument.getStringValue())
  |
    propertyName = getStringColumnName(item) and path = getAStringColumnPath(item)
  )
  or
  exists(DataFlow::ObjectLiteralNode column | column = argument.flow() |
    not exists(column.getAPropertyWrite(["expand", "inline"])) and
    propertyName = getObjectColumnName(column) and
    path = getAnExpressionReferencePath(column)
    or
    exists(string kind, string childName, string childPath |
      getAProjectedProperty(getAnArrayElement(column, kind).asExpr(), childName, childPath) and
      path = getObjectReferencePath(column) + "." + childPath
    |
      kind = "expand" and propertyName = getObjectColumnName(column) + "." + childName
      or
      kind = "inline" and propertyName = getObjectColumnName(column) + "_" + childName
    )
  )
}

private CdlEntity getProjectedPathEntity(CdlEntity entity, string path) {
  // Bound recursive navigation to suffixes of paths present in projections.
  exists(CqlSelectClause query, string projectedPath |
    getAProjectedProperty(getAProjectionArgument(query), _, projectedPath) and
    (
      path = projectedPath or
      path = projectedPath.substring(projectedPath.indexOf(".") + 1, projectedPath.length())
    )
  ) and
  (
    not path.matches("%.%") and
    result = entity
    or
    exists(string rest |
      rest = path.regexpCapture("^[^.]+\\.(.+)$", 1) and
      result =
        getProjectedPathEntity(entity.getAttribute(path.splitAt(".", 0)).getTargetEntity(), rest)
    )
  )
}

/** Resolves a projected path to its containing entity and final property name. */
predicate resolveProjectedPath(CdlEntity root, string path, CdlEntity entity, string propertyName) {
  entity = getProjectedPathEntity(root, path) and
  propertyName = getLastSegment(path)
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
