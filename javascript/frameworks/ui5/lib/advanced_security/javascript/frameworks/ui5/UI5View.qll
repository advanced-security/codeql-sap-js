import javascript
import DataFlow
import advanced_security.javascript.frameworks.ui5.UI5
import advanced_security.javascript.frameworks.ui5.dataflow.DataFlow
private import semmle.javascript.frameworks.data.internal.ApiGraphModelsExtensions as ApiGraphModelsExtensions
import advanced_security.javascript.frameworks.ui5.Bindings

/**
 * Gets the immediate supertype of a given type from the extensible predicate `typeModel` provided by
 * Model-as-Data Extension to the CodeQL runtime. If no type is defined as a supertype of a given one,
 * then this predicate is reflexive. e.g.
 * If there is a row such as below in the extension file:
 * ```yaml
 * ["sap/m/InputBase", "sap/m/Input", ""]
 * ```
 * Then it gets `"sap/m/InputBase"` when given `"sap/m/Input"`. However, if no such row is present, then
 * this predicate simply binds `result` to the given `"sap/m/Input"`.
 *
 * This predicate is good for modeling the object-oriented class hierarchy in UI5.
 */
bindingset[type]
string getASuperType(string type) {
  result = type or ApiGraphModelsExtensions::typeModel(result, type, "")
}

/**
 * A [binding path](https://sapui5.hana.ondemand.com/sdk/#/topic/2888af49635949eca14fa326d04833b9) that refers
 * to a piece of data in a model, whether it is internal (client-side) or external (server-side). It is found in a file which defines a view declaratively, using either XML,
 * HTML, JSON or JavaScript, and is a property of an XML/HTML element or a JSON/JavaScript object.
 *
 * Since these data cannot be recognized as `DataFlow::Node`s (with an exception of JS objects), a `UI5BindingPath`
 * is always represented by a `UI5BoundNode` to which this `UI5BindingPath` refers to.
 */
abstract class UI5BindingPath extends BindingPath {
  /**
   * Gets the string value of this path, without the surrounding curly braces.
   */
  abstract string getPath();

  /**
   * Gets the string value of this path with the surrounding curly braces.
   */
  abstract string getLiteralRepr();

  /**
   * Resolve this path to an absolute one. It gets itself for an already absolute path.
   */
  abstract string getAbsolutePath();

  /**
   * Gets the name of the associated control.
   */
  abstract string getPropertyName();

  /**
   * Gets the fully qualified type of the associated control.
   */
  abstract string getControlQualifiedType();

  /**
   * Gets the full import path of the associated control.
   */
  string getControlTypeName() { result = this.getControlQualifiedType().replaceAll(".", "/") }

  /**
   * Gets the view that this binding path resides in.
   */
  UI5View getView() {
    /* 1. Declarative, inside a certain data format. */
    this.getLocation().getFile() = result
    or
    /* 2. Procedural, inside a body of a controller handler. */
    exists(CustomController controller |
      controller.getFile() = this.getLocation().getFile() and
      controller.getView() = result
    )
  }

  /**
   * Gets the UI5Control using this UI5BindingPath.
   */
  abstract UI5Control getControlDeclaration();

  /**
   * Gets the model, attached to either a control or a view, that this binding path refers to.
   */
  UI5Model getModel() {
    (
      /* 1. The result is a named model and the names in the controlSetModel call and in the binding path match up, but the viewSetModelCall isn't the case. */
      exists(MethodCallNode controlSetModelCall |
        controlSetModelCall.getMethodName() = "setModel" and
        this.getControlDeclaration().getAReference().flowsTo(controlSetModelCall.getReceiver()) and
        controlSetModelCall.getArgument(1).getALocalSource().asExpr().(StringLiteral).getValue() =
          this.getModelName() and
        result.flowsTo(controlSetModelCall.getArgument(0))
      )
      or
      /* 2. The result is a default (nameless) model and both the controlSetModel call and the binding path lack a model name, but the viewSetModeCall isn't the case. */
      exists(MethodCallNode controlSetModelCall |
        controlSetModelCall.getMethodName() = "setModel" and
        this.getControlDeclaration().getAReference().flowsTo(controlSetModelCall.getReceiver()) and
        not exists(controlSetModelCall.getArgument(1)) and
        not exists(this.getModelName()) and
        result.flowsTo(controlSetModelCall.getArgument(0))
      )
      or
      /* 3. There is no call to `setModel` on a control reference that sets a named model, so we look if the view reference has one. */
      exists(MethodCallNode viewSetModelCall |
        viewSetModelCall.getMethodName() = "setModel" and
        this.getView().getController().getAViewReference().flowsTo(viewSetModelCall.getReceiver()) and
        viewSetModelCall.getArgument(1).getALocalSource().asExpr().(StringLiteral).getValue() =
          this.getModelName() and
        result.flowsTo(viewSetModelCall.getArgument(0))
      ) and
      not exists(MethodCallNode controlSetModelCall |
        controlSetModelCall.getMethodName() = "setModel" and
        this.getControlDeclaration().getAReference().flowsTo(controlSetModelCall.getReceiver()) and
        controlSetModelCall.getArgument(1).getALocalSource().asExpr().(StringLiteral).getValue() =
          this.getModelName()
      )
      or
      /* 4. There is no call to `setModel` on a control reference that set an unnamed model, so we look if the view reference has one. */
      exists(MethodCallNode viewSetModelCall |
        viewSetModelCall.getMethodName() = "setModel" and
        this.getView().getController().getAViewReference().flowsTo(viewSetModelCall.getReceiver()) and
        not exists(viewSetModelCall.getArgument(1)) and
        not exists(this.getModelName()) and
        result.flowsTo(viewSetModelCall.getArgument(0))
      ) and
      not exists(MethodCallNode controlSetModelCall |
        controlSetModelCall.getMethodName() = "setModel" and
        this.getControlDeclaration().getAReference().flowsTo(controlSetModelCall.getReceiver()) and
        not exists(controlSetModelCall.getArgument(1)) and
        not exists(this.getModelName())
      )
    )
    // and
    // /* This binding path and the resulting model should live inside the same webapp */
    // inSameWebApp(this.getFile(), result.getFile())
  }

  /**
   * Gets the `DataFlow::Node` that represents this binding path.
   */
  Node getNode() {
    /* 1-1. Internal (Client-side) model, model hardcoded in JS code */
    exists(Property p, JsonModel model |
      /* Get the property of an JS object bound to this binding path. */
      result.(DataFlow::PropWrite).getPropertyNameExpr() = p.getNameExpr() and
      this.getAbsolutePath() = model.getPathString(p) and
      /* Restrict search to inside the same webapp. */
      inSameWebApp(this.getLocation().getFile(), result.getFile())
    )
    or
    /* 1-2. Internal (Client-side) model, model loaded from JSON file */
    exists(string propName, JsonModel model |
      /* Get the property of an JS object bound to this binding path. */
      result = model.getArgument(0).getALocalSource() and
      this.getPath() = model.getPathStringPropName(propName) and
      exists(JsonObject obj, JsonValue val | val = obj.getPropValue(propName)) and
      /* Restrict search to inside the same webapp. */
      inSameWebApp(this.getLocation().getFile(), result.getFile())
    )
    or
    /* 2. External (Server-side) model */
    result = this.getModel().(UI5ExternalModel) and
    /* Restrict search to inside the same webapp. */
    inSameWebApp(this.getLocation().getFile(), result.getFile())
  }
}

class XmlControlProperty extends XmlAttribute {
  XmlControlProperty() { exists(UI5Control control | this.getElement() = control.asXmlControl()) }
}

bindingset[qualifiedTypeUri]
predicate isBuiltInControl(string qualifiedTypeUri) {
  exists(string namespace |
    namespace =
      [
        "sap\\.m.*", // https://sapui5.hana.ondemand.com/#/api/sap.m: The main UI5 control library, with responsive controls that can be used in touch devices as well as desktop browsers.
        "sap\\.f.*", // https://sapui5.hana.ondemand.com/#/api/sap.f: SAPUI5 library with controls specialized for SAP Fiori apps.
        "sap\\.ui.*" // https://sapui5.hana.ondemand.com/#/api/sap.ui: The sap.ui namespace is the central OpenAjax compliant entry point for UI related JavaScript functionality provided by SAP.
      ]
  |
    qualifiedTypeUri.regexpMatch(namespace)
  )
}

/**
 * A UI5 View that might include XSS sources and sinks in standard controls.
 */
abstract class UI5View extends File {
  abstract string getControllerName();

  /**
   * Get the `Controller.extends(...)` definition associated with this View.
   */
  CustomController getController() {
    /* The controller name should match between the view and the controller definition. */
    result.getName() = this.getControllerName() and
    /* The View and the Controller are in a same webapp. */
    inSameWebApp(this, result.getFile())
  }

  abstract UI5Control getControl();

  abstract UI5BindingPath getASource();

  abstract UI5BindingPath getAnHtmlISink();
}

JsonBindingPath getJsonItemsBinding(JsonBindingPath bindingPath) {
  exists(Binding itemsBinding |
    itemsBinding.getBindingTarget().asJsonObjectProperty("items") =
      bindingPath.getBindingTarget().getParent+() and
    result = itemsBinding.getBindingPath() and
    result != bindingPath // exclude ourselves
  ) and
  not exists(bindingPath.getModelName())
}

/**
 * A UI5BindingPath found in a JSON View.
 */
class JsonBindingPath extends UI5BindingPath {
  string boundPropertyName;
  Binding binding;
  JsonObject bindingTarget;

  JsonBindingPath() {
    bindingTarget = binding.getBindingTarget().asJsonObjectProperty(boundPropertyName) and
    binding.getBindingPath() = this
  }

  override string toString() {
    result =
      "\"" + boundPropertyName + "\": \"" + bindingTarget.getPropStringValue(boundPropertyName) +
        "\""
  }

  override string getLiteralRepr() { result = bindingTarget.getPropStringValue(boundPropertyName) }

  override string getPath() { result = this.asString() }

  override string getAbsolutePath() {
    if this.isAbsolute()
    then result = this.asString()
    else
      if exists(getJsonItemsBinding(this))
      then result = getJsonItemsBinding(this).getAbsolutePath() + "/" + this.asString()
      else result = this.asString()
  }

  override string getPropertyName() { result = boundPropertyName }

  override string getControlQualifiedType() { result = bindingTarget.getPropStringValue("Type") }

  JsonObject getBindingTarget() { result = bindingTarget }

  override UI5Control getControlDeclaration() { result.asJsonControl() = bindingTarget }
}

class JsView extends UI5View {
  /* sap.ui.jsview("...", ) { ... } */
  MethodCallNode rootJsViewCall;

  JsView() {
    exists(TopLevel toplevel, Stmt stmt |
      toplevel = unique(TopLevel t | t = this.getATopLevel()) and
      stmt = unique(Stmt s | s = toplevel.getAChildStmt())
    |
      rootJsViewCall.asExpr() = stmt.getAChildExpr() and
      rootJsViewCall.getReceiver() = DataFlow::globalVarRef("sap").getAPropertyReference("ui") and
      rootJsViewCall.getMethodName() = "jsview"
    )
  }

  MethodCallNode getRoot() { result = rootJsViewCall }

  override UI5Control getControl() {
    exists(NewNode node |
      result.asJsControl() = node and
      /* Use getAChild+ because some controls nest other controls inside them as aggregations */
      node.asExpr() = rootJsViewCall.asExpr().getAChild+() and
      (
        /* 1. A builtin control provided by UI5 */
        isBuiltInControl(node.asExpr().getAChildExpr().(DotExpr).getQualifiedName())
        or
        /* 2. A custom control with implementation code found in the webapp */
        exists(CustomControl control |
          control.getName() = node.asExpr().getAChildExpr().(DotExpr).getQualifiedName() and
          inSameWebApp(control.getFile(), node.getFile())
        )
      )
    )
  }

  override string getControllerName() {
    exists(FunctionNode function |
      function =
        rootJsViewCall
            .getArgument(1)
            .(ObjectLiteralNode)
            .getAPropertySource("getControllerName")
            .(FunctionNode) and
      result = function.getReturnNode().getALocalSource().asExpr().(StringLiteral).getValue()
    )
  }

  override JsViewBindingPath getASource() {
    exists(DataFlow::ObjectLiteralNode control, string type, string path, string property |
      this = control.getFile() and
      type = result.getControlTypeName() and
      ApiGraphModelsExtensions::sourceModel(getASuperType(type), path, "remote", _) and
      property = path.replaceAll(" ", "").regexpCapture("Member\\[([^\\]]+)\\]", 1) and
      result.getBinding().getBindingTarget().asDataFlowNode() = control.getAPropertyWrite(property)
    )
  }

  override JsViewBindingPath getAnHtmlISink() {
    exists(DataFlow::ObjectLiteralNode control, string type, string path, string property |
      this = control.getFile() and
      type = result.getControlTypeName() and
      ApiGraphModelsExtensions::sinkModel(getASuperType(type), path, "ui5-html-injection", _) and
      property = path.replaceAll(" ", "").regexpCapture("Member\\[([^\\]]+)\\]", 1) and
      result.getBinding().getBindingTarget().asDataFlowNode() = control.getAPropertyWrite(property)
    )
  }
}

class JsonView extends UI5View {
  JsonObject root;

  JsonView() {
    root.getPropStringValue("Type") = "sap.ui.core.mvc.JSONView" and
    this = root.getJsonFile()
  }

  JsonObject getRoot() { result = root }

  override UI5Control getControl() {
    exists(JsonObject object |
      root = result.asJsonControl().getParent+() and
      /* Use getAChild+ because some controls nest other controls inside them as aggregations */
      (
        /* 1. A builtin control provided by UI5 */
        isBuiltInControl(object.getPropStringValue("Type"))
        or
        /* 2. A custom control with implementation code found in the webapp */
        exists(CustomControl control |
          control.getName() = object.getPropStringValue("Type") and
          inSameWebApp(control.getFile(), object.getFile())
        )
      )
    )
  }

  override string getControllerName() { result = root.getPropStringValue("controllerName") }

  override JsonBindingPath getASource() {
    exists(JsonObject control, string type, string path, string property |
      root = control.getParent+() and
      type = result.getControlTypeName() and
      ApiGraphModelsExtensions::sourceModel(getASuperType(type), path, "remote", _) and
      property = path.replaceAll(" ", "").regexpCapture("Member\\[([^\\]]+)\\]", 1) and
      result.getBindingTarget() = control
    )
  }

  override JsonBindingPath getAnHtmlISink() {
    exists(JsonObject control, string type, string path, string property |
      root = control.getParent+() and
      type = result.getControlTypeName() and
      ApiGraphModelsExtensions::sinkModel(getASuperType(type), path, "ui5-html-injection", _) and
      property = path.replaceAll(" ", "").regexpCapture("Member\\[([^\\]]+)\\]", 1) and
      result.getBindingTarget() = control
    )
  }
}

class JsViewBindingPath extends UI5BindingPath {
  DataFlow::PropWrite bindingTarget;
  Binding binding;

  JsViewBindingPath() {
    bindingTarget = binding.getBindingTarget().asDataFlowNode() and
    binding.getBindingPath() = this
  }

  override string getLiteralRepr() { result = bindingTarget.getALocalSource().getStringValue() }

  /* `new sap.m.Input({...})` => `"sap.m.Input"` */
  override string getControlQualifiedType() {
    result =
      bindingTarget
          .getPropertyNameExpr()
          .getParent+()
          .(NewExpr)
          .getAChildExpr()
          .(DotExpr)
          .getQualifiedName()
  }

  override string getAbsolutePath() {
    /* TODO: Implement this properly! */
    result = this.getPath()
  }

  override string getPath() { result = this.asString() }

  override string getPropertyName() {
    exists(DataFlow::ObjectLiteralNode initializer |
      initializer.getAPropertyWrite(result).getRhs() = bindingTarget
    )
  }

  override UI5Control getControlDeclaration() {
    result.asJsControl().asExpr() = bindingTarget.getPropertyNameExpr().getParentExpr+().(NewExpr)
  }
}

HtmlBindingPath getHtmlItemsBinding(HtmlBindingPath bindingPath) {
  exists(Binding itemsBinding |
    result != bindingPath and
    itemsBinding.getBindingTarget().asXmlAttribute().getName() = "items" and
    bindingPath.getBindingTarget().getElement().getParent+().(HTML::Element).getAnAttribute() =
      itemsBinding.getBindingTarget().asXmlAttribute() and
    result = itemsBinding.getBindingPath()
  ) and
  not exists(bindingPath.getModelName())
}

/**
 * A UI5BindingPath found in an HTML View.
 */
class HtmlBindingPath extends UI5BindingPath {
  HTML::Attribute bindingTarget;
  Binding binding;

  HtmlBindingPath() {
    bindingTarget = binding.getBindingTarget().asXmlAttribute() and
    binding.getBindingPath() = this
  }

  override string getPath() { result = this.asString() }

  override string getLiteralRepr() { result = bindingTarget.getValue() }

  override string getAbsolutePath() {
    if this.isAbsolute()
    then result = this.asString()
    else
      if exists(getHtmlItemsBinding(this))
      then result = getHtmlItemsBinding(this).getPath() + "/" + this.getPath()
      else result = this.asString()
  }

  override string getPropertyName() { result = bindingTarget.getName() }

  override string getControlQualifiedType() {
    exists(HTML::Element control |
      bindingTarget = control.getAttributeByName(this.getPropertyName()) and
      result = control.getAttributeByName("data-sap-ui-type").getValue()
    )
  }

  HTML::Attribute getBindingTarget() { result = bindingTarget }

  override UI5Control getControlDeclaration() { result.asXmlControl() = bindingTarget.getElement() }

  override string toString() { result = bindingTarget.toString() }
}

class HtmlView extends UI5View, HTML::HtmlFile {
  HTML::Element root;

  HtmlView() {
    this = root.getFile() and
    this.getBaseName().toLowerCase().matches("%.view.html") and
    root.isTopLevel()
  }

  HTML::Element getRoot() { result = root }

  override UI5Control getControl() {
    exists(HTML::Element element |
      result.asXmlControl() = element and
      /* Use getAChild+ because some controls nest other controls inside them as aggregations */
      element = root.getChild+() and
      (
        /* 1. A builtin control provided by UI5 */
        isBuiltInControl(element.getAttributeByName("sap-ui-type").getValue())
        or
        /* 2. A custom control with implementation code found in the webapp */
        /* 2. A custom control with implementation code found in the webapp */
        exists(CustomControl control |
          control.getName() = element.getAttributeByName("sap-ui-type").getValue() and
          inSameWebApp(control.getFile(), element.getFile())
        )
      )
    )
  }

  override string getControllerName() {
    result = root.getAttributeByName("data-controller-name").getValue()
  }

  override HtmlBindingPath getASource() {
    exists(HTML::Element control, string type, string path, string property |
      this = control.getFile() and
      type = result.getControlTypeName() and
      ApiGraphModelsExtensions::sourceModel(getASuperType(type), path, "remote", _) and
      property = path.replaceAll(" ", "").regexpCapture("Member\\[([^\\]]+)\\]", 1) and
      result.getBindingTarget() = control.getAttributeByName("data-" + property)
    )
  }

  override HtmlBindingPath getAnHtmlISink() {
    exists(HTML::Element control, string type, string path, string property |
      this = control.getFile() and
      type = result.getControlTypeName() and
      ApiGraphModelsExtensions::sinkModel(getASuperType(type), path, "ui5-html-injection", _) and
      property = path.replaceAll(" ", "").regexpCapture("Member\\[([^\\]]+)\\]", 1) and
      result.getBindingTarget() = control.getAttributeByName("data-" + property)
    )
  }
}

XmlBindingPath getXmlItemsBinding(XmlBindingPath bindingPath) {
  exists(Binding itemsBinding |
    result != bindingPath and
    itemsBinding.getBindingTarget().asXmlAttribute().getName() = "items" and
    bindingPath.getBindingTarget().getElement().getParent+().(XmlElement).getAnAttribute() =
      itemsBinding.getBindingTarget().asXmlAttribute() and
    result = itemsBinding.getBindingPath()
  ) and
  not exists(bindingPath.getModelName())
}

/**
 * A UI5BindingPath found in an XML View.
 */
class XmlBindingPath extends UI5BindingPath {
  Binding binding;
  XmlAttribute bindingTarget;

  XmlBindingPath() {
    bindingTarget = binding.getBindingTarget().asXmlAttribute() and
    binding.getBindingPath() = this
  }

  /* corresponds to BindingPath.asString() */
  override string getLiteralRepr() { result = bindingTarget.getValue() }

  override string getPath() { result = this.asString() }

  /**
   * TODO: take into consideration bindElement() method call
   * e.g.
   */
  override string getAbsolutePath() {
    if this.isAbsolute()
    then result = this.asString()
    else
      if exists(getXmlItemsBinding(this))
      then result = getXmlItemsBinding(this).getPath() + "/" + this.getPath()
      else result = this.asString()
  }

  override string getPropertyName() { result = bindingTarget.getName() }

  override string getControlQualifiedType() {
    exists(XmlElement control |
      control = bindingTarget.getElement() and
      result = control.getNamespace().getUri() + "." + control.getName()
    )
  }

  override UI5Control getControlDeclaration() { result.asXmlControl() = bindingTarget.getElement() }

  override string toString() { result = bindingTarget.toString() }

  XmlAttribute getBindingTarget() { result = bindingTarget }
}

class XmlRootElement extends XmlElement {
  XmlRootElement() { any(XmlFile f).getARootElement() = this }

  /**
   * Returns a XML namespace declaration scoped to the element.
   *
   * The predicate relies on location information to determine the scope of the namespace declaration.
   * A XML element with the same starting line and column, but a larger ending line and column is
   * considered the scope of the namespace declaration.
   */
  XmlNamespace getANamespaceDeclaration() {
    exists(Location elemLoc, Location nsLoc |
      elemLoc = this.getLocation() and
      nsLoc = result.getLocation()
    |
      elemLoc.getStartLine() = nsLoc.getStartLine() and
      elemLoc.getStartColumn() = nsLoc.getStartColumn() and
      (
        elemLoc.getEndLine() > nsLoc.getEndLine()
        or
        elemLoc.getEndLine() = nsLoc.getEndLine() and
        elemLoc.getEndColumn() > nsLoc.getEndColumn()
      )
    )
  }
}

class XmlView extends UI5View instanceof XmlFile {
  XmlRootElement root;

  XmlView() {
    root = this.getARootElement() and
    (
      root.getNamespace().getUri() = "sap.ui.core.mvc"
      or
      root.getNamespace().getUri() = "sap.ui.core" and
      root.getANamespaceDeclaration().getUri() = "sap.ui.core.mvc"
    ) and
    root.hasName("View")
  }

  XmlElement getRoot() { result = root }

  /** Get the qualified type string, e.g. `sap.m.SearchField` */
  string getQualifiedType() { result = root.getNamespace().getUri() + "." + root.getName() }

  override string getControllerName() { result = root.getAttributeValue("controllerName") }

  override XmlBindingPath getASource() {
    exists(XmlElement control, string type, string path, string property |
      this = control.getFile() and
      type = result.getControlTypeName() and
      ApiGraphModelsExtensions::sourceModel(getASuperType(type), path, "remote", _) and
      property = path.replaceAll(" ", "").regexpCapture("Member\\[([^\\]]+)\\]", 1) and
      result.getBindingTarget() = control.getAttribute(property)
    )
  }

  override XmlBindingPath getAnHtmlISink() {
    exists(XmlElement control, string type, string path, string property |
      this = control.getFile() and
      type = result.getControlTypeName() and
      ApiGraphModelsExtensions::sinkModel(getASuperType(type), path, "ui5-html-injection", _) and
      property = path.replaceAll(" ", "").regexpCapture("Member\\[([^\\]]+)\\]", 1) and
      result.getBindingTarget() = control.getAttribute(property) and
      /* If the control is an `sap.ui.core.HTML` then the control should be missing the `sanitizeContent` attribute */
      (
        getASuperType(type) = "HTMLControl"
        implies
        (
          not exists(control.getAttribute("sanitizeContent")) or
          control.getAttribute("sanitizeContent").getValue() = "false"
        )
      )
    )
  }

  /**
   * Get the XML tags associated with UI5 Controls declared in this XML view.
   */
  override UI5Control getControl() {
    exists(XmlElement element |
      result.asXmlControl() = element and
      /* Use getAChild+ because some controls nest other controls inside them as aggregations */
      element = root.getAChild+() and
      (
        /* 1. A builtin control provided by UI5 */
        isBuiltInControl(element.getNamespace().getUri())
        or
        /* 2. A custom control with implementation code found in the webapp */
        exists(CustomControl control |
          control.getName() = element.getNamespace().getUri() + "." + element.getName() and
          inSameWebApp(control.getFile(), element.getFile())
        )
      )
    )
  }
}

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
  predicate accessesModel(UI5Model model) { accessesModel(model, _) }

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
    result = this.asXmlControlProperty().toString() or
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

/**
 *  Utility predicate capturing the handler name.
 */
bindingset[notation]
private string handlerNotationCaptureName(string notation) {
  result =
    notation.replaceAll(" ", "").regexpCapture("\\.([\\w-]+)(?:\\([^)]*\\$(\\{[^}]+}).*)?", 1)
}

/**
 * A function mentioned in a property of a UI5Control, usually an event handler.
 *
 * e.g. The function referred to by `doSomething()` as in `<Button press=".doSomething"/>`.
 */
class UI5Handler extends FunctionNode {
  UI5Control control;

  UI5Handler() {
    this = control.getController().getAMethod() and
    handlerNotationCaptureName(control.getProperty(_).getValue()) = this.getName()
  }

  UI5BindingPath getBindingPath() {
    exists(string propName |
      handlerNotationCaptureName(control.getProperty(propName).getValue()) = this.getName() and
      result.getLiteralRepr() = control.getProperty(result.getPropertyName()).getValue()
    )
  }

  UI5Control getControl() { result = control }
}
