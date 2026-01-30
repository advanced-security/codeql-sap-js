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
