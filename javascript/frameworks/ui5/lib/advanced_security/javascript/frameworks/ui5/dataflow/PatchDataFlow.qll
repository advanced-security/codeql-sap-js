/**
 * This file patches an incompatibility introduced into the standard data flow library between
 * class DataFlow::Configurations and `summmaryModels` added in models-as-data files, and likely
 * introduced in this PR: https://github.com/github/codeql/pull/19445/files.
 */

import javascript
import semmle.javascript.dataflow.internal.FlowSummaryPrivate
private import semmle.javascript.frameworks.data.internal.ApiGraphModels as Shared

/**
 * Holds if `path` is an input or output spec for a summary with the given `base` node.
 */
pragma[nomagic]
private predicate relevantInputOutputPath(API::InvokeNode base, AccessPath inputOrOutput) {
  exists(string type, string input, string output, string path |
    ModelOutput::resolvedSummaryBase(type, path, base) and
    ModelOutput::relevantSummaryModel(type, path, input, output, _, _) and
    inputOrOutput = [input, output]
  )
}

/**
 * Gets the API node for the first `n` tokens of the given input/output path, evaluated relative to `baseNode`.
 */
private API::Node getNodeFromInputOutputPath(API::InvokeNode baseNode, AccessPath path, int n) {
  relevantInputOutputPath(baseNode, path) and
  (
    n = 1 and
    result = Shared::getSuccessorFromInvoke(baseNode, path.getToken(0))
    or
    result =
      Shared::getSuccessorFromNode(getNodeFromInputOutputPath(baseNode, path, n - 1),
        path.getToken(n - 1))
  )
}

/**
 * Gets the API node for the given input/output path, evaluated relative to `baseNode`.
 */
private API::Node getNodeFromInputOutputPath(API::InvokeNode baseNode, AccessPath path) {
  result = getNodeFromInputOutputPath(baseNode, path, path.getNumToken())
}

private predicate summaryStep(API::Node pred, API::Node succ, string kind) {
  exists(string type, string path, API::InvokeNode base, AccessPath input, AccessPath output |
    ModelOutput::relevantSummaryModel(type, path, input, output, kind, _) and
    ModelOutput::resolvedSummaryBase(type, path, base) and
    pred = getNodeFromInputOutputPath(base, input) and
    succ = getNodeFromInputOutputPath(base, output)
  )
}

/**
 * Like `ModelOutput::summaryStep` but with API nodes mapped to data-flow nodes.
 */
private predicate summaryStepNodes(DataFlow::Node pred, DataFlow::Node succ, string kind) {
  exists(API::Node predNode, API::Node succNode |
    summaryStep(predNode, succNode, kind) and
    pred = predNode.asSink() and
    succ = succNode.asSource()
  )
}

/** Data flow steps induced by summary models of kind `value`. */
private class DataFlowStepFromSummary extends DataFlow::SharedFlowStep {
  override predicate step(DataFlow::Node pred, DataFlow::Node succ) {
    summaryStepNodes(pred, succ, "value")
  }
}

/** Taint steps induced by summary models of kind `taint`. */
private class TaintStepFromSummary extends TaintTracking::SharedTaintStep {
  override predicate step(DataFlow::Node pred, DataFlow::Node succ) {
    summaryStepNodes(pred, succ, "taint")
  }
}
