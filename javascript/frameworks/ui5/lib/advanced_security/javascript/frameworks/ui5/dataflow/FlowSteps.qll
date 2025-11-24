import javascript
import advanced_security.javascript.frameworks.ui5.UI5

/**
 * Step from a part of internal model to a relevant control property.
 * e.g.
 * - There is a JSON model with content `{ x: null }`,
 * - There is a user-defined custom control `C` with property `{ y: { type: "string" } }`, and
 * - The two are associated in a control declaration in a view with a binding path `<C y={/x} />`.
 *
 * Then, there is a step from the content `{ x: null }` to `{ y: { type: "string" } }`.
 */
class InternalModelContentToCustomMetadataPropertyStep extends DataFlow::SharedFlowStep {
  override predicate step(DataFlow::Node start, DataFlow::Node end) {
    exists(UI5BindingPath bindingPath |
      bindingPath.getNode() = start and
      end =
        bindingPath
            .getControlDeclaration()
            .getDefinition()
            .getMetadata()
            .getProperty(bindingPath.getPropertyName())
    )
  }
}

/**
 * This is a step in the opposite direction of the `InternalModelContentToCustomMetadataPropertyStep` above.
 * In order to ensure that this indeed holds, we check if the internal model is set to a two-way binding mode.
 */
class CustomMetadataPropertyStepToInternalModelContent extends DataFlow::SharedFlowStep {
  override predicate step(DataFlow::Node start, DataFlow::Node end) {
    exists(UI5BindingPath bindingPath, UI5InternalModel internalModel |
      start =
        bindingPath
            .getControlDeclaration()
            .getDefinition()
            .getMetadata()
            .getProperty(bindingPath.getPropertyName()) and
      bindingPath.getNode() = end and
      /* Get the content of the internal model and check if it's two-way bound. */
      internalModel.(JsonModel).getAProperty() = end and // TODO: Generalize to UI5InternalModel
      internalModel.(JsonModel).isTwoWayBinding() // TODO: Generalize to UI5InternalModel
    )
  }
}

/** External model to a relevant control property */
class ExternalModelToCustomMetadataPropertyStep extends DataFlow::SharedFlowStep {
  override predicate step(DataFlow::Node start, DataFlow::Node end) {
    exists(UI5BindingPath bindingPath |
      bindingPath.getModel() = start and
      end =
        bindingPath
            .getControlDeclaration()
            .getDefinition()
            .getMetadata()
            .getProperty(bindingPath.getPropertyName())
    )
  }
}

/** Control metadata property being the intermediate flow node */
class CustomMetadataPropertyReadStep extends DataFlow::SharedFlowStep {
  override predicate step(DataFlow::Node start, DataFlow::Node end) {
    exists(PropertyMetadata property |
      /* Writing site -> Control property */
      exists(MethodCallNode propertyWrite | propertyWrite = property.getAWrite() |
        propertyWrite.getNumArgument() = 1 and
        start = propertyWrite.getArgument(0)
        or
        propertyWrite.getNumArgument() = 2 and
        start = propertyWrite.getArgument(1)
      ) and
      end = property
      or
      /* Control property -> Reading site */
      start = property and
      end = property.getARead()
    )
  }
}

/**
 * Step from the second argument of `setProperty` method call on a local model or a reference to that model, that is, the receiver.
 * If the contents of the model is statically visible, then get the relevant portion of the content instead.
 *
 * e.g. Given these methods in a same controller,
 *
 * ```javascript
 * onInit: {
 *   var oModel = new JSONModel({ x: null });  // A local model
 *   this.getView().setModel(oModel);
 * }
 *
 * someHandler: {
 *   this.getView().getModel().setProperty("/x", someValue);
 * }
 * ```
 *
 * Create an edge from `someValue` to `this.getView().getModel()`.
 * As the content of `oModel` can be statically determined, also create an edge from `someValue` to `x: null`.
 */
class LocalModelSetPropertyStep extends DataFlow::SharedFlowStep {
  override predicate step(DataFlow::Node start, DataFlow::Node end) {
    /* 1. The receiver is a reference to the local model, jump to the relevant content */
    exists(MethodCallNode setPropertyCall, CustomController controller, ModelReference modelRef |
      start = setPropertyCall.getArgument(1) and
      setPropertyCall.getMethodName() = "setProperty" and
      setPropertyCall.getReceiver().getALocalSource() = modelRef and
      modelRef.asExpr().getEnclosingFunction+() = controller.getAHandler().getFunction() and // apply TC + since `modelRef` can be inside a callback argument
      controller.getAModelReference() = modelRef and
      modelRef.isLocalModelReference() and
      modelRef = end
    )
    or
    /* 2. The receiver is a reference to the local model, jump to the model reference (receiver) itself */
    exists(
      MethodCallNode setPropertyCall, CustomController controller, ModelReference modelRef,
      UI5BindingPath bindingPath
    |
      start = setPropertyCall.getArgument(1) and
      setPropertyCall.getMethodName() = "setProperty" and
      setPropertyCall.getReceiver().getALocalSource() = modelRef and
      modelRef.asExpr().getEnclosingFunction+() = controller.getAHandler().getFunction() and
      controller.getAModelReference() = modelRef and // apply TC + since `modelRef` can be inside a callback argument
      bindingPath.getNode() = modelRef.getResolvedModel().(JsonModel).getAProperty() and
      bindingPath.getPath() =
        setPropertyCall.getArgument(0).getALocalSource().asExpr().(StringLiteral).getValue() and
      end = bindingPath.getNode()
    )
    or
    /* 3. The receiver is the local model itself, jump to the relevant content */
    exists(
      MethodCallNode setPropertyCall, CustomController controller, UI5InternalModel internalModel
    |
      start = setPropertyCall.getArgument(1) and
      setPropertyCall.getMethodName() = "setProperty" and
      setPropertyCall.getReceiver().getALocalSource() = internalModel and
      internalModel.asExpr().getEnclosingFunction+() = controller.getAHandler().getFunction() and // apply TC + since `internalModel` can be inside a callback argument
      internalModel = end
    )
    or
    /* 4. The receiver is the local model, jump to the model reference (receiver) itself */
    exists(
      MethodCallNode setPropertyCall, CustomController controller, UI5InternalModel internalModel,
      UI5BindingPath bindingPath
    |
      start = setPropertyCall.getArgument(1) and
      setPropertyCall.getMethodName() = "setProperty" and
      setPropertyCall.getReceiver().getALocalSource() = internalModel and
      internalModel.asExpr().getEnclosingFunction+() = controller.getAHandler().getFunction() and // apply TC + since `internalModel` can be inside a callback argument
      bindingPath.getNode() = internalModel.(JsonModel).getAProperty() and
      bindingPath.getPath() =
        setPropertyCall.getArgument(0).getALocalSource().asExpr().(StringLiteral).getValue() and
      end = bindingPath.getNode()
    )
  }
}

/**
 * Step from a local model or a reference to it, to a `getProperty` method call on it.
 *
 * e.g Given these methods in a same controller,
 * ```javascript
 * onInit: {
 *   var oModel = new JSONModel({ x: null });  // A local model
 *   this.getView().setModel("someModel", oModel);
 * }
 *
 * someHandler1: {
 *   var value = this.getView().getModel("someModel").getProperty("/x");
 * }
 * ```
 *
 * Establish an edge from `this.getView().getModel("someModel")` in `someHandler2` to
 * the entire `getProperty` call in `someHandler1`.
 * Note that `modelRefFrom` and `modelRefTo` may refer to the same `ModelReference`.
 *
 * This is a dual of `LocalModelSetPropertyStep` above.
 */
class LocalModelGetPropertyStep extends DataFlow::SharedFlowStep {
  override predicate step(DataFlow::Node start, DataFlow::Node end) {
    /* 1. The receiver is a reference to the local model, jump from the relevant content */
    exists(MethodCallNode getPropertyCall, CustomController controller, ModelReference modelRef |
      modelRef = start and
      getPropertyCall.getMethodName() = "getProperty" and
      getPropertyCall.getReceiver().getALocalSource() = modelRef and
      modelRef.asExpr().getEnclosingFunction+() = controller.getAHandler().getFunction() and
      controller.getAModelReference() = modelRef and // apply TC + since `modelRef` can be inside a callback argument
      modelRef.isLocalModelReference() and
      end = getPropertyCall
    )
    or
    /* 2. The receiver is a reference to the local model, jump from the model reference (receiver) itself */
    exists(
      MethodCallNode getPropertyCall, CustomController controller, ModelReference modelRef,
      UI5BindingPath bindingPath
    |
      start = bindingPath.getNode() and
      getPropertyCall.getMethodName() = "getProperty" and
      getPropertyCall.getReceiver().getALocalSource() = modelRef and
      modelRef.asExpr().getEnclosingFunction+() = controller.getAHandler().getFunction() and
      controller.getAModelReference() = modelRef and // apply TC + since `modelRef` can be inside a callback argument
      bindingPath.getNode() = modelRef.getResolvedModel().(JsonModel).getAProperty() and
      bindingPath.getPath() =
        getPropertyCall.getArgument(0).getALocalSource().asExpr().(StringLiteral).getValue() and
      end = getPropertyCall
    )
    or
    /* 3. The receiver is the local model itself, jump from the relevant content */
    exists(
      MethodCallNode getPropertyCall, CustomController controller, UI5InternalModel internalModel
    |
      internalModel = start and
      getPropertyCall.getMethodName() = "getProperty" and
      getPropertyCall.getReceiver().getALocalSource() = internalModel and
      internalModel.asExpr().getEnclosingFunction+() = controller.getAHandler().getFunction() and // apply TC + since `internalModel` can be inside a callback argument
      end = getPropertyCall
    )
    or
    /* 4. The receiver is the local model, jump from the model reference (receiver) itself */
    exists(
      MethodCallNode getPropertyCall, CustomController controller, UI5InternalModel internalModel,
      UI5BindingPath bindingPath
    |
      start = bindingPath.getNode() and
      getPropertyCall.getMethodName() = "getProperty" and
      getPropertyCall.getReceiver().getALocalSource() = internalModel and
      internalModel.asExpr().getEnclosingFunction+() = controller.getAHandler().getFunction() and // apply TC + since `internalModel` can be inside a callback argument
      bindingPath.getNode() = internalModel.(JsonModel).getAProperty() and
      bindingPath.getPath() =
        getPropertyCall.getArgument(0).getALocalSource().asExpr().(StringLiteral).getValue() and
      end = getPropertyCall
    )
  }
}

/**
 * Step from a local model or a reference to it, to a `getProperty` method call on it.
 * This assumes a corresponding `setProperty` call exists on the same model and its same property.
 *
 * e.g. Given these methods in a same controller,
 * ```javascript
 * onInit: {
 *   var oModel = new JSONModel({ x: null });  // A local model
 *   this.getView().setModel("someModel", oModel);
 * }
 *
 * someHandler1: {
 *   var value = this.getView().getModel("someModel").getProperty("/x");
 * }
 *
 * someHandler2: {
 *   this.getView().getModel("someModel").setProperty("/x", someValue);
 * }
 * ```
 *
 * Establish an edge from `this.getView().getModel("someModel")` in `someHandler2` to
 * the entire `getProperty` call in `someHandler1`.
 * Note that `modelRefFrom` and `modelRefTo` may refer to the same `ModelReference`.
 */
/*
 * TODO:
 * 1. Generalize `ModelReference` to `ModelReference` + `UI5InternalModel`.
 */

class LocalModelGetPropertyStepWithSetProperty extends DataFlow::SharedFlowStep {
  override predicate step(DataFlow::Node start, DataFlow::Node end) {
    exists(
      MethodCallNode setPropertyCall, ModelReference modelRefFrom, MethodCallNode getPropertyCall,
      ModelReference modelRefTo
    |
      setPropertyCall.getMethodName() = "setProperty" and
      setPropertyCall.getReceiver().getALocalSource() = modelRefFrom and
      start = modelRefFrom and
      getPropertyCall.getMethodName() = "getProperty" and
      getPropertyCall.getReceiver().getALocalSource() = modelRefTo and
      end = getPropertyCall and
      /*
       * Ensure that getPropertyCall and setPropertyCall are both reading/writing from/to
       * the (1) same property of the (2) same model.
       */

      getPropertyCall.getArgument(0).getALocalSource().asExpr().getStringValue() =
        setPropertyCall.getArgument(0).getALocalSource().asExpr().getStringValue() and
      modelRefFrom.getModelName() = modelRefTo.getModelName()
    )
  }
}

class LocalModelControlMetadataStep extends DataFlow::SharedFlowStep {
  override predicate step(DataFlow::Node start, DataFlow::Node end) {
    exists(
      ModelReference modelRef, BindingPath bindingPath, Binding binding, CustomControl control,
      MethodCallNode setPropertyCall
    |
      setPropertyCall.getMethodName() = "setProperty" and
      setPropertyCall.getReceiver().getALocalSource() = modelRef and
      bindingPath = binding.getBindingPath() and
      bindingPath.asString() =
        modelRef.getModelName() + ">" +
          setPropertyCall.getArgument(0).getALocalSource().asExpr().getStringValue() and
      start = modelRef and
      control.getMetadata().getProperty(binding.getBindingTarget().asXmlAttribute().getName()) = end
    )
  }
}

class SetModelToGetModelStep extends DataFlow::SharedFlowStep {
  override predicate step(DataFlow::Node start, DataFlow::Node end) {
    exists(UI5Model modelDefinition, ModelReference modelReference |
      modelReference.getResolvedModel() = modelDefinition and
      start = modelDefinition and
      end = modelReference
    )
  }
}

class GetModelToGetPropertyStep extends DataFlow::SharedFlowStep {
  override predicate step(DataFlow::Node start, DataFlow::Node end) {
    exists(ModelReference modelReference, MethodCallNode readingMethodCall |
      readingMethodCall = modelReference.getARead() and
      start = modelReference and
      end = readingMethodCall
    )
  }
}

/**
 * A step from any node that flows into the argument of
 * `ResourceBundle.getText` to its return value (which is
 * equivalent to the method call itself modulo the data flow.)
 */
class ResourceBundleGetTextCallArgToReturnValueStep extends DataFlow::SharedFlowStep {
  override predicate step(DataFlow::Node start, DataFlow::Node end) {
    exists(MethodCallNode getTextCall, ResourceModel resourceModel |
      getTextCall.getReceiver().getALocalSource() = resourceModel.getResourceBundle() and
      getTextCall.getMethodName() = "getText" and
      start = getTextCall.getArgument(1) and
      end = getTextCall
    )
  }
}

/**
 * A step from any argument of a SAP logging function to the `onLogEntry`
 * method of a custom log listener in the same application.
 */
predicate logArgumentToListener(DataFlow::Node start, DataFlow::Node end) {
  inSameWebApp(start.getFile(), end.getFile()) and
  start =
    ModelOutput::getATypeNode("SapLogger")
        .getMember(["debug", "error", "fatal", "info", "trace", "warning"])
        .getACall()
        .getAnArgument() and
  end = ModelOutput::getATypeNode("SapLogEntries").asSource()
}

/**
 * A step from any argument of a SAP logging function to the `onLogEntry`
 * method of a custom log listener in the same application.
 */
class LogArgumentToListener extends DataFlow::SharedFlowStep {
  override predicate step(DataFlow::Node start, DataFlow::Node end) {
    logArgumentToListener(start, end)
  }
}

class PublishedEventToEventSubscribedEventData extends DataFlow::SharedFlowStep {
  override predicate step(DataFlow::Node start, DataFlow::Node end) {
    start = ModelOutput::getATypeNode("UI5PublishedEventData").getInducingNode() and
    end = ModelOutput::getATypeNode("UI5EventSubscriptionHandlerDataParameter").getInducingNode()
  }
}
