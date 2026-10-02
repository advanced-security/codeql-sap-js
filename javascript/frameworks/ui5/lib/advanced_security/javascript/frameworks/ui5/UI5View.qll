import advanced_security.javascript.frameworks.ui5.UI5
import advanced_security.javascript.frameworks.ui5.UI5Control
import advanced_security.javascript.frameworks.ui5.UI5DataModels
import advanced_security.javascript.frameworks.ui5.dataflow.UI5DataFlow
private import semmle.javascript.frameworks.data.internal.ApiGraphModelsExtensions as ApiGraphModelsExtensions
import advanced_security.javascript.frameworks.ui5.Bindings
import advanced_security.javascript.frameworks.ui5.Fragment

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
  string getAbsolutePath() {
    if this.isAbsolute()
    then result = this.getPath()
    else
      if exists(this.getNearestEnclosingItemsBinding())
      then result = this.getNearestEnclosingItemsBinding().getAbsolutePath() + "/" + this.getPath()
      else result = this.getPath()
  }

  /**
   * Gets an `items` aggregation binding whose context encloses this binding.
   *
   * For example, in `<List items="{/groups}"><List items="{entries}"><Input value="{name}"/>`,
   * both `items` bindings enclose the `name` binding.
   */
  abstract UI5BindingPath getAnEnclosingItemsBinding();

  /**
   * Gets the nearest enclosing `items` binding. In the nested-list example above, this gets
   * `{entries}`, allowing `{name}` to resolve to `/groups/entries/name`. Non-nearest bindings are
   * those that also enclose another enclosing `items` binding.
   */
  UI5BindingPath getNearestEnclosingItemsBinding() {
    result = this.getAnEnclosingItemsBinding() and
    not exists(this.getModelName()) and
    not exists(result.getModelName()) and
    not exists(UI5BindingPath closer |
      closer = this.getAnEnclosingItemsBinding() and
      not exists(closer.getModelName()) and
      result = closer.getAnEnclosingItemsBinding()
    )
  }

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
  string getControlTypeName() { result = ui5TypeNameToModulePath(this.getControlQualifiedType()) }

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
  UI5Model getModel() { result = resolveModel(this) }

  /**
   * Gets the `DataFlow::Node` that represents this binding path.
   */
  Node getNode() { result = getModelNode(this) }
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

  override JsonBindingPath getAnEnclosingItemsBinding() {
    result != this and
    result.getPropertyName() = "items" and
    result.getBindingTarget() = this.getBindingTarget().getParent+()
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

  override UI5BindingPath getAnEnclosingItemsBinding() { none() }

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

  override HtmlBindingPath getAnEnclosingItemsBinding() {
    result != this and
    result.getPropertyName() = "data-items" and
    result.getBindingTarget().getElement() = this.getBindingTarget().getElement().getParent+()
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

  override XmlBindingPath getAnEnclosingItemsBinding() {
    result != this and
    result.getPropertyName() = "items" and
    result.getBindingTarget().getElement() = this.getBindingTarget().getElement().getParent+()
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
      result.getBindingTarget() = control.getAttribute(property)
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

/**
 * An xml fragment. It may or may not have controllers associated.
 */
class XmlFragment extends UI5View instanceof XmlFile {
  XmlRootElement root;

  XmlFragment() {
    root = this.getARootElement() and
    (
      root.getNamespace().getUri() = "sap.m"
      or
      root.getNamespace().getUri() = "sap.ui.core"
    ) and
    root.hasName("FragmentDefinition")
  }

  override XmlBindingPath getASource() {
    exists(XmlElement control, string type, string path, string property |
      type = result.getControlTypeName() and
      this = control.getFile() and
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
      result.getBindingTarget() = control.getAttribute(property)
    )
  }

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

  /**
   * This is either known in the location from which `loadFragment` is called (in a controller's init function)
   * OR in the optional controller param of `Fragment.load`.
   * This MAY return no value, when the fragment is not associated to any controller.
   * When this returns a value it is guaranteed that this xml fragment is instantiated.
   */
  override string getControllerName() {
    exists(CustomController controller, MethodCallNode loadFragmentCall |
      loadFragmentCall.getMethodName() = "loadFragment" and
      controller.getAThisNode().flowsTo(loadFragmentCall.getReceiver()) and
      controller.getName() = result
    )
    or
    exists(CustomController controller, FragmentLoad fragmentLoad |
      controller.getAThisNode().flowsTo(fragmentLoad.getControllerArgument()) and
      /*
       * extracting just the base name of the fragment (not the fully qualified)
       * otherwise difficult to know which part of absolute path is only for the qualified name
       */

      fragmentLoad
          .getNameArgument()
          .getStringValue()
          .matches("%" + this.getBaseName().replaceAll(".fragment.xml", "")) and
      controller.getName() = result
    )
  }
}
