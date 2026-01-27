import javascript
import advanced_security.javascript.frameworks.ui5.UI5

predicate step(DataFlow::Node start, DataFlow::Node end) {
  exists(MethodCallNode getTextCall, ResourceModel resourceModel |
    getTextCall.getReceiver().getALocalSource() = resourceModel.getResourceBundle() and
    getTextCall.getMethodName() = "getText" and
    start = getTextCall.getArgument(1) and
    end = getTextCall
  )
}

from DataFlow::Node start, DataFlow::Node end
where step(start, end)
select start, end
