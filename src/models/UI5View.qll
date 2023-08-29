private import javascript
private import DataFlow
private import UI5::UI5
private import semmle.javascript.frameworks.data.internal.ApiGraphModelsExtensions as ApiGraphModelsExtensions

/**
 * Utiility predicate returning
 * types that are supertype of the argument
 * ```
 *   data:["sap/m/InputBase", "sap/m/Input", ""]
 * ```
 */
bindingset[base]
private string getASuperType(string base) {
  result = base or ApiGraphModelsExtensions::typeModel(result, base, "")
}

/**
 * Utility predicate capturing
 * the binding path in the argument
 * ```
 *   value: "{Control>country}"
 * ```
 */
bindingset[property]
private string bindingPathCapture(string property) {
  property.matches("{%}") and
  exists(string pattern |
    // matches "Control>country"
    pattern = "(?:[^'\"\\}]+>)?([^'\"\\}]*)" and
    (
      // simple {Control>country}
      result = property.regexpCapture("(?s)\\{" + pattern + "\\}", 1)
      or
      // object {other:{foo:'bar'} path: 'Result>country'}
      result = property.regexpCapture("(?s)\\{[^\"]*path\\s*:\\s*'" + pattern + "'[^\"]*\\}", 1)
    )
  )
}

/**
 * Models a binding path
 * like the property value `{/input}` in the following example
 * ```
 * {
 * 	"Type": "sap.m.Input",
 * 	"value": "{/input}"
 * }
 * ```
 */
abstract class UI5BindingPath extends Locatable {
  /**
   * Return the value of the binding path
   * as specified in the view
   */
  abstract string getPath();

  /**
   * Return the absolute value of the binding path
   */
  abstract string getAbsolutePath();

  /**
   * Return the name of the property associated to a binding path
   */
  abstract string getPropertyName();

  /**
   * Return the name of the associated Control
   */
  abstract string getControlName();

  /**
   * Get the model declaration, which this data binding refers to in a Controller
   */
  UI5Model getModel() {
    exists(UI5View view |
      this.getFile() = view and
      view.getController().getModel() = result
    )
  }

  DataFlow::PropWrite getNode() {
    exists(Property p, JsonModel model |
      // The property bound to an UI5View source
      result.getPropertyNameExpr() = p.getNameExpr() and
      this.getAbsolutePath() = model.getPathString(p)
    )
    // TODO
    /*
     * or exists(string propName, JsonModel model | ...
     *        model.getPathStringPropName(propName)
     *      )
     */

    }
}

abstract class UI5ControlProperty extends Locatable {
  abstract UI5Control getControl();

  abstract string getName();

  abstract string getValue();
}

class XmlControlProperty extends UI5ControlProperty instanceof XmlAttribute {
  XmlControlProperty() { this.getElement() = any(XmlControl control) }

  override string getName() { result = XmlAttribute.super.getName() }

  override string getValue() { result = XmlAttribute.super.getValue() }

  override UI5Control getControl() { result = XmlAttribute.super.getElement() }
}

/**
 * Models a UI5 View that might include
 * XSS sources and sinks in standard controls
 */
abstract class UI5View extends File {
  abstract string getControllerName();

  /**
   * Get the Controller.extends(...) definition associated with this View.
   */
  CustomController getController() {
    // The controller name should match
    result.getName() = this.getControllerName() and
    // The View and the Controller are in a same project
    exists(Project project |
      project.isInThisProject(this) and project.isInThisProject(result.getFile())
    )
  }

  abstract UI5BindingPath getASource();

  abstract UI5BindingPath getAnHtmlISink();
}

class JsonBindingPath extends UI5BindingPath, JsonValue {
  string path;

  JsonBindingPath() { path = bindingPathCapture(this.getStringValue()) }

  override string toString() {
    result = "\"" + this.getPropertyName() + "\": \"" + this.getStringValue() + "\""
  }

  override string getPath() { result = path }

  override string getAbsolutePath() {
    if path.matches("/%")
    then result = path
    else
      exists(JsonBindingPath composite_path |
        composite_path != this and
        composite_path = this.getParent+().(JsonObject).getPropValue("items") and
        result = composite_path.getAbsolutePath() + "/" + path
      )
  }

  override string getPropertyName() { this = any(JsonValue v).getPropValue(result) }

  override string getControlName() {
    exists(JsonObject control |
      this = control.getPropValue(this.getPropertyName()) and
      result = control.getPropStringValue("Type")
    )
  }
}

class JsView extends UI5View {
  /* sap.ui.jsview("...", ) { ... } */
  MethodCallNode rootJsViewCall;

  // TODO: It has a lot of spurious rows
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

  override JsBindingPath getASource() {
    exists(ObjectExpr control, string type, string path, string property |
      this = control.getFile() and
      type = result.getControlName().replaceAll(".", "/") and
      ApiGraphModelsExtensions::sourceModel(getASuperType(type), path, "remote") and
      property = path.regexpCapture("Instance\\.Member\\[([^\\]]+)\\]", 1) and
      result = control.getPropertyByName(property)
    )
  }

  override JsBindingPath getAnHtmlISink() {
    exists(ObjectExpr control, string type, string path, string property |
      this = control.getFile() and
      type = result.getControlName().replaceAll(".", "/") and
      ApiGraphModelsExtensions::sinkModel(getASuperType(type), path, "html-injection") and
      property = path.regexpCapture("Instance\\.Member\\[([^\\]]+)\\]", 1) and
      result = control.getPropertyByName(property)
    )
  }
}

class JsonView extends UI5View {
  JsonObject root;

  JsonView() {
    root.getPropStringValue("Type") = "sap.ui.core.mvc.JSONView" and
    this = root.getJsonFile()
  }

  override string getControllerName() { result = root.getPropStringValue("controllerName") }

  override JsonBindingPath getASource() {
    exists(JsonObject control, string type, string path, string property |
      root = control.getParent+() and
      type = result.getControlName().replaceAll(".", "/") and
      ApiGraphModelsExtensions::sourceModel(getASuperType(type), path, "remote") and
      property = path.regexpCapture("Instance\\.Member\\[([^\\]]+)\\]", 1) and
      result = control.getPropValue(property)
    )
  }

  override JsonBindingPath getAnHtmlISink() {
    exists(JsonObject control, string type, string path, string property |
      root = control.getParent+() and
      type = result.getControlName().replaceAll(".", "/") and
      ApiGraphModelsExtensions::sinkModel(getASuperType(type), path, "html-injection") and
      property = path.regexpCapture("Instance\\.Member\\[([^\\]]+)\\]", 1) and
      result = control.getPropValue(property)
    )
  }
}

class JsBindingPath extends UI5BindingPath, Property {
  string path;

  JsBindingPath() {
    path = bindingPathCapture(this.getInit().getStringValue()) and
    this.(Property).getFile() instanceof JsView
  }

  private string dotExprToStringInner(Expr expr) {
    if not expr instanceof DotExpr
    then result = expr.toString()
    else
      exists(Expr subexpr, string propName |
        expr.(DotExpr).accesses(subexpr, propName) and
        result = dotExprToStringInner(subexpr) + "." + propName
      )
  }

  /** `a.b.c.d.e.f.g(...)` => `"a.b.c.d.e.f.g"` */
  private string dotExprToString(DotExpr dot) { result = dotExprToStringInner(dot) }

  /* `new sap.m.Input({...})` => `"sap.m.Input"` */
  override string getControlName() {
    result =
      dotExprToString(this.getInit().(StringLiteral).getParent+().(NewExpr).getCallee().(DotExpr))
  }

  override string getAbsolutePath() { result = path /* ??? */ }

  override string getPath() { result = path }

  override string getPropertyName() { result = this.getName() }
}

class HtmlBindingPath extends UI5BindingPath, HTML::Attribute {
  string path;

  HtmlBindingPath() { path = bindingPathCapture(this.getValue()) }

  override string getPath() { result = path }

  override string getAbsolutePath() {
    if path.matches("/%")
    then result = path
    else
      exists(HtmlBindingPath composite_path |
        composite_path != this and
        composite_path = this.getElement().getParent+().(HTML::Element).getAttributeByName("items") and
        result = composite_path.getAbsolutePath() + "/" + path
      )
  }

  override string getPropertyName() { this = any(HTML::Element v).getAttributeByName(result) }

  override string getControlName() {
    exists(HTML::Element control |
      this = control.getAttributeByName(this.getPropertyName()) and
      result = control.getAttributeByName("data-sap-ui-type").getValue()
    )
  }
}

class HtmlView extends UI5View, HTML::HtmlFile {
  HTML::Element root;

  HtmlView() {
    this = root.getFile() and
    this.getBaseName().toLowerCase().matches("%.view.html") and
    root.isTopLevel()
  }

  override string getControllerName() {
    result = root.getAttributeByName("data-controller-name").getValue()
  }

  override HtmlBindingPath getASource() {
    exists(HTML::Element control, string type, string path, string property |
      this = control.getFile() and
      type = result.getControlName().replaceAll(".", "/") and
      ApiGraphModelsExtensions::sourceModel(getASuperType(type), path, "remote") and
      property = path.regexpCapture("Instance\\.Member\\[([^\\]]+)\\]", 1) and
      result = control.getAttributeByName("data-" + property)
    )
  }

  override HtmlBindingPath getAnHtmlISink() {
    exists(HTML::Element control, string type, string path, string property |
      this = control.getFile() and
      type = result.getControlName().replaceAll(".", "/") and
      ApiGraphModelsExtensions::sinkModel(getASuperType(type), path, "html-injection") and
      property = path.regexpCapture("Instance\\.Member\\[([^\\]]+)\\]", 1) and
      result = control.getAttributeByName("data-" + property)
    )
  }
}

class XmlBindingPath extends UI5BindingPath instanceof XmlAttribute {
  string path;

  XmlBindingPath() {
    path = bindingPathCapture(this.getValue()) and
    XmlAttribute.super.getElement().getParent+() instanceof XmlView
  }

  override string toString() { result = XmlAttribute.super.toString() }

  override Location getLocation() { result = XmlAttribute.super.getLocation() }

  override string getPath() { result = path }

  override string getAbsolutePath() {
    if path.matches("/%")
    then result = path
    else
      exists(XmlBindingPath composite_path |
        composite_path =
          XmlAttribute.super.getElement().getParent+().(XmlElement).getAttribute("items") and
        result = composite_path.getAbsolutePath() + "/" + path
      )
  }

  override string getPropertyName() { result = XmlAttribute.super.getName() }

  override string getControlName() {
    exists(XmlElement control |
      control = XmlAttribute.super.getElement() and
      this = control.getAttribute(this.getPropertyName()) and
      result = control.getNamespace().getUri() + "." + control.getName()
    )
  }

  UI5Control getControl() {
    this = result.(XmlElement).getAttribute(this.getPropertyName()) and
    result = XmlAttribute.super.getElement()
  }
}

class XmlView extends UI5View, XmlFile {
  XmlElement root;

  XmlView() {
    root = this.getARootElement() and
    root.getNamespace().getUri() = "sap.ui.core.mvc" and
    root.hasName("View")
  }

  /** Get the qualified type string, e.g. `sap.m.SearchField` */
  string getQualifiedType() { result = root.getNamespace().getUri() + "." + root.getName() }

  override string getControllerName() { result = root.getAttributeValue("controllerName") }

  override XmlBindingPath getASource() {
    exists(XmlElement control, string type, string path, string property |
      this = control.getFile() and
      type = result.getControlName().replaceAll(".", "/") and
      ApiGraphModelsExtensions::sourceModel(getASuperType(type), path, "remote") and
      property = path.regexpCapture("Instance\\.Member\\[([^\\]]+)\\]", 1) and
      result = control.getAttribute(property)
    )
  }

  override XmlBindingPath getAnHtmlISink() {
    exists(XmlElement control, string type, string path, string property |
      this = control.getFile() and
      type = result.getControlName().replaceAll(".", "/") and
      ApiGraphModelsExtensions::sinkModel(getASuperType(type), path, "html-injection") and
      property = path.regexpCapture("Instance\\.Member\\[([^\\]]+)\\]", 1) and
      result = control.getAttribute(property)
    )
  }

  predicate builtInControl(XmlNamespace qualifiedTypeUri) {
    exists(string namespace |
      namespace =
        [
          "sap\\.m.*", // https://sapui5.hana.ondemand.com/#/api/sap.m: The main UI5 control library, with responsive controls that can be used in touch devices as well as desktop browsers.
          "sap\\.f.*", // https://sapui5.hana.ondemand.com/#/api/sap.f: SAPUI5 library with controls specialized for SAP Fiori apps.
          "sap\\.ui.*" // https://sapui5.hana.ondemand.com/#/api/sap.ui: The sap.ui namespace is the central OpenAjax compliant entry point for UI related JavaScript functionality provided by SAP.
        ]
    |
      qualifiedTypeUri.getUri().regexpMatch(namespace)
    )
  }

  /**
   * Get the XML tags associated with UI5 Controls declared in this XML view.
   */
  XmlControl getXmlControl() {
    result =
      any(XmlElement element |
        // getAChild+ because "container controls" nest other controls inside them
        element = root.getAChild+() and
        // Either a builtin control provided by UI5
        (
          builtInControl(element.getNamespace())
          or
          // or a custom control with implementation code found in the project
          exists(CustomControl control, Project project |
            control.getName() = element.getNamespace().getUri() + "." + element.getName() and
            project.isInThisProject(control.getFile()) and
            project.isInThisProject(element.getFile())
          )
        )
      )
  }
}

abstract class UI5Control extends Locatable {
  /** Get the qualified type string, e.g. `sap.m.SearchField` */
  abstract string getQualifiedType();

  /** Get the JS Control definition if this is a custom control. */
  abstract Extension getJSDefinition();

  /** Get a reference to this control in the controller code. Currently supports only such references made through `byId`. */
  MethodCallNode getAReference() {
    result.getEnclosingFunction() = any(CustomController controller).getAMethod().asExpr() and
    result.getMethodName() = "byId" and
    result.getArgument(0).asExpr().(StringLiteral).getValue() = this.getAProperty("id").getValue()
  }

  /** Get a property of this control having the name. */
  abstract UI5ControlProperty getAProperty(string propName);

  /** Get the definition of this control, given that it's a user-defined one. */
  abstract CustomControl getDefinition();

  bindingset[propName]
  abstract MethodCallNode getARead(string propName);

  bindingset[propName]
  abstract MethodCallNode getAWrite(string propName);

  /** Holds if this control reads from or writes to a model. */
  abstract predicate accessesModel(UI5Model model);

  /** Holds if this control reads from or writes to a model with regards to a binding path. */
  abstract predicate accessesModel(UI5Model model, XmlBindingPath bindingPath);

  /** Holds if this control is a source of XSS. */
  abstract predicate isXssSource();

  /** Holds if this control is a sink of XSS. */
  abstract predicate isXssSink();

  /** Get the view that this control is part of. */
  abstract UI5View getView();

  /** If any, get the handler that this control accesses. */
  abstract FunctionNode getHandler();

  /** Get the controller that manages this control. */
  CustomController getController() { result = this.getView().getController() }
}

class XmlControl extends UI5Control, XmlElement {
  XmlControl() { this.getParent+() = any(XmlView view) }

  /** Get the qualified type string, e.g. `sap.m.SearchField` */
  override string getQualifiedType() {
    result = XmlElement.super.getNamespace().getUri() + "." + XmlElement.super.getName()
  }

  /** Get the JS Control definition if this is a custom control. */
  override Extension getJSDefinition() {
    result = any(CustomControl control | control.getName() = this.getQualifiedType())
  }

  override Location getLocation() { result = XmlElement.super.getLocation() }

  override XmlFile getFile() { result = XmlElement.super.getFile() }

  override UI5ControlProperty getAProperty(string name) { result = this.getAttribute(name) }

  override CustomControl getDefinition() {
    result.getName() = this.getQualifiedType() and
    exists(Project project |
      project.isInThisProject(this.getFile()) and project.isInThisProject(result.getFile())
    )
  }

  bindingset[propName]
  override MethodCallNode getARead(string propName) {
    exists(Project project |
      project.isInThisProject(this.getFile()) and
      project.isInThisProject(result.getFile())
    |
      result.getMethodName() = "get" + capitalize(propName)
    )
  }

  bindingset[propName]
  override MethodCallNode getAWrite(string propName) {
    exists(Project project |
      project.isInThisProject(this.getFile()) and
      project.isInThisProject(result.getFile())
    |
      result.getMethodName() = "set" + capitalize(propName)
    )
  }

  override predicate accessesModel(UI5Model model) {
    // Verify that the controller's model has the referenced property
    exists(XmlView view |
      // Both this control and the model belong to the same view
      this = view.getXmlControl() and
      model = view.getController().getModel() and
      model.getPathString() = XmlElement.super.getAnAttribute().(XmlBindingPath).getPath()
    )
    // TODO: Add case where modelName is present
  }

  override predicate accessesModel(UI5Model model, XmlBindingPath bindingPath) {
    // Verify that the controller's model has the referenced property
    exists(XmlView view |
      // Both this control and the model belong to the same view
      this = view.getXmlControl() and
      model = view.getController().getModel() and
      model.getPathString() = bindingPath.getPath() and
      bindingPath.getPath() = XmlElement.super.getAnAttribute().(XmlBindingPath).getPath()
    )
    // TODO: Add case where modelName is present
  }

  override predicate isXssSource() {
    exists(XmlView view, string type, string path, string property |
      view = XmlElement.super.getParent+() and
      type = this.getQualifiedType().replaceAll(".", "/") and
      ApiGraphModelsExtensions::sourceModel(getASuperType(type), path, "remote") and
      property = path.regexpCapture("Instance\\.Member\\[([^\\]]+)\\]", 1)
    )
  }

  override predicate isXssSink() {
    exists(XmlView view, string type, string path, string property |
      view = XmlElement.super.getParent+() and
      type = this.getQualifiedType().replaceAll(".", "/") and
      ApiGraphModelsExtensions::sinkModel(getASuperType(type), path, "html-injection") and
      property = path.regexpCapture("Instance\\.Member\\[([^\\]]+)\\]", 1)
    )
  }

  override UI5View getView() { result = XmlElement.super.getParent+().(XmlView) }

  override FunctionNode getHandler() {
    result = XmlElement.super.getAnAttribute().(XmlHandler).getDefinition()
  }

  override string toString() { result = XmlElement.super.toString() }
}

abstract class UI5Handler extends Locatable {
  /** Get the control that this handler notation is part of. */
  abstract string getPath();

  abstract UI5Control getControl();

  CustomController getController() { result = this.getControl().getController() }

  /** Get the definition of the handler being referred to. */
  abstract FunctionNode getDefinition();
}

/**
 *  Utility predicate capturing the handler name.
 */
bindingset[notation]
private string handlerNotationCapture(string notation) {
  result = notation.regexpCapture("\\.([a-zA-Z0-9]+)(\\(.*\\))?", 1)
}

class XmlHandler extends UI5Handler instanceof XmlAttribute {
  string handlerName;
  string notation;

  XmlHandler() {
    notation = XmlAttribute.super.getValue() and
    handlerName = handlerNotationCapture(notation) and
    XmlAttribute.super.getElement() instanceof XmlControl
  }

  override string getPath() { result = notation }

  override UI5Control getControl() { result = XmlAttribute.super.getElement().(XmlControl) }

  override FunctionNode getDefinition() {
    result = this.getControl().getController().getAMethod() and
    result.getName() = handlerName
  }

  override string toString() { result = XmlAttribute.super.toString() }
}
