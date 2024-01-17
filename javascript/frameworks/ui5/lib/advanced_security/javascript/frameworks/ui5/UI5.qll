import javascript
import DataFlow
import advanced_security.javascript.frameworks.ui5.JsonParser
import semmle.javascript.security.dataflow.DomBasedXssCustomizations
import advanced_security.javascript.frameworks.ui5.UI5View
import advanced_security.javascript.frameworks.ui5.UI5HTML

private module WebAppResourceRootJsonReader implements JsonParser::MakeJsonReaderSig<WebApp> {
  class JsonReader extends WebApp {
    string getJson() {
      // We match on the lowercase to cover all the possible variants of writing the attribute name.
      exists(string resourceRootAttributeName |
        resourceRootAttributeName.toLowerCase() = "data-sap-ui-resourceroots"
      |
        result = this.getCoreScript().getAttributeByName(resourceRootAttributeName).getValue()
      )
    }
  }
}

private module WebAppResourceRootJsonParser =
  JsonParser::Make<WebApp, WebAppResourceRootJsonReader>;

private predicate isAnUnResolvedResourceRoot(WebApp webApp, string name, string path) {
  exists(
    WebAppResourceRootJsonParser::JsonObject config,
    WebAppResourceRootJsonParser::JsonMember configEntry
  |
    config.getReader() = webApp and
    config.getAMember() = configEntry and
    name = configEntry.getKey() and
    path = configEntry.getValue().asString()
  )
}

class ResourceRootPathString extends PathString {
  WebApp webApp;

  ResourceRootPathString() { isAnUnResolvedResourceRoot(webApp, _, this) }

  override Folder getARootFolder() { result = webApp.getWebAppFolder() }
}

class ResourceRoot extends Container {
  string name;
  string path;
  WebApp webApp;

  ResourceRoot() {
    isAnUnResolvedResourceRoot(webApp, name, path) and
    path.(PathString).resolve(webApp.getWebAppFolder()).getContainer() = this
  }

  string getName() { result = name }

  WebApp getWebApp() { result = webApp }

  predicate contains(File file) { this.getAChildContainer+().getAFile() = file }
}

class SapUiCoreScriptElement extends HTML::ScriptElement {
  SapUiCoreScriptElement() {
    this.getSourcePath().matches(["%sap-ui-core.js", "%sap-ui-core-nojQuery.js"])
  }

  WebApp getWebApp() { result = this.getFile() }
}

/** A UI5 web application manifest associated with a bootstrapped UI5 web application. */
class WebAppManifest extends File {
  WebApp webapp;

  WebAppManifest() {
    this.getBaseName() = "manifest.json" and
    this.getParentContainer() = webapp.getWebAppFolder()
  }

  WebApp getWebapp() { result = webapp }
}

/** A UI5 bootstrapped web application. */
class WebApp extends HTML::HtmlFile {
  SapUiCoreScriptElement coreScript;

  WebApp() { coreScript.getFile() = this }

  SapUiCoreScriptElement getCoreScript() { result = coreScript }

  ResourceRoot getAResourceRoot() { result.getWebApp() = this }

  File getAResource() { getAResourceRoot().contains(result) }

  File getResource(string relativePath) {
    result.getAbsolutePath() = getAResourceRoot().getAbsolutePath() + "/" + relativePath
  }

  Folder getWebAppFolder() { result = this.getParentContainer() }

  WebAppManifest getManifest() { result.getWebapp() = this }

  /**
   * Gets the JavaScript module that serves as an entrypoint to this webapp.
   */
  File getInitialModule() {
    exists(string initialModuleResourcePath, string resolvedModulePath, ResourceRoot resourceRoot |
      initialModuleResourcePath = coreScript.getAttributeByName("data-sap-ui-onInit").getValue() and
      resourceRoot.getWebApp() = this and
      resolvedModulePath =
        initialModuleResourcePath
            .regexpReplaceAll("^module\\s*:\\s*", "")
            .replaceAll(resourceRoot.getName(), resourceRoot.getAbsolutePath()) and
      result.getAbsolutePath() = resolvedModulePath + ".js"
    )
  }

  FrameOptions getFrameOptions() {
    exists(HTML::DocumentElement doc | doc.getFile() = this |
      result.asHtmlFrameOptions() = coreScript.getAnAttribute()
    )
    or
    result.asJsFrameOptions().getFile() = this
  }

  HTML::DocumentElement getDocument() { result.getFile() = this }
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
abstract class UserModule extends InvokeNode {
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
    result = this.getArgument(0).getALocalSource().(ArrayLiteralNode).getElement(i).getStringValue()
  }

  override RequiredObject getRequiredObject(string dependencyType) {
    exists(int i |
      this.getDependencyType(i) = dependencyType and
      result = this.getArgument(1).getALocalSource().(FunctionNode).getParameter(i)
    )
  }

  WebApp getWebApp() { this.getFile() = result.getAResource() }

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

private SourceNode sapControl() { result = sapControl(TypeTracker::end()) }

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

private SourceNode sapController() { result = sapController(TypeTracker::end()) }

class CustomControl extends Extension {
  CustomControl() {
    this.getReceiver().getALocalSource() = sapControl() or
    this.getDefine() = any(SapDefineModule sapModule).getExtendingDefine()
  }

  MethodCallNode getOwnerComponentRef() {
    exists(ThisNode controlThis |
      controlThis.getBinder() = this.getAMethod() and
      controlThis.flowsTo(result.getReceiver()) and
      result.getMethodName() = "getOwnerComponent"
    )
  }

  CustomController getController() { this = result.getAControlReference().getDefinition() }

  UI5Control getAViewUsage() { result.getDefinition() = this }
}

abstract class Reference extends MethodCallNode { }

/**
 * A JS reference to a `UI5Control`, commonly obtained via `View.byId(controlId)`.
 */
class ControlReference extends Reference {
  string controlId;

  ControlReference() {
    exists(CustomController controller |
      controller.getAViewReference().flowsTo(this.getReceiver()) and
      this.getMethodName() = "byId" and
      this.getArgument(0).getALocalSource().asExpr().(StringLiteral).getValue() = controlId
    )
  }

  CustomControl getDefinition() {
    exists(UI5Control controlDeclaration |
      this = controlDeclaration.getAReference() and
      result = controlDeclaration.getDefinition()
    )
  }

  string getId() { result = controlId }
}

/**
 * A reference to a `UI5View`, commonly obtained via `Controller.getView()`.
 */
class ViewReference extends Reference {
  CustomController controller;

  ViewReference() {
    this.getMethodName() = "getView" and
    controller.getAThisNode().flowsTo(this.getReceiver())
  }

  UI5View getDefinition() { result = controller.getView() }

  MethodCallNode getABindElementCall() {
    result.getMethodName() = "bindElement" and
    this.flowsTo(result.getReceiver())
  }
}

/**
 * A reference to a CustomController, commonly obtained via `View.getController()`.
 */
class ControllerReference extends Reference {
  ViewReference viewReference;

  ControllerReference() { viewReference.flowsTo(this.getReceiver()) }

  CustomController getDefinition() { result = viewReference.getDefinition().getController() }
}

class CustomController extends Extension {
  string name;

  CustomController() {
    this.getReceiver().getALocalSource() = sapController() and
    name = this.getFile().getBaseName().regexpCapture("([a-zA-Z0-9]+).[cC]ontroller.js", 1)
  }

  Component getOwnerComponent() {
    exists(ManifestJson manifestJson, JsonObject rootObj | manifestJson = result.getManifestJson() |
      rootObj
          .getPropValue("targets")
          .(JsonObject)
          // The individual targets
          .getPropValue(_)
          .(JsonObject)
          // The target's "viewName" property
          .getPropValue("viewName")
          .(JsonString)
          .getValue() = name
    )
  }

  MethodCallNode getOwnerComponentRef() {
    exists(ThisNode controlThis |
      controlThis.getBinder() = this.getAMethod() and
      controlThis.flowsTo(result.getReceiver()) and
      result.getMethodName() = "getOwnerComponent"
    )
  }

  /**
   * Gets a reference to a view object that can be accessed from one of the methods of this controller.
   */
  ViewReference getAViewReference() {
    exists(ThisNode controllerThis |
      result.getMethodName() = "getView" and
      result.(MethodCallNode).getReceiver() = controllerThis.getALocalUse() and
      controllerThis.getBinder() = this.getAMethod()
    )
  }

  UI5View getView() { this = result.getController() }

  ControlReference getAControlReference() {
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

  ModelReference getAModelReference() { this.getAViewReference().flowsTo(result.getReceiver()) }

  RouterReference getARouterReference() {
    result.getMethodName() = "getRouter" and
    exists(ThisNode controllerThis |
      result.(MethodCallNode).getReceiver() = controllerThis.getALocalUse() and
      controllerThis.getBinder() = this.getAMethod()
    )
  }

  ControllerHandler getHandler(string handlerName) {
    result = this.getContent().getAPropertySource(handlerName)
  }

  ControllerHandler getAHandler() { result = this.getHandler(_) }
}

class RouteReference extends MethodCallNode {
  string name;

  RouteReference() {
    this.getMethodName() = "getRoute" and
    this.getArgument(0).getALocalSource().asExpr().(StringLiteral).getValue() = name and
    exists(RouterReference routerReference | routerReference.flowsTo(this.getReceiver()))
  }

  string getName() { result = name }
}

class ControllerHandler extends FunctionNode {
  string name;
  CustomController controller;

  ControllerHandler() { this = controller.getContent().getAPropertySource(name).(FunctionNode) }

  override string getName() { result = name }

  predicate isAttachedToRoute(string routeName) {
    exists(MethodCallNode attachMatchedCall, RouteReference routeReference |
      routeReference.getName() = routeName and
      routeReference.flowsTo(attachMatchedCall.getReceiver()) and
      attachMatchedCall.getMethodName() = "attachMatched" and
      attachMatchedCall.getArgument(0).(PropRead).getPropertyName() = name
    )
  }
}

class RouterReference extends MethodCallNode {
  RouterReference() {
    this.getMethodName() = "getRouter" and
    exists(CustomController controller | controller.getAThisNode().flowsTo(this.getReceiver()))
  }
}

/**
 * A reference to a model obtained by a method call to `getModel`.
 */
class ModelReference extends MethodCallNode {
  ModelReference() {
    this.getMethodName() = "getModel" and
    exists(ViewReference view | view.flowsTo(this.getReceiver()))
  }

  predicate isDefaultModelReference() { this.getNumArgument() = 0 }

  /**
   * Gets the models' name being referred to, given that it can be statically determined.
   */
  string getModelName() {
    result = this.getArgument(0).getALocalSource().asExpr().(StringLiteral).getValue()
  }

  predicate isLocalModelReference() {
    exists(InternalModelManifest internalModelManifest |
      internalModelManifest.getName() = this.getModelName() or
      this.getResolvedModel() instanceof UI5InternalModel
    )
  }

  /**
   * Gets the matching `setModel` method call of this `ModelReference`.
   */
  MethodCallNode getAMatchingSetModelCall() {
    exists(MethodCallNode setModelCall |
      setModelCall.getMethodName() = "setModel" and
      result = setModelCall and
      (
        if this.isDefaultModelReference()
        then (
          /* ========== A nameless default model ========== */
          setModelCall.getNumArgument() = 1 and
          /* 1. A matching `setModel` call is on a `ViewReference` */
          exists(ViewReference getModelCallViewRef, ViewReference setModelCallViewRef |
            /* Find the `setModelCall` that matches this */
            setModelCall.getReceiver().getALocalSource() = setModelCallViewRef and
            this.getReceiver().getALocalSource() = getModelCallViewRef and
            setModelCallViewRef.getDefinition() = getModelCallViewRef.getDefinition()
          )
          or
          /* 2. A matching `setModel` call is on a `ControlReference` */
          exists(ControlReference getModelCallControlRef, ControlReference setModelCallControlRef |
            /* Find the `setModelCall` that matches this */
            setModelCall.getReceiver().getALocalSource() = setModelCallControlRef and
            this.getReceiver().getALocalSource() = getModelCallControlRef and
            (
              setModelCallControlRef.getDefinition() = getModelCallControlRef.getDefinition() or
              setModelCallControlRef.getId() = getModelCallControlRef.getId()
            )
          )
        ) else (
          /* ========== A named non-default model ========== */
          setModelCall.getNumArgument() = 2 and
          setModelCall.getArgument(1).getALocalSource().getStringValue() = this.getModelName() and
          /* 1. A matching `setModel` call is on a `ViewReference` */
          exists(ViewReference getModelCallViewRef, ViewReference setModelCallViewRef |
            /* Find the `setModelCall` that matches this */
            setModelCall.getReceiver().getALocalSource() = setModelCallViewRef and
            this.getReceiver().getALocalSource() = getModelCallViewRef and
            setModelCallViewRef.getDefinition() = getModelCallViewRef.getDefinition()
          )
          or
          /* 2. A matching `setModel` call is on a `ControlReference` */
          exists(ControlReference getModelCallControlRef, ControlReference setModelCallControlRef |
            /* Find the `setModelCall` that matches this */
            setModelCall.getReceiver().getALocalSource() = setModelCallControlRef and
            this.getReceiver().getALocalSource() = getModelCallControlRef and
            (
              setModelCallControlRef.getDefinition() = getModelCallControlRef.getDefinition() or
              setModelCallControlRef.getId() = getModelCallControlRef.getId()
            )
          )
        )
      )
    )
  }

  /**
   * Gets a `getProperty` or `getObject` method call on this `ModelReference`. These methods read from a single property of the model this refers to.
   */
  MethodCallNode getARead() {
    result.getMethodName() = ["getProperty", "getObject"] and
    result.getReceiver().getALocalSource() = this
  }

  /**
   * Gets the resolved model of this `ModelReference` by looking for a matching `setModel` call.
   */
  UI5Model getResolvedModel() {
    /* TODO: If the argument of the setModelCall is another ModelReference, then we should recursively resolve that */
    result = this.getAMatchingSetModelCall().getArgument(0)
  }
}

abstract class UI5Model extends InvokeNode {
  CustomController getController() { result.asExpr() = this.asExpr().getParent+() }

  /**
   * A `getProperty` or `getObject` method call on this `UI5Model`. These methods read from a single property of this model.
   */
  MethodCallNode getARead() {
    result.getMethodName() = ["getProperty", "getObject"] and
    result.getReceiver().getALocalSource() = this
  }
}

/**
 * Represents models that are loaded from an internal source, i.e. XML Models or JSON models
 * whose contents are hardcoded in a JS file or loaded from a JSON file.
 * It is always the constructor call that creates the model.
 */
abstract class UI5InternalModel extends UI5Model, NewNode {
  abstract string getPathString();

  abstract string getPathString(Property property);
}

/**
 * Represents models that are loaded from an external source, e.g. OData service.
 * It is the value flowing to a `setModel` call in a handler of a `CustomController` (which is represented by `ControllerHandler`), since it is the closest we can get to the actual model itself.
 */
private SourceNode sapComponent(TypeTracker t) {
  t.start() and
  exists(UserModule d, string dependencyType |
    dependencyType =
      [
        "sap/ui/core/mvc/Component", "sap.ui.core.mvc.Component", "sap/ui/core/UIComponent",
        "sap.ui.core.UIComponent"
      ]
  |
    d.getADependencyType() = dependencyType and
    result = d.getRequiredObject(dependencyType)
  )
  or
  exists(TypeTracker t2 | result = sapComponent(t2).track(t2, t))
}

private SourceNode sapComponent() { result = sapComponent(TypeTracker::end()) }

import ManifestJson

/**
 * A UI5 Component that may contain other controllers or controls.
 */
class Component extends Extension {
  Component() { this.getReceiver().getALocalSource() = sapComponent() }

  string getId() { result = this.getName().regexpCapture("([a-zA-Z0-9.]+).Component", 1) }

  ManifestJson getManifestJson() {
    this.getMetadata().getAPropertySource("manifest").asExpr().(StringLiteral).getValue() = "json" and
    result.getId() = this.getId()
  }

  /** Get a definition of this component's model whose data source is remote. */
  DataSourceManifest getADataSource() { result = this.getADataSource(_) }

  /** Get a definition of this component's model whose data source is remote and is called modelName. */
  DataSourceManifest getADataSource(string modelName) { result.getName() = modelName }

  /** Get a reference to this component's external model. */
  MethodCallNode getAnExternalModelRef() { result = this.getAnExternalModelRef(_) }

  /** Get a reference to this component's external model called `modelName`. */
  MethodCallNode getAnExternalModelRef(string modelName) {
    result.getMethodName() = "getModel" and
    result.getArgument(0).asExpr().(StringLiteral).getValue() = modelName and
    exists(ExternalModelManifest externModelDef | externModelDef.getName() = modelName)
  }

  ExternalModelManifest getExternalModelDef(string modelName) {
    result.getFile() = this.getManifestJson() and result.getName() = modelName
  }

  ExternalModelManifest getAnExternalModelDef() { result = this.getExternalModelDef(_) }
}

module ManifestJson {
  class DataSourceManifest extends JsonObject {
    string dataSourceName;
    ManifestJson manifestJson;

    DataSourceManifest() {
      exists(JsonObject rootObj |
        this.getJsonFile() = manifestJson and
        rootObj.getJsonFile() = manifestJson and
        this =
          rootObj
              .getPropValue("sap.app")
              .(JsonObject)
              .getPropValue("dataSources")
              .(JsonObject)
              .getPropValue(dataSourceName)
      )
    }

    string getName() { result = dataSourceName }

    ManifestJson getManifestJson() { result = manifestJson }

    string getType() { result = this.getPropValue("type").(JsonString).getValue() }
  }

  class ODataDataSourceManifest extends DataSourceManifest {
    ODataDataSourceManifest() { this.getType() = "OData" }
  }

  class JsonDataSourceDefinition extends DataSourceManifest {
    JsonDataSourceDefinition() { this.getType() = "JSON" }
  }

  class RouterManifest extends JsonObject {
    ManifestJson manifestJson;

    RouterManifest() {
      exists(JsonObject rootObj |
        this.getJsonFile() = manifestJson and
        rootObj.getJsonFile() = manifestJson and
        this = rootObj.getPropValue("sap.ui5").(JsonObject).getPropValue("routing")
      )
    }

    RouteManifest getRoute() { result = this.getPropValue("routes").getElementValue(_) }
  }

  class RouteManifest extends JsonObject {
    RouterManifest parentRouterManifest;

    RouteManifest() { this = parentRouterManifest.getPropValue("routes").getElementValue(_) }

    string getPattern() { result = this.getPropStringValue("pattern") }

    /**
     *  Holds if, e.g., `this.getPattern() = "somePath/{someSuffix}"` and `path = "someSuffix"`
     */
    predicate matchesPathString(string path) {
      path = this.getPattern().regexpCapture("([a-zA-Z]+/)\\{(.*)\\}.*", 2)
    }

    string getName() { result = this.getPropStringValue("name") }

    string getTarget() { result = this.getPropStringValue("target") }
  }

  abstract class ModelManifest extends JsonObject { }

  class InternalModelManifest extends ModelManifest {
    string modelName;
    string type;

    InternalModelManifest() {
      exists(JsonObject models, JsonObject modelsParent |
        models = modelsParent.getPropValue("models") and
        this = models.getPropValue(modelName) and
        type = this.getPropStringValue("type") and
        this.getPropStringValue("type") =
          [
            "sap.ui.model.json.JSONModel", // A JSON Model
            "sap.ui.model.xml.XMLModel", // An XML Model
            "sap.ui.model.resource.ResourceModel" // A Resource Model, typically for i18n
          ]
      )
    }

    string getName() { result = modelName }

    string getType() { result = type }
  }

  /**
   * The definition of an external model in the `manifest.json`, in the `"models"` property.
   */
  class ExternalModelManifest extends ModelManifest {
    string modelName;
    string dataSourceName;

    ExternalModelManifest() {
      exists(JsonObject models |
        this = models.getPropValue(modelName) and
        dataSourceName = this.getPropStringValue("dataSource") and
        /* This data source can be found in the "dataSources" property */
        exists(DataSourceManifest dataSource | dataSource.getName() = dataSourceName)
      )
    }

    string getName() { result = modelName }

    string getDataSourceName() { result = dataSourceName }

    DataSourceManifest getDataSource() { result.getName() = dataSourceName }
  }

  class ManifestJson extends File {
    string id;

    string getId() { result = id }

    ManifestJson() {
      exists(JsonObject rootObj |
        rootObj.getJsonFile() = this and
        exists(string propertyName | exists(rootObj.getPropValue(propertyName)) |
          propertyName =
            [
              "sap.app", "sap.ui", "sap.ui5", "sap.platform.abap", "sap.platform.hcp", "sap.fiori",
              "sap.card", "_version"
            ] and
          id =
            rootObj.getPropValue("sap.app").(JsonObject).getPropValue("id").(JsonString).getValue()
        )
      ) and
      /* The name is fixed to "manifest.json": https://sapui5.hana.ondemand.com/sdk/#/topic/be0cf40f61184b358b5faedaec98b2da.html */
      this.getBaseName() = "manifest.json"
    }

    DataSourceManifest getDataSource() { this = result.getManifestJson() }
  }
}

/** The manifest.json file serving as the app descriptor. */
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
        result = "/" + property2.getName() + constructPathStringInner(property2.getInit(), property)
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
    exists(string property |
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
    pathString.regexpMatch(".*" + propName + ".*") and
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
  exists(WebApp webApp | result.getJsonFile() = webApp.getResource(path))
}

/**
 *  When given a constructor call `new JSONModel(sap.ui.require.toUrl("sap/ui/demo/mock/products.json")`,
 *  get the content of the file referred to by resolving the argument.
 *  Currently only supports `sap.ui.require.toUrl`.
 */
bindingset[path]
private JsonObject resolveIndirectPath(string path) {
  result = any(JsonObject tODO | tODO.getFile().getAbsolutePath() = path)
}

class JsonModel extends UI5InternalModel {
  JsonModel() {
    this instanceof NewNode and
    (
      exists(RequiredObject jsonModel |
        jsonModel.flowsTo(this.getCalleeNode()) and
        jsonModel.getDependencyType() = "sap/ui/model/json/JSONModel"
      )
      or
      /* Fallback */
      this.getCalleeName() = "JSONModel"
    )
  }

  /**
   *  Gets all possible path strings that can be constructed from this JSON model.
   */
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

  override string getPathString(Property property) {
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
      jsonObject =
        resolveDirectPath(this.getArgument(0).getALocalSource().asExpr().(StringLiteral).getValue())
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

  predicate isTwoWayBinding() {
    // Either explicitly set as two-way, or
    exists(MethodCallNode call, BindingMode bindingMode |
      this.flowsTo(call.getReceiver()) and
      call.getMethodName() = "setDefaultBindingMode" and
      bindingMode.getTwoWay().flowsTo(call.getArgument(0))
    )
    or
    // left untouched as default mode which is two-way.
    not exists(MethodCallNode call |
      this.flowsTo(call.getReceiver()) and
      call.getMethodName() = "setDefaultBindingMode"
    )
  }

  /**
   * Get a property of this `JsonModel`, e.g. given a JSON model `oModel` defined either of the following:
   * ```javascript
   * oModel = new JSONModel({x: null});
   * ```
   * ```javascript
   * oContent = {x: null};
   * oModel = new JSONModel(oContent);
   * ```
   * Get `x: null` as its result.
   */
  DataFlow::PropWrite getAProperty() {
    this.getArgument(0).getALocalSource().asExpr() = result.getPropertyNameExpr().getParent+()
  }
}

class XmlModel extends UI5InternalModel {
  XmlModel() {
    this instanceof NewNode and
    exists(RequiredObject xmlModel |
      xmlModel.flowsTo(this.getCalleeNode()) and
      xmlModel.getDependencyType() = "sap/ui/model/xml/XMLModel"
    )
  }

  override string getPathString(Property property) {
    /* TODO */
    result = property.toString()
  }

  override string getPathString() { result = "TODO" }
}

class BindingMode extends RequiredObject {
  BindingMode() { this.getDependencyType() = "sap/ui/model/BindingMode" }

  PropRead getOneWay() { result = this.getAPropertyRead("OneWay") }

  PropRead getTwoWay() { result = this.getAPropertyRead("TwoWay") }

  PropRead getDefault() { result = this.getAPropertyRead("Default") }

  PropRead getOneTime() { result = this.getAPropertyRead("OneTime") }
}

class RequiredObject extends SourceNode {
  RequiredObject() {
    exists(SapDefineModule sapDefineModule |
      this = sapDefineModule.getArgument(1).getALocalSource().(FunctionNode).getParameter(_)
    ) or
    exists(JQueryDefineModule jQueryDefineModule |
      this.toString() =
        jQueryDefineModule.getArgument(0).getALocalSource().asExpr().(StringLiteral).getValue()
    )
  }

  UserModule getDefiningModule() { result.getArgument(1).(FunctionNode).getParameter(_) = this }

  string getDependencyType() {
    exists(SapDefineModule module_ | this = module_.getRequiredObject(result))
  }
}

/**
 * `SomeModule.extend(...)` where `SomeModule` stands for a module imported with `sap.ui.define`.
 */
class Extension extends InvokeNode, MethodCallNode {
  Extension() {
    /* 1. The receiver object is an imported one */
    any(RequiredObject module_).flowsTo(this.getReceiver()) and
    /* 2. The method name is `extend` */
    this.(MethodCallNode).getMethodName() = "extend"
  }

  FunctionNode getAMethod() {
    result = this.getArgument(1).(ObjectLiteralNode).getAPropertySource().(FunctionNode)
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

newtype TSapElement =
  DefinitionOfElement(Extension extension) or
  ReferenceOfElement(Reference reference)

class SapElement extends TSapElement {
  Extension asDefinition() { this = DefinitionOfElement(result) }

  Reference asReference() { this = ReferenceOfElement(result) }

  SapElement getParentElement() {
    result.asReference() = this.asDefinition().(CustomControl).getController().getAViewReference() or
    result.asReference() =
      this.asReference().(ControlReference).getDefinition().getController().getAViewReference() or
    result.asDefinition() = this.asReference().(ViewReference).getDefinition().getController() or
    result.asDefinition() = this.asDefinition().(CustomController).getOwnerComponent() or
    result.asDefinition() =
      this.asReference().(ControllerReference).getDefinition().getOwnerComponent()
  }

  string toString() {
    result = this.asDefinition().toString() or
    result = this.asReference().toString()
  }

  predicate hasLocationInfo(
    string filepath, int startline, int startcolumn, int endline, int endcolumn
  ) {
    this.asDefinition().hasLocationInfo(filepath, startline, startcolumn, endline, endcolumn)
    or
    this.asReference().hasLocationInfo(filepath, startline, startcolumn, endline, endcolumn)
  }
}

/**
 * The property metadata found in an Extension.
 */
class Metadata extends ObjectLiteralNode {
  Extension extension;

  Extension getExtension() { result = extension }

  Metadata() { this = extension.getContent().getAPropertySource("metadata") }

  SourceNode getProperty(string name) {
    result =
      any(PropertyMetadata property |
        property.getParentMetadata() = this and property.getName() = name
      )
  }
}

class AggregationMetadata extends ObjectLiteralNode {
  string name;
  Metadata parentMetadata;

  AggregationMetadata() {
    this = parentMetadata.getAPropertySource("aggregations").getAPropertySource(name)
  }

  Metadata getParentMetadata() { result = parentMetadata }

  string getName() { result = name }

  /**
   * Gets the type of this aggregation.
   */
  string getType() {
    result = this.getAPropertySource("type").getALocalSource().asExpr().(StringLiteral).getValue()
  }
}

class PropertyMetadata extends ObjectLiteralNode {
  string name;
  Metadata parentMetadata;

  PropertyMetadata() {
    this = parentMetadata.getAPropertySource("properties").getAPropertySource(name)
  }

  Metadata getParentMetadata() { result = parentMetadata }

  string getName() { result = name }

  /**
   * Gets the type of this aggregation.
   */
  string getType() {
    if this.isUnrestrictedStringType()
    then result = "string"
    else
      result = this.getAPropertySource("type").getALocalSource().asExpr().(StringLiteral).getValue()
  }

  /**
   * Holds if this property's type is an unrestricted string not belonging to any enum.
   * This makes the property a possible avenue of a client-side XSS.
   */
  predicate isUnrestrictedStringType() {
    /* text : "string" */
    this.asExpr().(StringLiteral).getValue() = "string"
    or
    /* text: { type: "string" } */
    this.getAPropertySource("type").asExpr().(StringLiteral).getValue() = "string"
    or
    /* text: { someOther: "someOtherVal", ... } */
    not exists(this.getAPropertySource("type"))
  }

  MethodCallNode getAWrite() {
    (
      result.getMethodName() = "set" + capitalize(name)
      or
      result.getMethodName() = "setProperty" and
      result.getArgument(0).getALocalSource().asExpr().(StringLiteral).getValue() = name
    ) and
    exists(WebApp webApp |
      webApp.getAResource() = this.getFile() and webApp.getAResource() = result.getFile()
    )
  }

  MethodCallNode getARead() {
    (
      result.getMethodName() = "get" + capitalize(name)
      or
      result.getMethodName() = "getProperty" and
      result.getArgument(0).getALocalSource().asExpr().(StringLiteral).getValue() = name
    ) and
    exists(WebApp webApp |
      webApp.getAResource() = this.getFile() and webApp.getAResource() = result.getFile()
    )
  }
}
