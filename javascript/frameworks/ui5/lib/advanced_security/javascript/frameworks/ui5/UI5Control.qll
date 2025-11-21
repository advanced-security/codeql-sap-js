import advanced_security.javascript.frameworks.ui5.UI5

private newtype TUI5Control =
  TXmlControl(XmlElement control) or
  TJsonControl(JsonObject control) {
    exists(JsonView view | control.getParent() = view.getRoot().getPropValue("content"))
  } or
  TJsControl(NewNode control) {
    exists(JsView view |
      control.asExpr().getParentExpr() =
        view.getRoot()
            .getArgument(1)
            .getALocalSource()
            .(ObjectLiteralNode)
            .getAPropertyWrite("createContent")
            .getRhs()
            .(FunctionNode)
            .getReturnNode()
            .getALocalSource()
            .(ArrayLiteralNode)
            .asExpr()
    )
  }

class UI5Control extends TUI5Control {
  XmlElement asXmlControl() { this = TXmlControl(result) }

  JsonObject asJsonControl() { this = TJsonControl(result) }

  NewNode asJsControl() { this = TJsControl(result) }

  string toString() {
    result = this.asXmlControl().toString()
    or
    result = this.asJsonControl().toString()
    or
    result = this.asJsControl().toString()
  }

  predicate hasLocationInfo(
    string filepath, int startcolumn, int startline, int endcolumn, int endline
  ) {
    this.asXmlControl().hasLocationInfo(filepath, startline, startcolumn, endline, endcolumn)
    or
    /* Since JsonValue does not implement `hasLocationInfo`, we use `getLocation` instead. */
    exists(Location location | location = this.asJsonControl().getLocation() |
      location.getFile().getAbsolutePath() = filepath and
      location.getStartColumn() = startcolumn and
      location.getStartLine() = startline and
      location.getEndColumn() = endcolumn and
      location.getEndLine() = endline
    )
    or
    this.asJsControl().hasLocationInfo(filepath, startcolumn, startline, endcolumn, endline)
  }

  /**
   * Gets the qualified type string, e.g. `sap.m.SearchField`.
   */
  string getQualifiedType() {
    exists(XmlElement control | control = this.asXmlControl() |
      result = control.getNamespace().getUri() + "." + control.getName()
    )
    or
    exists(JsonObject control | control = this.asJsonControl() |
      result = control.getPropStringValue("Type")
    )
    or
    exists(NewNode control | control = this.asJsControl() |
      result = this.asJsControl().asExpr().getAChildExpr().(DotExpr).getQualifiedName()
    )
  }

  File getFile() {
    result = this.asXmlControl().getFile() or
    result = this.asJsonControl().getFile() or
    result = this.asJsControl().getFile()
  }

  /**
   * Gets the `id` property of this control.
   */
  string getId() { result = this.getProperty("id").getValue() }

  /**
   * Gets the qualified type name, e.g. `sap/m/SearchField`.
   */
  string getImportPath() { result = this.getQualifiedType().replaceAll(".", "/") }

  /**
   * Gets the definition of this control if this is a custom one.
   */
  CustomControl getDefinition() {
    result.getName() = this.getQualifiedType() and
    inSameWebApp(this.getFile(), result.getFile())
  }

  /**
   * Gets a reference to this control. Currently supports only such references made through `byId`.
   */
  ControlReference getAReference() {
    result.getMethodName() = "byId" and
    result.getArgument(0).getALocalSource().asExpr().(StringLiteral).getValue() =
      this.getProperty("id").getValue()
  }

  /** Gets a property of this control having the name. */
  UI5ControlProperty getProperty(string propName) {
    result.asXmlControlProperty() = this.asXmlControl().getAttribute(propName)
    or
    result.asJsonControlProperty() = this.asJsonControl().getPropValue(propName)
    or
    result.asJsControlProperty() =
      this.asJsControl()
          .getArgument(0)
          .getALocalSource()
          .asExpr()
          .(ObjectExpr)
          .getPropertyByName(propName)
          .getAChildExpr()
          .flow() and
    not exists(Property property | result.asJsControlProperty() = property.getNameExpr().flow())
  }

  /** Gets a property of this control. */
  UI5ControlProperty getAProperty() { result = this.getProperty(_) }

  bindingset[propName]
  MethodCallNode getARead(string propName) {
    // TODO: in same view
    inSameWebApp(this.getFile(), result.getFile()) and
    result.getMethodName() = "get" + capitalize(propName)
  }

  bindingset[propName]
  MethodCallNode getAWrite(string propName) {
    // TODO: in same view
    inSameWebApp(this.getFile(), result.getFile()) and
    result.getMethodName() = "set" + capitalize(propName)
  }

  /** Holds if this control reads from or writes to a model. */
  predicate accessesModel(UI5Model model) { this.accessesModel(model, _) }

  /** Holds if this control reads from or writes to a model with regards to a binding path. */
  predicate accessesModel(UI5Model model, XmlBindingPath bindingPath) {
    // Verify that the controller's model has the referenced property
    exists(XmlView view |
      // Both this control and the model belong to the same view
      this = view.getControl() and
      model = view.getController().getModel() and
      model.(UI5InternalModel).getPathString() = bindingPath.getPath() and
      bindingPath.getBindingTarget() = this.asXmlControl().getAnAttribute()
    )
  }

  /** Get the view that this control is part of. */
  UI5View getView() { result = this.asXmlControl().getFile() }

  /** Get the controller that manages this control. */
  CustomController getController() { result = this.getView().getController() }

  /**
   * Gets the full import path of the associated control.
   */
  string getControlTypeName() { result = this.getQualifiedType().replaceAll(".", "/") }

  /**
   * Holds if the attribute `sanitizeContent`
   * in controls `sap.ui.core.HTML` and `sap.ui.richttexteditor.RichTextEditor`
   * is set to true and never set to false anywhere
   */
  predicate isSanitizedControl() {
    not this = this.sanitizeContentSetTo(false) and
    (
      this.getControlTypeName() = "sap/ui/richttexteditor/RichTextEditor"
      or
      this.getControlTypeName() = "sap/ui/core/HTML" and
      this = this.sanitizeContentSetTo(true)
    )
  }

  bindingset[val]
  private UI5Control sanitizeContentSetTo(boolean val) {
    // `sanitizeContent` attribute is set declaratively
    result.getProperty("sanitizeContent").toString() = val.toString()
    or
    //or
    // `sanitizeContent` attribute is set programmatically (not sufficient)
    //result
    //    .getAReference()
    //    .hasPropertyWrite("sanitizeContent",
    //      any(DataFlow::Node n | not n.mayHaveBooleanValue(val.booleanNot())))
    // `sanitizeContent` attribute is set programmatically using setProperty()
    exists(CallNode node | node = result.getAReference().getAMemberCall("setProperty") |
      node.getArgument(0).getStringValue() = "sanitizeContent" and
      not node.getArgument(1).mayHaveBooleanValue(val.booleanNot())
    )
  }
}

class SanitizedUI5Control extends UI5Control {
  SanitizedUI5Control() { super.isSanitizedControl() }
}

private newtype TUI5ControlProperty =
  TXmlControlProperty(XmlAttribute property) or
  TJsonControlProperty(JsonValue property) or
  TJsControlProperty(ValueNode property)

class UI5ControlProperty extends TUI5ControlProperty {
  XmlAttribute asXmlControlProperty() { this = TXmlControlProperty(result) }

  JsonValue asJsonControlProperty() { this = TJsonControlProperty(result) }

  ValueNode asJsControlProperty() { this = TJsControlProperty(result) }

  string toString() {
    result = this.asXmlControlProperty().getValue().toString() or
    result = this.asJsonControlProperty().toString() or
    result = this.asJsControlProperty().toString()
  }

  UI5Control getControl() {
    result.asXmlControl() = this.asXmlControlProperty().getElement() or
    result.asJsonControl() = this.asJsonControlProperty().getParent() or
    result.asJsControl().getArgument(0).asExpr() = this.asJsControlProperty().getEnclosingExpr()
  }

  string getName() {
    result = this.asXmlControlProperty().getName()
    or
    exists(JsonValue parent | parent.getPropValue(result) = this.asJsonControlProperty())
    or
    exists(Property property |
      property.getAChildExpr() = this.asJsControlProperty().asExpr() and result = property.getName()
    )
  }

  string getValue() {
    result = this.asXmlControlProperty().getValue() or
    result = this.asJsonControlProperty().getStringValue() or
    result = this.asJsControlProperty().asExpr().(StringLiteral).getValue()
  }
}
