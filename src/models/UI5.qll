private import javascript
private import DataFlow
private import semmle.javascript.security.dataflow.DomBasedXssCustomizations
private import UI5View

module UI5 {
  class Project extends Folder {
    /**
     * An UI5 project root folder.
     */
    Project() { exists(File yamlFile | yamlFile = this.getFile("ui5.yaml")) }

    /**
     * The `ui5.yaml` file that declares a UI5 application.
     */
    File getProjectYaml() { result = this.getFile("ui5.yaml") }

    predicate isInThisProject(File file) { this = file.getParentContainer*() }

    private predicate hasSapUICoreScript(HTML::HtmlFile file) {
      exists(HTML::ScriptElement script |
        file = script.getFile() and
        this.isInThisProject(file) and
        script.getSourcePath().matches("%/sap-ui-core.js")
      )
    }

    HTML::HtmlFile getMainHTML() {
      result = any(HTML::HtmlFile file | this.hasSapUICoreScript(file))
    }
  }

  /**
   * https://sapui5.hana.ondemand.com/sdk/#/api/sap.ui.loader%23methods/sap.ui.loader.config
   */
  class Loader extends CallNode {
    Loader() { this = globalVarRef("sap").getAPropertyRead("ui").getAMethodCall("loader") }
  }

  /**
   * A user-defined module through `sap.ui.define` or `jQuery.sap.declare`.
   */
  abstract class UserModule extends SapElement {
    abstract string getADependencyType();

    abstract string getModuleFileRelativePath();

    abstract RequiredObject getRequiredObject(string dependencyType);
  }

  /**
   * A user-defined module through `sap.ui.define`.
   * https://sapui5.hana.ondemand.com/sdk/#/api/sap.ui%23methods/sap.ui.define
   */
  class SapDefineModule extends CallNode, UserModule {
    SapDefineModule() { this = globalVarRef("sap").getAPropertyRead("ui").getAMethodCall("define") }

    override string getADependencyType() { result = this.getDependencyType(_) }

    override string getModuleFileRelativePath() { result = this.getFile().getRelativePath() }

    string getDependencyType(int i) {
      result =
        this.getArgument(0).getALocalSource().(ArrayLiteralNode).getElement(i).getStringValue()
    }

    override RequiredObject getRequiredObject(string dependencyType) {
      exists(int i |
        this.getDependencyType(i) = dependencyType and
        result = this.getArgument(1).getALocalSource().(FunctionNode).getParameter(i)
      )
    }

    Project getProject() { result = this.getFile().getParentContainer*() }

    SapDefineModule getExtendingDefine() {
      exists(Extension baseExtension, Extension subclassExtension, SapDefineModule subclassDefine |
        baseExtension.getDefine() = this and
        subclassDefine = subclassExtension.getDefine() and
        any(RequiredObject module_ |
          module_ = subclassDefine.getRequiredObject(baseExtension.getName().replaceAll(".", "/"))
        ).flowsTo(subclassExtension.getReceiver()) and
        result = subclassDefine
      )
    }
  }

  class JQuerySap extends DataFlow::SourceNode {
    JQuerySap() {
      exists(DataFlow::GlobalVarRefNode global |
        global.getName() = "jQuery" and
        this = global.getAPropertyRead("sap")
      )
    }
  }

  /**
   * A user-defined module through `jQuery.sap.declare`.
   */
  class JQueryDefineModule extends UserModule, DataFlow::MethodCallNode {
    JQueryDefineModule() { exists(JQuerySap jquerySap | jquerySap.flowsTo(this.getReceiver())) }

    override string getADependencyType() {
      result = this.getArgument(0).asExpr().(StringLiteral).getValue()
    }

    override string getModuleFileRelativePath() { result = this.getFile().getRelativePath() }

    /** WARNING: toString() Hack! */
    override RequiredObject getRequiredObject(string dependencyType) {
      result.toString() = dependencyType and
      this.getADependencyType() = dependencyType
    }
  }

  private RequiredObject sapControl(TypeTracker t) {
    t.start() and
    exists(UserModule d, string dependencyType |
      dependencyType = ["sap/ui/core/Control", "sap.ui.core.Control"]
    |
      d.getADependencyType() = dependencyType and
      result = d.getRequiredObject(dependencyType)
    )
    or
    exists(TypeTracker t2 | result = sapControl(t2).track(t2, t))
  }

  SourceNode sapControl() { result = sapControl(TypeTracker::end()) }

  private SourceNode sapController(TypeTracker t) {
    t.start() and
    exists(UserModule d, string dependencyType |
      dependencyType = ["sap/ui/core/mvc/Controller", "sap.ui.core.mvc.Controller"]
    |
      d.getADependencyType() = dependencyType and
      result = d.getRequiredObject(dependencyType)
    )
    or
    exists(TypeTracker t2 | result = sapController(t2).track(t2, t))
  }

  SourceNode sapController() { result = sapController(TypeTracker::end()) }

  class CustomControl extends Extension {
    CustomControl() {
      this.getReceiver().getALocalSource() = sapControl() or
      this.getDefine() = any(SapDefineModule sapModule).getExtendingDefine()
    }

    FunctionNode getRenderer() {
      exists(SourceNode propValue |
        propValue = this.getArgument(1).(ObjectLiteralNode).getAPropertySource("renderer") and
        (
          /*
           * 1. Old RenderManager API:
           * renderer: function (oRm, oControl) { ... }
           */

          propValue instanceof FunctionNode and result = propValue
          or
          /*
           * 2. New Semantic Rendering API:
           *  renderer: { apiVersion: 2, render: function(oRm, oControl) { ... } }
           */

          propValue instanceof ObjectLiteralNode and
          result = propValue.getAPropertySource("render").(FunctionNode)
          or
          /*
           * 3. The control's renderer object is an imported one
           */

          exists(string dependencyType |
            result = propValue.getALocalSource() and
            result = any(UserModule d).getRequiredObject(dependencyType)
          )
          or
          /*
           * 4. The control's renderer is referred to as a string ID
           */

          propValue.asExpr() instanceof StringLiteral and
          result =
            any(Extension extend | extend.getName() = propValue.asExpr().(StringLiteral).getValue())
                .getArgument(1)
                .(ObjectLiteralNode)
                .getAPropertySource("render")
        )
      )
      or
      /*
       * 5. There is an implicit binding between the control and its renderer with the naming convention: e.g. foo.js and fooRenderer.js
       */

      this.getFile().getExtension() = "js" and
      result =
        any(Extension extend |
          extend.getFile().getExtension() = "js" and
          result.getFile().getBaseName().splitAt(".", 0) =
            this.getFile().getBaseName().splitAt(".", 0) + "Renderer"
        ).getArgument(1).(ObjectLiteralNode).getAPropertySource("render")
    }
  }

  class CustomController extends Extension {
    CustomController() {
      this instanceof MethodCallNode and this.getReceiver().getALocalSource() = sapController()
    }

    FunctionNode getAMethod() {
      result = this.getArgument(1).(ObjectLiteralNode).getAPropertySource().(FunctionNode)
    }

    /**
     * Gets a reference to a view object that can be accessed from one of the methods of this controller.
     */
    MethodCallNode getAViewReference() {
      result.getCalleeName() = "getView" and
      exists(ThisNode controllerThis |
        result.(MethodCallNode).getReceiver() = controllerThis.getALocalUse() and
        controllerThis.getBinder() = this.getAMethod()
      )
    }

    MethodCallNode getAnElementReference() {
      exists(MethodCallNode viewRef |
        viewRef = this.getAViewReference() and
        /* There is a view */
        viewRef.flowsTo(result.(MethodCallNode).getReceiver()) and
        /* The result is a member of this view */
        result.(MethodCallNode).getMethodName() = "byId"
      )
    }

    ThisNode getAThisNode() { result.getBinder() = this.getAMethod() }

    UI5Model getModel() {
      exists(MethodCallNode setModelCall |
        this.getAViewReference().flowsTo(setModelCall.getReceiver()) and
        setModelCall.getMethodName() = "setModel" and
        result.flowsTo(setModelCall.getAnArgument())
      )
    }

    MethodCallNode getAModelReference() {
      result.getMethodName() = "getModel" and
      this.getAViewReference().flowsTo(result.getReceiver())
    }
  }

  abstract class UI5Model extends SapElement {
    abstract string getPathString();

    CustomController getController() { result.asExpr() = this.asExpr().getParent+() }
  }

  private string constructPathStringInner(Expr object) {
    if not object instanceof ObjectExpr
    then result = ""
    else
      exists(Property property | property = object.(ObjectExpr).getAProperty().(ValueProperty) |
        result = "/" + property.getName() + constructPathStringInner(property.getInit())
      )
  }

  /**
   * Create all recursive path strings of an object literal, e.g.
   * if `object = { p1: { p2: 1 }, p3: 2 }`, then create:
   * - `p1/p2`, and
   * - `p3/`.
   */
  private string constructPathString(DataFlow::ObjectLiteralNode object) {
    result = constructPathStringInner(object.asExpr())
  }

  /** Holds if the `property` is in any way nested inside the `object`. */
  private predicate propertyNestedInObject(ObjectExpr object, Property property) {
    exists(Property property2 | property2 = object.getAProperty() |
      property = property2 or
      propertyNestedInObject(property2.getInit().(ObjectExpr), property)
    )
  }

  private string constructPathStringInner(Expr object, Property property) {
    if not object instanceof ObjectExpr
    then result = ""
    else
      exists(Property property2 | property2 = object.(ObjectExpr).getAProperty().(ValueProperty) |
        if property = property2
        then result = "/" + property2.getName()
        else (
          /* We're sure this property is inside this object */
          propertyNestedInObject(property2.getInit().(ObjectExpr), property) and
          result =
            "/" + property2.getName() + constructPathStringInner(property2.getInit(), property)
        )
      )
  }

  /**
   * Create all possible path strings of an object literal up to a certain property, e.g.
   * if `object = { p1: { p2: 1 }, p3: 2 }` and `property = {p3: 2}` then create `"p3/"`.
   */
  string constructPathString(DataFlow::ObjectLiteralNode object, Property property) {
    result = constructPathStringInner(object.asExpr(), property)
  }

  /**
   * Create all recursive path strings of a JSON object, e.g.
   * if `object = { "p1": { "p2": 1 }, "p3": 2 }`, then create:
   * - `/p1/p2`, and
   * - `/p3`.
   */
  string constructPathStringJson(JsonValue object) {
    if not object instanceof JsonObject
    then result = ""
    else
      exists(string property | exists(object.(JsonObject).getPropValue(property)) |
        result = "/" + property + constructPathStringJson(object.getPropValue(property))
      )
  }

  /**
   * Create all possible path strings of a JSON object up to a certain property name, e.g.
   * if `object = { "p1": { "p2": 1 }, "p3": 2 }` and `propName = "p3"` then create `"/p3"`.
   * PRECONDITION: All of `object`'s keys are unique.
   */
  bindingset[propName]
  string constructPathStringJson(JsonValue object, string propName) {
    exists(string pathString | pathString = constructPathStringJson(object) |
      pathString.regexpMatch(propName) and
      result = pathString
    )
  }

  /**
   *  When given a constructor call `new JSONModel("controller/model.json")`,
   *  get the content of the file referred to by URI (`"controller/model.json"`)
   *  inside the string argument.
   */
  bindingset[path]
  JsonObject resolveDirectPath(string path) {
    exists(Project project, File jsonFile |
      // project contains this file
      project.isInThisProject(jsonFile) and
      jsonFile.getExtension() = "json" and
      jsonFile.getAbsolutePath() = project.getASubFolder().getAbsolutePath() + "/" + path and
      result.getJsonFile() = jsonFile
    )
  }

  /**
   *  When given a constructor call `new JSONModel(sap.ui.require.toUrl("sap/ui/demo/mock/products.json")`,
   *  get the content of the file referred to by resolving the argument.
   *  Currently only supports `sap.ui.require.toUrl`.
   */
  bindingset[path]
  JsonObject resolveIndirectPath(string path) {
    result = any(JsonObject tODO | tODO.getFile().getAbsolutePath() = path)
  }

  class JsonModel extends UI5Model {
    JsonModel() {
      this instanceof NewNode and
      exists(RequiredObject jsonModel |
        jsonModel.flowsTo(this.getCalleeNode()) and
        jsonModel.getDependencyType() = "sap/ui/model/json/JSONModel"
      )
    }

    override string getPathString() {
      /* 1. new JSONModel("controller/model.json") */
      if this.getAnArgument().asExpr() instanceof StringLiteral
      then
        result =
          constructPathStringJson(resolveDirectPath(this.getAnArgument()
                  .asExpr()
                  .(StringLiteral)
                  .getValue()))
      else
        if this.getAnArgument().(MethodCallNode).getAnArgument().asExpr() instanceof StringLiteral
        then
          /* 2. new JSONModel(sap.ui.require.toUrl("sap/ui/demo/mock/products.json")) */
          result =
            constructPathStringJson(resolveIndirectPath(this.getAnArgument()
                    .(MethodCallNode)
                    .getAnArgument()
                    .asExpr()
                    .(StringLiteral)
                    .getValue()))
        else
          /*
           * 3. new JSONModel(oData) where
           *    var oData = { input: null };
           */

          exists(ObjectLiteralNode objectNode |
            objectNode.flowsTo(this.getAnArgument()) and constructPathString(objectNode) = result
          )
    }

    string getPathString(Property property) {
      /*
       * 3. new JSONModel(oData) where
       *    var oData = { input: null };
       */

      exists(ObjectLiteralNode objectNode |
        objectNode.flowsTo(this.getAnArgument()) and
        constructPathString(objectNode, property) = result
      )
    }

    bindingset[propName]
    string getPathStringPropName(string propName) {
      exists(JsonObject jsonObject |
        jsonObject = resolveDirectPath(this.getAnArgument().asExpr().(StringLiteral).getValue())
      |
        constructPathStringJson(jsonObject, propName) = result
      )
    }

    /**
     * A model possibly supporting two-way binding explicitly set as a one-way binding model.
     */
    predicate isOneWayBinding() {
      exists(MethodCallNode call, BindingMode bindingMode |
        this.flowsTo(call.getReceiver()) and
        call.getMethodName() = "setDefaultBindingMode" and
        bindingMode.getOneWay().flowsTo(call.getArgument(0))
      )
    }
  }

  class XmlModel extends UI5Model {
    XmlModel() {
      this instanceof NewNode and
      exists(RequiredObject xmlModel |
        xmlModel.flowsTo(this.getCalleeNode()) and
        xmlModel.getDependencyType() = "sap/ui/model/xml/XMLModel"
      )
    }

    override string getPathString() { result = "WIP" }
  }

  class BindingMode extends RequiredObject {
    BindingMode() { this.getDependencyType() = "sap/ui/model/BindingMode" }

    PropRead getOneWay() { result = this.getAPropertyRead("OneWay") }

    PropRead getTwoWay() { result = this.getAPropertyRead("TwoWay") }

    PropRead getDefault() { result = this.getAPropertyRead("Default") }

    PropRead getOneTime() { result = this.getAPropertyRead("OneTime") }
  }

  class RenderManager extends SourceNode {
    RenderManager() {
      this = any(CustomControl c).getRenderer().getParameter(0)
      or
      /*
       * Through `new` keyword on an imported constructor
       */

      exists(NewNode instantiation |
        this = instantiation.getAConstructorInvocation("RenderManager")
      )
    }

    CallNode getAnUnsafeHtmlCall() {
      exists(string calleeName |
        result = this.(DataFlow::SourceNode).getAMemberCall(calleeName) and
        calleeName = ["write", "unsafeHtml"]
      )
    }
  }

  class RequiredObject extends SourceNode {
    RequiredObject() {
      exists(string dependencyType, int i |
        any(SapDefineModule sapModule).getDependencyType(i) = dependencyType and
        this =
          any(SapDefineModule sapModule)
              .getArgument(1)
              .getALocalSource()
              .(FunctionNode)
              .getParameter(i)
      )
      or
      exists(string dependencyType |
        this.toString() = dependencyType and
        any(JQueryDefineModule jQueryModule).getADependencyType() = dependencyType
      )
    }

    UserModule getDefiningModule() { result.getArgument(1).(FunctionNode).getParameter(_) = this }

    string getDependencyType() {
      exists(string dependencyType |
        this.getDefiningModule().getRequiredObject(dependencyType) = this and
        result = this.getDefiningModule().getADependencyType()
      )
    }
  }

  /**
   * `SomeModule.extend(...)` where `SomeModule` stands for a module imported with `sap.ui.define`.
   */
  class Extension extends SapElement, MethodCallNode {
    Extension() {
      /* 1. The receiver object is an imported one */
      any(RequiredObject module_).flowsTo(this.getReceiver()) and
      /* 2. The method name is `extend` */
      this.(MethodCallNode).getMethodName() = "extend"
    }

    string getName() { result = this.getArgument(0).asExpr().(StringLiteral).getValue() }

    ObjectLiteralNode getContent() { result = this.getArgument(1) }

    Metadata getMetadata() {
      result = this.getContent().getAPropertySource("metadata")
      or
      exists(Extension baseExtension |
        baseExtension.getDefine().getExtendingDefine() = this.getDefine() and
        result = baseExtension.getMetadata()
      )
    }

    /** Gets the `sap.ui.define` call that wraps this extension. */
    SapDefineModule getDefine() { this.getEnclosingFunction() = result.getArgument(1).asExpr() }
  }

  /**
   * The property metadata found in an Extension.
   */
  class Metadata extends ObjectLiteralNode {
    CustomControl control;

    CustomControl getControl() { result = control }

    Metadata() { this = control.getContent().getAPropertySource("metadata") }

    SourceNode getProperty(string name) {
      result = this.getAPropertySource("properties").getAPropertySource(name)
    }

    predicate isUnrestrictedStringType(string propName) {
      /* text : "string" */
      exists(SourceNode propRef |
        propRef = this.getProperty(propName) and
        propRef.asExpr().(StringLiteral).getValue() = "string"
      )
      or
      /* text: { type: "string" } */
      exists(SourceNode propRef |
        propRef = this.getProperty(propName) and
        propRef.getAPropertySource("type").asExpr().(StringLiteral).getValue() = "string"
      )
      or
      /* text: { someOther: "someOtherVal", ... } */
      exists(SourceNode propRef |
        propRef = this.getProperty(propName) and
        not exists(propRef.getAPropertySource("type"))
      )
    }

    MethodCallNode getAWrite() {
      exists(string propName, Project project |
        result.getMethodName() = "setProperty" and
        result.getArgument(0).asExpr().(StringLiteral).getValue() = propName and
        exists(this.getProperty(propName)) and
        project.isInThisProject(this.getFile()) and
        project.isInThisProject(result.getFile())
      )
    }

    MethodCallNode getAWrite(string propName) {
      result.getMethodName() = "setProperty" and
      result.getArgument(0).asExpr().(StringLiteral).getValue() = propName and
      exists(this.getProperty(propName)) and
      exists(Project project |
        project.isInThisProject(this.getFile()) and
        project.isInThisProject(result.getFile())
      )
    }

    MethodCallNode getARead() {
      exists(string propName, Project project |
        result.getMethodName() = "get" + propName.prefix(1).toUpperCase() + propName.suffix(1) and
        exists(this.getProperty(propName)) and
        /* Make sure that the resulting node is in the same project as this */
        project.isInThisProject(this.getFile()) and
        project.isInThisProject(result.getFile())
      )
    }

    MethodCallNode getARead(string propName) {
      result.getMethodName() = "get" + propName.prefix(1).toUpperCase() + propName.suffix(1) and
      exists(this.getProperty(propName)) and
      exists(Project project |
        project.isInThisProject(this.getFile()) and
        project.isInThisProject(result.getFile())
      )
    }
  }

  /**
   * Result of View.byId().
   * https://sapui5.hana.ondemand.com/sdk/#/api/sap.ui.core.Element
   * https://sapui5.hana.ondemand.com/sdk/#/api/sap.ui.core.mvc.Controller%23methods/byId
   */
  abstract class SapElement extends InvokeNode { }

  MethodCallNode valueFromElement() {
    exists(CustomController controller |
      result = controller.getAnElementReference().getAMethodCall() and
      result.getMethodName().substring(0, 3) = "get"
    )
  }

  class UnsafeHtmlXssSource extends DomBasedXss::Source {
    UnsafeHtmlXssSource() {
      this = valueFromElement()
      or
      exists(UI5View ui5View |
        exists(ui5View.getASource()) and
        this = ui5View.getController().getModel()
      )
    }
  }

  class UnsafeHtmlXssSink extends DomBasedXss::Sink {
    UnsafeHtmlXssSink() { this = any(RenderManager rm).getAnUnsafeHtmlCall().getArgument(0) }
  }
}
