import javascript
import DataFlow

module TypeTrackers {
  private SourceNode hasDependency(TypeTracker t, string dependencyPath) {
    t.start() and
    exists(UserModule d |
      d.getADependency() = dependencyPath and
      result = d.getRequiredObject(dependencyPath).asSourceNode()
    )
    or
    exists(TypeTracker t2 | result = hasDependency(t2, dependencyPath).track(t2, t))
  }

  SourceNode hasDependency(string dependencyPath) {
    result = hasDependency(TypeTracker::end(), dependencyPath)
  }

  private MethodCallNode getOwnerComponentRef(TypeTracker t, CustomController customController) {
    customController.getAThisNode() = result.getReceiver() and
    result.getMethodName() = "getOwnerComponent"
    or
    exists(TypeTracker t2 | result = getOwnerComponentRef(t2, customController).track(t2, t))
  }

  /* owner component ref */
  MethodCallNode getOwnerComponentRef(CustomController customController) {
    result = getOwnerComponentRef(TypeTracker::end(), customController)
  }
}

module Test {
  private import semmle.javascript.dataflow.TypeTracking

  private class ObjFieldStep extends SharedTypeTrackingStep {
    override predicate step(DataFlow::Node node1, DataFlow::Node node2) {
      exists(DataFlow::SourceNode object, string name |
        methodStepPred(object, name, node1) and
        methodStepSucc(object, name, node2)
      )
    }
  }

  private DataFlow::SourceNode objectWithMethods() {
    result.flowsTo(any(DataFlow::CallNode call | call.getCalleeName() = "extend").getAnArgument())
  }

  private DataFlow::SourceNode getAnAlias(DataFlow::SourceNode object) {
    object = objectWithMethods() and
    (
      result = object
      or
      result = getAnAlias(object).getAPropertySource().(DataFlow::FunctionNode).getReceiver()
    )
  }

  private predicate methodStepPred(DataFlow::SourceNode object, string name, DataFlow::Node rhs) {
    rhs = getAnAlias(object).getAPropertyWrite(name).getRhs()
  }

  private predicate methodStepSucc(DataFlow::SourceNode object, string name, DataFlow::Node read) {
    read = getAnAlias(object).getAPropertyRead(name)
  }
}
