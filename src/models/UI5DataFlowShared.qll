import javascript
import models.UI5::UI5
import models.UI5View
import models.UI5AMDModule

module UI5Shared {
  /**
   * Additional Flow Step:
   * Binding path in the model <-> control metadata
   */
  private predicate bidiModelControl(DataFlow::Node start, DataFlow::Node end) {
    exists(Project p, DataFlow::SourceNode property, Metadata metadata, UI5BoundNode node |
      // same project
      p.isInThisProject(metadata.getFile()) and
      p.isInThisProject(node.getFile()) and
      (
        // same control
        metadata.getControl().getName() = node.getBindingPath().getControlName()
        or
        // extended control
        exists(Extension subclass |
          metadata.getControl().getDefine().getExtendingDefine() = subclass.getDefine() and
          node.getBindingPath().getControlName() = subclass.getName()
        )
      ) and
      property = metadata.getProperty(node.getBindingPath().getPropertyName()) and
      (
        start = property and end = node
        or
        start = node and end = property
      )
    )
  }

  predicate isAdditionalFlowStep(
    DataFlow::Node start, DataFlow::Node end, DataFlow::FlowLabel inLabel,
    DataFlow::FlowLabel outLabel
  ) {
    inLabel = "taint" and
    outLabel = "taint" and
    (
      bidiModelControl(start, end)
      or
      /* 1. Control metadata property being the intermediate flow node */
      exists(string propName, XmlControl control |
        // writing site -> control metadata
        start = control.getWrite(propName).getArgument(1) and
        (
          /* Custom control */
          end = control.getDefinition().getMetadata().getARead()
          or
          /* Library control */
          not exists(control.getDefinition()) and
          end = control.getRead(propName)
        )
        or
        // control metadata -> reading site
        (
          start = control.getDefinition().getMetadata().getARead()
          or
          /* Library control */
          not exists(control.getDefinition()) and
          start = control.getRead(propName)
        ) and
        end = control.getRead(propName)
      )
      or
      /* 2. Model property being the intermediate flow node */
      // JS object property (corresponding to binding path) -> getProperty('/path')
      exists(GetBoundValue getP |
        start = getP.getBind() and
        end = getP
      )
      or
      // setProperty('/path') -> JS object property (corresponding to binding path)
      exists(SetBoundValue setP |
        start = setP and
        end = setP.getBind()
      )
      // or
      /* 3. Argument to JSONModel constructor being the intermediate flow node */
      // exists(UI5 model, GetBoundValue getP |
      //   start = getP and
      //   model.getPathString() = getP.getArgument(0).asExpr().(StringLiteral).getValue() and
      //   end = model.(JsonModel).getAnArgument() and
      //   end.asExpr() instanceof StringLiteral
      // )
    )
  }

  /**
   * Models dataflow nodes bound to a UI5 View via binding path
   */
  class UI5BoundNode extends DataFlow::Node {
    UI5BindingPath bindingPath;

    UI5BindingPath getBindingPath() { result = bindingPath }

    UI5BoundNode() {
      /* The relevant portion of the content of a JSONModel */
      exists(Property p, JsonModel model, Project project |
        // The property bound to an UI5View source
        this.(DataFlow::PropRef).getPropertyNameExpr() = p.getNameExpr() and
        // The binding path refers to this model
        bindingPath.getAbsolutePath() = model.getPathString(p) and
        project.isInThisProject(this.getFile()) and
        project.isInThisProject(bindingPath.getFile())
      )
      or
      /* The URI string to the JSONModel constructor call */
      exists(JsonModel model, Project project |
        this = model.getArgument(0) and
        this.asExpr() instanceof StringLiteral and
        bindingPath.getAbsolutePath() = model.getPathString() and
        project.isInThisProject(this.getFile()) and
        project.isInThisProject(bindingPath.getFile())
      )
    }
  }

  /**
   * Models calls to `Model.getProperty` and `Model.getObject`
   */
  class GetBoundValue extends DataFlow::CallNode {
    UI5BoundNode bind;

    GetBoundValue() {
      // direct read access to a binding path
      this.getCalleeName() = ["getProperty", "getObject"] and
      bind.getBindingPath().getAbsolutePath() = this.getArgument(0).getStringValue() and
      exists(DataFlow::SourceNode receiverSource, UI5Model model |
        receiverSource = this.getReceiver().getALocalSource()
      |
        model = bind.getBindingPath().getModel() and
        (
          model = receiverSource
          or
          model.getController().getAModelReference() = receiverSource
        )
      )
    }

    UI5BoundNode getBind() { result = bind }
  }

  /**
   * Models calls to `Model.setProperty` and `Model.setObject`
   */
  class SetBoundValue extends DataFlow::Node {
    UI5BoundNode bind;

    SetBoundValue() {
      exists(DataFlow::CallNode setProp |
        // direct access to a binding path
        this = setProp.getArgument(1) and
        setProp.getCalleeName() = ["setProperty", "setObject"] and
        bind.getBindingPath().getAbsolutePath() = setProp.getArgument(0).getStringValue() and
        exists(DataFlow::SourceNode receiverSource, UI5Model model |
          receiverSource = setProp.getReceiver().getALocalSource()
        |
          model = bind.getBindingPath().getModel() and
          (
            model = receiverSource
            or
            model.getController().getAModelReference() = receiverSource
          )
        )
      )
    }

    UI5BoundNode getBind() { result = bind }
  }
}
