import javascript
import UI5DataFlow

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

  private class ObjFieldStep extends SharedTypeTrackingStep {
    override predicate step(DataFlow::Node start, DataFlow::Node end) {
      exists(SapExtendCall sapExtendCall, ObjectLiteralNode wrappedObject, string name |
        wrappedObject = sapExtendCall.getContent() and
        start = getAnAlias(wrappedObject).getAPropertyWrite(name).getRhs() and
        end = getAnAlias(wrappedObject).getAPropertyRead(name)
      )
    }
  }

  private DataFlow::SourceNode getAnAlias(DataFlow::SourceNode object) {
    result = object
    or
    result = getAnAlias(object).getAPropertySource().(DataFlow::FunctionNode).getReceiver()
  }
}
