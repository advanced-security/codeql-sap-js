import javascript
import advanced_security.javascript.frameworks.xsjs.AsyncXSJS
import semmle.javascript.security.dataflow.ZipSlipQuery as ZipSlip
import semmle.javascript.security.dataflow.TaintedPathCustomizations::TaintedPath as TaintedPath

/**
 * A node that checks if the path that is being extracted is indeed the prefix of the entry.
 * e.g.
 * ``` javascript
 * if (entryPath.indexOf("SomePrefix") === 0) {
 *   // extract the file with the path.
 * }
 * ```
 */
class ZipEntryPathIndexOfCallEqualsZeroGuard extends DataFlow::Node {
  EqualityTest equalityTest;
  MethodCallNode indexOfCall;
  ForInStmt forLoop;

  ZipEntryPathIndexOfCallEqualsZeroGuard() {
    this = equalityTest.flow() and
    indexOfCall.getMethodName() = "indexOf" and
    indexOfCall.asExpr().getEnclosingStmt().(IfStmt).getParentStmt+() = forLoop and
    indexOfCall = equalityTest.getLeftOperand().flow() and
    equalityTest.getRightOperand().getIntValue() = 0
  }

  predicate blocksExpr(boolean outcome, Expr receiver) {
    exists(DataFlow::Node targetFilePath, DataFlow::Node forLoopVariable |
      receiver = targetFilePath.asExpr() and
      targetFilePath = indexOfCall.getReceiver() and
      forLoopVariable = forLoop.getAnIterationVariable().getAnAccess().flow() and
      TaintedPath::isAdditionalFlowStep(forLoopVariable, _, targetFilePath.getALocalSource(), _) and
      outcome = equalityTest.getPolarity()
    )
  }
}

module XSJSZipSlip implements DataFlow::StateConfigSig {
  class FlowState extends string {
    FlowState() { this in ["$.util.Zip uninitialized", "$.util.Zip initialized"] }
  }

  predicate isSource(DataFlow::Node node, FlowState state) {
    node instanceof RemoteFlowSource and
    state = "$.util.Zip uninitialized"
  }

  predicate isSink(DataFlow::Node node, FlowState state) {
    node instanceof ZipSlip::Sink and
    state = "$.util.Zip initialized"
  }

  predicate isBarrier(DataFlow::Node node, FlowState state) {
    (
      node = DataFlow::MakeBarrierGuard<ZipEntryPathIndexOfCallEqualsZeroGuard>::getABarrierNode()
      or
      node = DataFlow::MakeBarrierGuard<TaintedPath::BarrierGuard>::getABarrierNode()
    ) and
    state = state
  }

  predicate isAdditionalFlowStep(
    DataFlow::Node start, FlowState preState, DataFlow::Node end, FlowState postState
  ) {
    /* 1. `$.util.Zip` initialized */
    start = start and
    preState = "$.util.Zip uninitialized" and
    end instanceof XSJSZipInstance and
    postState = "$.util.Zip initialized"
    or
    /*
     * 2. Jump from a domain of a for-in statement to an access of the iteration variable.
     * e.g.
     * ``` javascript
     * for (var x in y) {
     *   var z = x;
     * }
     * ```
     * This step jumps from `y` to `x` in the body of the for-in loop.
     */

    exists(ForInStmt forLoop |
      start = forLoop.getIterationDomain().flow() and
      end = forLoop.getAnIterationVariable().getAnAccess().flow() and
      preState = postState
    )
    or
    TaintedPath::isAdditionalFlowStep(start, _, end, _) and
    preState = postState
  }
}
