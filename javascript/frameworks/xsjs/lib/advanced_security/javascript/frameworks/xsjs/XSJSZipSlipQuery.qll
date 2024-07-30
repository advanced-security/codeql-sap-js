import javascript
import advanced_security.javascript.frameworks.xsjs.AsyncXSJS
import advanced_security.javascript.frameworks.xsjs.RemoteFlowSources
import semmle.javascript.security.dataflow.ZipSlipQuery as ZipSlip
import semmle.javascript.security.dataflow.TaintedPathCustomizations::TaintedPath as TaintedPath

/**
 * An instance of `$.util.Zip`, but the argument to the constructor call is reachable from a remote flow source.
 */
class XSJSZipInstanceDependingOnRemoteFlowSource extends XSJSZipInstance {
  RemoteFlowSource remoteArgument;

  XSJSZipInstanceDependingOnRemoteFlowSource() {
    this.getAnArgument().getALocalSource() = remoteArgument
  }

  RemoteFlowSource getRemoteArgument() { result = remoteArgument }
}

class XSJSRemoteFlowSourceToZipInstanceStep extends DataFlow::SharedFlowStep {
  override predicate step(DataFlow::Node pred, DataFlow::Node succ) {
    exists(XSJSZipInstanceDependingOnRemoteFlowSource dollarUtilZip |
      pred = dollarUtilZip.getRemoteArgument() and
      succ = dollarUtilZip
    )
  }
}

class ForInLoopDomainToVariableStep extends DataFlow::SharedFlowStep {
  override predicate step(DataFlow::Node pred, DataFlow::Node succ) {
    exists(ForInStmt forLoop |
      pred = forLoop.getIterationDomain().flow() and
      succ = forLoop.getAnIterationVariable().getAnAccess().flow()
    )
  }
}

/**
 * A node that checks if the path that is being extracted is indeed the prefix of the entry, e.g.
 * ``` javascript
 * if (entryPath.indexOf("SomePrefix") === 0) {
 *   // extract the file with the path.
 * }
 * ```
 */
class ZipEntryPathIndexOfCallEqualsZeroGuard extends TaintTracking::SanitizerGuardNode {
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

  override predicate sanitizes(boolean outcome, Expr receiver) {
    exists(DataFlow::Node targetFilePath, DataFlow::Node forLoopVariable |
      receiver = targetFilePath.asExpr() and
      targetFilePath = indexOfCall.getReceiver() and
      forLoopVariable = forLoop.getAnIterationVariable().getAnAccess().flow() and
      TaintedPath::isAdditionalTaintedPathFlowStep(forLoopVariable,
        targetFilePath.getALocalSource(), _, _) and
      outcome = equalityTest.getPolarity()
    )
  }
}

/**
 * A class wraps `TaintedPath::BarrierGuardNode` by delegating its `sanitizes/0` to the `blocks/0` predicate.
 * The characteristic predicate of this class is deliberately left out.
 */
class TaintedPathSanitizerGuard extends TaintTracking::SanitizerGuardNode {
  TaintedPathSanitizerGuard() { this = this }

  override predicate sanitizes(boolean outcome, Expr receiver) {
    exists(TaintedPath::BarrierGuardNode node | node.blocks(outcome, receiver))
  }
}

class Configuration extends TaintTracking::Configuration {
  Configuration() { this = "XSJS Zip Slip Query" }

  override predicate isSource(DataFlow::Node start) {
    super.isSource(start)
    or
    exists(XSJSZipInstanceDependingOnRemoteFlowSource dollarUtilZip |
      start = dollarUtilZip.getRemoteArgument()
    )
  }

  override predicate isAdditionalTaintStep(DataFlow::Node src, DataFlow::Node dst) {
    TaintedPath::isAdditionalTaintedPathFlowStep(src, dst, _, _)
  }

  override predicate isSink(DataFlow::Node end) {
    super.isSink(end)
    or
    end instanceof ZipSlip::Sink
  }

  override predicate isSanitizerGuard(TaintTracking::SanitizerGuardNode node) {
    node instanceof ZipEntryPathIndexOfCallEqualsZeroGuard or
    node instanceof TaintedPathSanitizerGuard
  }
}
