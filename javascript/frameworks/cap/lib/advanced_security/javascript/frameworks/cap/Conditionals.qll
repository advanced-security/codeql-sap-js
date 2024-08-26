import javascript

abstract class ConditionalExprOrStatement extends ExprOrStmt {
  abstract Expr getConditionExpr();

  abstract Expr getAThenBranchExpr();

  abstract Expr getAnElseBranchExpr();

  abstract boolean getPolarity();
}

abstract class ConditionalStatement extends ConditionalExprOrStatement, Stmt { }

abstract class ConditionalExpression extends ConditionalExprOrStatement, Expr { }

/* if (cond) { thenBranch } else { elseBranch } */
private class IfConditionalStatement extends ConditionalStatement, IfStmt {
  override Expr getConditionExpr() { result = this.getCondition() }

  override Expr getAThenBranchExpr() {
    result = this.getThen().(ExprStmt).getExpr() or
    result = this.getThen().getAChildStmt().(ExprStmt).getExpr()
  }

  override Expr getAnElseBranchExpr() {
    result = this.getElse().(ExprStmt).getExpr() or
    result = this.getElse().getAChildStmt().(ExprStmt).getExpr()
  }

  override boolean getPolarity() {
    exists(Expr condition | condition = this.getConditionExpr() |
      condition instanceof LogNotExpr and result = false
      or
      condition instanceof EqualityTest and
      result = this.getCondition().(EqualityOperation).getPolarity()
      or
      not (condition instanceof LogNotExpr or condition instanceof EqualityTest) and
      result = true
    )
  }
}

/* cond ? thenBranch : elseBranch */
private class TernaryExpr extends ConditionalExpression, ConditionalExpr {
  override Expr getConditionExpr() { result = this.getCondition() }

  override Expr getAThenBranchExpr() { result = this.getConsequent() }

  override Expr getAnElseBranchExpr() { result = this.getAlternate() }

  override boolean getPolarity() {
    exists(Expr condition | condition = this.getConditionExpr() |
      condition instanceof LogNotExpr and result = false
      or
      condition instanceof EqualityTest and
      result = this.getCondition().(EqualityOperation).getPolarity()
      or
      not (condition instanceof LogNotExpr or condition instanceof EqualityTest) and
      result = true
    )
  }
}

/* cond ? thenBranch : elseBranch */
private class TernaryExprStatement extends ConditionalStatement, ExprStmt {
  TernaryExpr ternaryExpr;

  TernaryExprStatement() { ternaryExpr = this.getExpr() }

  override Expr getConditionExpr() { result = ternaryExpr.getConditionExpr() }

  override Expr getAThenBranchExpr() { result = ternaryExpr.getAThenBranchExpr() }

  override Expr getAnElseBranchExpr() { result = ternaryExpr.getAnElseBranchExpr() }

  override boolean getPolarity() { result = ternaryExpr.getPolarity() }
}

private Expr extractConditionAndThenBranchInner(Expr expr) {
  // result = expr.(VarAccess) or
  // result = expr.(LogicalAndExpr) or
  // result = expr.(LogicalNotExpr) or
  if not expr instanceof LogicalOrExpr
  then result = expr
  else result = extractConditionAndThenBranchInner(expr.(LogicalOrExpr).getLeftOperand())
}

private Expr extractConditionAndThenBranch(Expr expr) {
  result = extractConditionAndThenBranchInner(expr)
}

private class LogicalShortCircuitExpr extends ConditionalExpression, LogicalBinaryExpr {
  /*
   * Things to consider:
   * 1. The rightmost operand to && is the thenBranchExpr.
   * 2. Everything else is a part of the condition.
   * 3. The righthand operand to || is the elseBranchExpr.
   * e.g.1. Given this:
   * ```js
   * cond1 && cond2 && cond3 && thenBranch || elseBranchPart1 || elseBranchPart2
   * ```
   * - condition: cond1 && cond2 && cond3
   * - thenBranchExpr: thenbranch
   * - elseBranchExpr: elseBranchPart1 || elseBranchPart2
   * e.g.2. Given below:
   * ```js
   * cond && (cond1 && thenBranch1 || elseBranch1) || elseBranch
   * ```
   * - condition: cond
   * - thenBranchExpr: (cond1 && thenBranch1 || elseBranch1)
   * - elseBranchExpr: elseBranch
   */

  /*
   * This predicate embodies this tree-walking algorithm:
   * 1. If this is an ||, keep recursing on the lhs until it hits an &&:
   *   - If the lhs is another ||, recurse on the lhs.
   *   - If the lhs is a ParExpr, recurse on the inner expr.
   * 2. Extract the lhs of the lhs.
   */

  override Expr getConditionExpr() {
    exists(Expr condition | condition = extractConditionAndThenBranch(this) |
      if condition instanceof LogicalAndExpr
      then result = condition.(LogicalAndExpr).getLeftOperand()
      else result = condition
    )
  }

  /*
   * This predicate embodies this tree-walking algorithm:
   * 1. If this is an ||, keep recursing on the lhs until it hits an &&:
   *   - If the lhs is another ||, recurse on the lhs.
   *   - If the lhs is a ParExpr, recurse on the inner expr.
   * 2. Extract the rhs of the lhs.
   */

  override Expr getAThenBranchExpr() {
    result = extractConditionAndThenBranch(this).(LogicalAndExpr).getRightOperand()
  }

  /*
   * This predicate embodies this tree-walking algorithm:
   * 1. If this is an ||, keep recursing on the rhs until it hits an &&:
   *   - If the rhs is another ||, recurse on the rhs.
   *   - If the rhs is a ParExpr, recurse on the inner expr.
   * 2. Extract the rhs.
   */

  override Expr getAnElseBranchExpr() { result = this.(LogicalOrExpr).getRightOperand() }

  override boolean getPolarity() {
    if this.getConditionExpr() instanceof LogicalNotExpr then result = false else result = true
  }
}

/*
 * 1. cond && thenBranch || elseBranch;
 * 2. cond && thenBranch;
 * 3. cond || elseBranch;
 */

private class LogicalShortCircuitStatement extends ConditionalStatement, ExprStmt {
  LogicalShortCircuitExpr binaryExpr;

  LogicalShortCircuitStatement() { binaryExpr = this.getExpr() }

  override Expr getConditionExpr() { result = binaryExpr.getConditionExpr() }

  override Expr getAThenBranchExpr() { result = binaryExpr.getAThenBranchExpr() }

  override Expr getAnElseBranchExpr() { result = binaryExpr.getAnElseBranchExpr() }

  override boolean getPolarity() { result = binaryExpr.getPolarity() }
}
