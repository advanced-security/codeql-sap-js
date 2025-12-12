import javascript
import DataFlow
import advanced_security.javascript.frameworks.ui5.JsonParser
import advanced_security.javascript.frameworks.ui5.dataflow.TypeTrackers
import semmle.javascript.security.dataflow.DomBasedXssCustomizations
import advanced_security.javascript.frameworks.ui5.UI5View
import advanced_security.javascript.frameworks.ui5.UI5HTML
import codeql.util.FileSystem
private import semmle.javascript.frameworks.data.internal.ApiGraphModelsExtensions as ApiGraphModelsExtensions

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

private module UI5WebAppResolverConfig implements Folder::ResolveSig {
  predicate shouldResolve(Container f, string relativePath) {
    exists(WebApp webApp |
      f = webApp.getWebAppFolder() and
      isAnUnResolvedResourceRoot(webApp, _, relativePath)
    )
  }
}

class ResourceRoot extends Container {
  string name;
  string path;
  WebApp webApp;

  ResourceRoot() {
    isAnUnResolvedResourceRoot(webApp, name, path) and
    Folder::Resolve<UI5WebAppResolverConfig>::resolve(webApp.getWebAppFolder(), path) = this
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

bindingset[f1, f2]
pragma[inline_late]
predicate inSameWebApp(File f1, File f2) {
  exists(WebApp webApp | webApp.getAResource() = f1 and webApp.getAResource() = f2)
}

/** A UI5 bootstrapped web application. */
class WebApp extends HTML::HtmlFile {
  SapUiCoreScriptElement coreScript;

  WebApp() { coreScript.getFile() = this }

  SapUiCoreScriptElement getCoreScript() { result = coreScript }

  ResourceRoot getAResourceRoot() { result.getWebApp() = this }

  File getAResource() { this.getAResourceRoot().contains(result) }

  File getResource(string relativePath) {
    result.getAbsolutePath() = this.getAResourceRoot().getAbsolutePath() + "/" + relativePath
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
 * The global instance of `sap.ui.Core` that represents this UI5 application, as retrieved
 * by a call to `sap.ui.getCore()`.
 */
class SapUiCore extends MethodCallNode {
  /*
   * NOTE: Ideally, we'd like to use `ModelOutput::getATypeNode("SapUICore").asSource()` to
   * take advantage of the inter-procedural flexibility of MaD, but doing so causes
   * non-monotomic recursion.
   *
   * So, we opt to use `SourceNode.getAPropertyRead/1` and `SourceNode.getAMethodCall/1`
   * instead and get away with local flow tracking they provide.
   */

  SapUiCore() { this = globalVarRef("sap").getAPropertyRead("ui").getAMethodCall("getCore") }
}

/**
 * A user-defined module through `sap.ui.define` or `jQuery.sap.declare`.
 */
abstract class UserModule extends CallExpr {
  abstract string getADependency();

  abstract string getModuleFileRelativePath();

  abstract RequiredObject getRequiredObject(string dependencyType);
}

/**
 * A user-defined module through `sap.ui.define`.
 * https://sapui5.hana.ondemand.com/sdk/#/api/sap.ui%23methods/sap.ui.define
 */
class SapDefineModule extends AmdModuleDefinition::Range, MethodCallExpr, UserModule {
  SapDefineModule() {
    /*
     * NOTE: This only matches a call to the dot expression `sap.ui.define`, and does not
     * consider a flow among `sap`, `ui`, and `define`.
     */

    exists(GlobalVarAccess sap, DotExpr sapUi, DotExpr sapUiDefine |
      sap.getName() = "sap" and
      sapUi.getBase() = sap and
      sapUi.getPropertyName() = "ui" and
      this.getReceiver() = sapUiDefine
      // and this.getMethodName() = "define"
    )
  }

  string getDependency(int i) {
    result = this.(AmdModuleDefinition).getDependencyExpr(i).getStringValue()
  }

  override string getADependency() { result = this.getDependency(_) }

  override string getModuleFileRelativePath() { result = this.getFile().getRelativePath() }

  override RequiredObject getRequiredObject(string name) {
    result = this.(AmdModuleDefinition).getDependencyParameter(name)
  }

  WebApp getWebApp() { this.getFile() = result.getAResource() }

  /**
   * Gets the module defined with sap.ui.define that imports and extends this module.
   */
  SapDefineModule getExtendingModule() {
    exists(SapExtendCall baseExtendCall, SapExtendCall subclassExtendCall |
      baseExtendCall.getDefine() = this and
      result = subclassExtendCall.getDefine() and
      result
          .getRequiredObject(baseExtendCall.getName().replaceAll(".", "/"))
          .asSourceNode()
          .flowsTo(subclassExtendCall.getReceiver())
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
class JQueryDefineModule extends UserModule, MethodCallExpr {
  JQueryDefineModule() {
    exists(JQuerySap jQuerySap | this = jQuerySap.getAMemberCall(["declare", "require"]).asExpr())
  }

  override string getADependency() { result = this.getArgument(0).getStringValue() }

  override string getModuleFileRelativePath() { result = this.getFile().getRelativePath() }

  /* WARNING: toString() Hack! */
  override RequiredObject getRequiredObject(string dependencyType) {
    result.toString() = dependencyType and
    this.getADependency() = dependencyType
  }
}

class Renderer extends SapExtendCall {
  Renderer() {
    this =
      TypeTrackers::hasDependency(["sap/ui/core/Renderer", "sap.ui.core.Renderer"])
          .getAMemberCall("extend")
  }

  FunctionNode getRenderer() {
    /* 1. Old API */
    result = this.getMethod("renderer")
    or
    /* 2. Newer API (v2) */
    result = this.getContent().getAPropertyWrite("render").getRhs()
  }
}

class CustomControl extends SapExtendCall {
  CustomControl() {
    this = ModelOutput::getATypeNode("CustomControl").getACall()
    or
    exists(SapDefineModule sapModule | this.getDefine() = sapModule.getExtendingModule())
  }

  CustomController getController() { this = result.getAControlReference().getDefinition() }

  UI5Control getAViewUsage() { result.getDefinition() = this }

  FunctionNode getRenderer() {
    /* 1. Old API */
    result = this.getMethod("renderer")
    or
    /* 2. Newer API (v2) */
    result =
      this.getContent()
          .getAPropertyWrite("renderer")
          .getRhs()
          .(ObjectLiteralNode)
          .getAPropertyWrite("render")
          .getRhs()
    or
    /* 3. Renderer declared in a different file */
    /*
     * 3-1. The renderer is declared in another custom control with the module name
     * in place of the function expression.
     */

    exists(Renderer renderer |
      this.getContent()
          .getAPropertyWrite("renderer")
          .getRhs()
          .getALocalSource()
          .asExpr()
          .(StringLiteral)
          .getValue() = renderer.getName() and
      result = renderer.getRenderer()
    )
    or
    /*
     * 3-2. The renderer is declared in the custom control with whose file name
     * is `{controlName}Renderer.js`.
     */

    exists(Renderer renderer |
      renderer.getFile().getStem() = this.getFile().getStem() + "Renderer" and
      result = renderer.getRenderer()
    )
  }
}

class ControlPlaceAtCall extends MethodCallNode {
  ControlPlaceAtCall() {
    /* 1. `this.placeAt(...)` in a custom control definition. */
    exists(CustomControl control | this = control.getAThisNode().getAMemberCall("placeAt"))
    or
    /*
     * 2. `new SomeControl(...).placeAt(...)` where `SomeControl` may be UI5
     * library control or a custom control.
     */

    exists(ElementInstantiation controlInstantiation |
      this = controlInstantiation.getAMemberCall("placeAt")
    )
    or
    /*
     * 3. `oController.getView().byId(...).placeAt(...)` where
     * `oController.getView().byId(...)` is a reference to a library control
     * or a custom control.
     */

    exists(ControlReference controlReference | this = controlReference.getAMemberCall("placeAt"))
  }

  string getDomElementId() { result = this.getArgument(0).getStringValue() }
}

abstract class Reference extends MethodCallNode { }

/**
 * A JS reference to a `UI5Control`, commonly obtained via its ID.
 */
class ControlReference extends Reference {
  string controlId;

  ControlReference() {
    this.getArgument(0).getALocalSource().getStringValue() = controlId and
    (
      exists(CustomController controller |
        this = controller.getAViewReference().getAMemberCall("byId") or
        this = controller.getAThisNode().getAMemberCall("byId")
      )
      or
      exists(SapUiCore sapUiCore | this = sapUiCore.getAMemberCall("byId"))
    )
  }

  CustomControl getDefinition() {
    exists(UI5Control controlDeclaration |
      this = controlDeclaration.getAReference() and
      result = controlDeclaration.getDefinition()
    )
  }

  predicate isLibraryControlReference(string importPath) {
    exists(XmlView xml, UI5Control control |
      control = xml.getControl() and
      control.getQualifiedType() = importPath and
      controlId = control.getProperty("id").getValue()
    )
  }

  string getId() { result = controlId }

  MethodCallNode getARead(string propertyName) {
    /*
     * 1. This is a reference to a custom control with implementation found in the codebase.
     */

    exists(PropertyMetadata property |
      result = property.getARead() and
      property.getName() = propertyName
    )
    or
    (
      /*
       * 2. This is a reference to a UI5 library control without an implementation.
       */

      not exists(this.getDefinition()) and
      result.getReceiver().getALocalSource() = this and
      (
        result.getNumArgument() = 0 and
        result.getMethodName().prefix(3) = "get" and
        result.getMethodName().suffix(3).toLowerCase() = propertyName and
        propertyName != "Property"
        or
        result.getNumArgument() = 1 and
        result.getMethodName() = "getProperty" and
        result.getArgument(0).getALocalSource().asExpr().(StringLiteral).getValue() = propertyName
      )
    ) and
    inSameWebApp(this.getFile(), result.getFile())
  }

  MethodCallNode getAWrite(string propertyName) {
    (
      /*
       * 1. This is a reference to a custom control with implementation found in the codebase.
       */

      exists(PropertyMetadata property |
        result = property.getAWrite() and
        property.getName() = propertyName
      )
      or
      /*
       * 2. This is a reference to a UI5 library control without an implementation.
       */

      not exists(this.getDefinition()) and
      result.getReceiver().getALocalSource() = this and
      (
        result.getNumArgument() = 1 and
        result.getMethodName().prefix(3) = "set" and
        result.getMethodName().suffix(3).toLowerCase() = propertyName
        or
        result.getNumArgument() = 2 and
        result.getMethodName() = "setProperty" and
        result.getArgument(0).getALocalSource().asExpr().(StringLiteral).getValue() = propertyName
      )
    ) and
    inSameWebApp(this.getFile(), result.getFile())
  }
}

/**
 * A reference to a `UI5View`, commonly obtained via `Controller.getView()`.
 */
class ViewReference extends Reference {
  CustomController controller;

  ViewReference() { this = controller.getAThisNode().getAMemberCall("getView") }

  UI5View getDefinition() { result = controller.getView() }

  MethodCallNode getABindElementCall() { result = this.getAMemberCall("bindElement") }
}

/**
 * A reference to a CustomController, commonly obtained via `View.getController()`.
 */
class ControllerReference extends Reference {
  ViewReference viewReference;

  ControllerReference() { this = viewReference.getAMemberCall("getController") }

  CustomController getDefinition() { result = viewReference.getDefinition().getController() }
}

class CustomController extends SapExtendCall {
  API::Node customController;
  string name;

  CustomController() {
    customController = ModelOutput::getATypeNode("CustomController") and
    this = customController.getACall() and
    name = this.getFile().getBaseName().regexpCapture("(.+).[cC]ontroller.js", 1)
  }

  Component getOwnerComponent() {
    exists(ManifestJson manifestJson, JsonObject rootObj |
      manifestJson = result.getManifestJson() and
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
    exists(API::Node getOwnerComponent |
      getOwnerComponent = ModelOutput::getATypeNode("CustomControllerGetOwnerComponent")
    |
      customController.getASuccessor+() = getOwnerComponent and
      result = getOwnerComponent.getACall()
    )
  }

  /**
   * Gets a reference to a view object that can be accessed from one of the methods of this controller.
   */
  ViewReference getAViewReference() { result = this.getAThisNode().getAMemberCall("getView") }

  UI5View getView() { this = result.getController() }

  ControlReference getAControlReference() {
    result = this.getAViewReference().getAMemberCall("byId")
  }

  override ThisNode getAThisNode() {
    /* ========== 1. `this` referring to the binder ========== */
    result = super.getAThisNode()
    or
    /* 2. ========== `this` bound to a callback's `this` ========== */
    /*
     * 2-1. The this node of `.attachDisplay` or `.detachDisplay` also represents this
     * controller.
     */

    exists(DisplayEventHandler handler | handler = result.getBinder() |
      handler.getAssociatedContextObject().getALocalSource() = this.getAThisNode()
    )
  }

  UI5Model getModel() {
    result = this.getAViewReference().getAMemberCall("setModel").getAnArgument().getALocalSource()
  }

  ModelReference getModelReference(string modelName) {
    result = this.getAModelReference() and
    result.getArgument(0).getALocalSource().asExpr().(StringLiteral).getValue() = modelName
  }

  ModelReference getAModelReference() {
    result = this.getAViewReference().getAMemberCall("getModel")
  }

  RouterReference getARouterReference() {
    exists(ThisNode controllerThis | controllerThis.getBinder() = this.getAMethod() |
      result = controllerThis.getAMemberCall("getRouter")
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
    exists(RouterReference routerReference |
      this = routerReference.getAMemberCall("getRoute") and
      this.getArgument(0).getALocalSource().getStringValue() = name
    )
  }

  string getName() { result = name }
}

abstract class EventHandler extends FunctionNode { }

class ControllerHandler extends EventHandler {
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
    exists(CustomController controller |
      this = controller.getAThisNode().getAMemberCall("getRouter") or
      this = controller.getOwnerComponentRef().getAMemberCall("getRouter")
    )
  }

  RoutingTarget getTarget(string targetName) {
    this = result.getRouterReference() and
    targetName = result.getName()
  }

  MethodCallNode getATarget() { result = this.getTarget(_) }
}

class RoutingTarget extends MethodCallNode {
  string name;
  RouterReference routerReference;

  RoutingTarget() {
    this.getArgument(0).getALocalSource().getStringValue() = name and
    this = routerReference.getAMemberCall("getTarget")
  }

  RouterReference getRouterReference() { result = routerReference }

  string getName() { result = name }

  MethodCallNode getADisplayEventHandlerRegistration() {
    result = this.getAnAttachDisplayCall() or
    result = this.getADetachDisplayCall()
  }

  MethodCallNode getAnAttachDisplayCall() {
    result = routerReference.getATarget().getAMemberCall("attachDisplay")
  }

  MethodCallNode getADetachDisplayCall() {
    result = routerReference.getATarget().getAMemberCall("detachDisplay")
  }
}

class DisplayEventHandler extends EventHandler {
  MethodCallNode registeringCallNode;

  DisplayEventHandler() {
    exists(RoutingTarget routingTarget |
      (
        registeringCallNode = routingTarget.getAnAttachDisplayCall() or
        registeringCallNode = routingTarget.getADetachDisplayCall()
      ) and
      this = registeringCallNode.getArgument(0)
    )
  }

  ValueNode getAssociatedContextObject() {
    result = registeringCallNode.getArgument(2)
    or
    result = registeringCallNode.getArgument(1) and not result instanceof FunctionNode
  }
}

/**
 * A reference to a model obtained by a method call to `getModel`.
 */
class ModelReference extends MethodCallNode {
  ModelReference() {
    exists(ViewReference view | this = view.getAMemberCall("getModel"))
    or
    exists(CustomController controller |
      this = controller.getAViewReference().getAMemberCall("getModel") or
      this = controller.getOwnerComponentRef().getAMemberCall("getModel")
    )
    or
    exists(Component component | this = component.getAThisNode().getAMemberCall("getModel"))
  }

  predicate isDefaultModelReference() { this.getNumArgument() = 0 }

  /**
   * Gets the models' name being referred to, given that it can be statically determined.
   */
  string getModelName() { result = this.getArgument(0).getALocalSource().getStringValue() }

  predicate isLocalModelReference() {
    exists(InternalModelManifest internalModelManifest |
      internalModelManifest.getName() = this.getModelName()
    ) or
    this.getResolvedModel() instanceof UI5InternalModel
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
  MethodCallNode getARead() { result = this.getAMemberCall(["getProperty", "getObject"]) }

  /**
   * Gets the resolved model of this `ModelReference` by looking for a matching `setModel` call.
   */
  UI5Model getResolvedModel() {
    /* TODO: If the argument of the setModelCall is another ModelReference, then we should recursively resolve that */
    result = this.getAMatchingSetModelCall().getArgument(0).getALocalSource()
  }
}

abstract class UI5Model extends InvokeNode {
  CustomController getController() { result.asExpr() = this.asExpr().getParent+() }

  /**
   * A `getProperty` or `getObject` method call on this `UI5Model`. These methods read from a single property of this model.
   */
  MethodCallNode getARead() { result = this.getAMemberCall(["getProperty", "getObject"]) }
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

import ManifestJson

/**
 * A UI5 Component that may contain other controllers or controls.
 */
class Component extends SapExtendCall {
  Component() {
    /*
     * Represents models that are loaded from an external source, e.g. OData service.
     * It is the value flowing to a `setModel` call in a handler of a `CustomController` (which is represented by `ControllerHandler`), since it is the closest we can get to the actual model itself.
     */

    this = ModelOutput::getATypeNode("CustomComponent").getACall()
  }

  string getId() { result = this.getName().regexpCapture("(.+).Component", 1) }

  ManifestJson getManifestJson() {
    this.getMetadata().getAPropertySource("manifest").asExpr().(StringLiteral).getValue() = "json" and
    result.getId() = this.getId()
  }

  /** Get a definition of this component's model whose data source is remote. */
  DataSourceManifest getADataSource() { result = this.getADataSource(_) }

  /** Get a definition of this component's model whose data source is remote and is called modelName. */
  DataSourceManifest getADataSource(string modelName) { result.getName() = modelName }

  /** Get a reference to this component's external model. */
  ModelReference getAnExternalModelRef() { result = this.getAnExternalModelRef(_) }

  /** Get a reference to this component's external model called `modelName`. */
  ModelReference getAnExternalModelRef(string modelName) {
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
          ]
      )
    }

    string getName() { result = modelName }

    string getType() { result = type }
  }

  class ResourceModelManifest extends ModelManifest {
    string modelName;
    string type;

    ResourceModelManifest() {
      exists(JsonObject models, JsonObject modelsParent |
        models = modelsParent.getPropValue("models") and
        this = models.getPropValue(modelName) and
        type = this.getPropStringValue("type") and
        this.getPropStringValue("type") = "sap.ui.model.resource.ResourceModel" // A Resource Model, typically for i18n
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
        jsonModel.asSourceNode().flowsTo(this.getCalleeNode()) and
        jsonModel.getDependency() = "sap/ui/model/json/JSONModel"
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
      xmlModel.asSourceNode().flowsTo(this.getCalleeNode()) and
      xmlModel.getDependency() = "sap/ui/model/xml/XMLModel"
    )
  }

  override string getPathString(Property property) {
    /* TODO */
    result = property.toString()
  }

  override string getPathString() { result = "TODO" }
}

class ResourceModel extends UI5Model, ModelReference {
  string modelName;

  ResourceModel() {
    /* A model reference obtained from this.getOwnerComponent().getModel("i18n") */
    exists(CustomController controller, ResourceModelManifest manifest |
      (
        this = controller.getAThisNode().getAMemberCall("getModel") or
        this = controller.getOwnerComponentRef().getAMemberCall("getModel")
      ) and
      modelName = this.getModelName() and
      manifest.getName() = modelName
    )
  }

  override MethodCallNode getARead() { result = ModelReference.super.getARead() }

  MethodCallNode getResourceBundle() { result = this.getAMemberCall("getResourceBundle") }
}

class BindingMode extends RequiredObject {
  BindingMode() { this.getDependency() = "sap/ui/model/BindingMode" }

  PropRead getOneWay() { result = this.asSourceNode().getAPropertyRead("OneWay") }

  PropRead getTwoWay() { result = this.asSourceNode().getAPropertyRead("TwoWay") }

  PropRead getDefault_() { result = this.asSourceNode().getAPropertyRead("Default") }

  PropRead getOneTime() { result = this.asSourceNode().getAPropertyRead("OneTime") }
}

class RequiredObject extends Expr {
  RequiredObject() {
    exists(SapDefineModule sapDefineModule |
      this = sapDefineModule.getArgument(1).(Function).getParameter(_)
    ) or
    exists(JQueryDefineModule jQueryDefineModule |
      /* WARNING: toString() Hack! */
      this.toString() = jQueryDefineModule.getArgument(0).(StringLiteral).getValue()
    )
  }

  pragma[inline]
  SourceNode asSourceNode() { result = this.flow() }

  UserModule getDefiningModule() { result.getArgument(1).(Function).getParameter(_) = this }

  string getDependency() {
    exists(SapDefineModule module_ | this = module_.getRequiredObject(result))
  }
}

/**
 * `SomeModule.extend(...)` where `SomeModule` stands for a module imported with `sap.ui.define`.
 */
class SapExtendCall extends InvokeNode, MethodCallNode {
  SapExtendCall() {
    exists(RequiredObject requiredModule |
      this = requiredModule.asSourceNode().getAMemberCall("extend")
    )
  }

  FunctionNode getMethod(string methodName) {
    result = this.getContent().(ObjectLiteralNode).getAPropertySource(methodName)
  }

  FunctionNode getAMethod() { result = this.getMethod(_) }

  string getName() { result = this.getArgument(0).getALocalSource().getStringValue() }

  ObjectLiteralNode getContent() { result = this.getArgument(1) }

  Metadata getMetadata() {
    result = this.getContent().getAPropertySource("metadata")
    or
    exists(SapExtendCall baseExtendCall |
      baseExtendCall.getDefine().getExtendingModule() = this.getDefine() and
      result = baseExtendCall.getMetadata()
    )
  }

  /** Gets the `sap.ui.define` call that wraps this extension. */
  SapDefineModule getDefine() { this.getEnclosingFunction() = result.getArgument(1) }

  ThisNode getAThisNode() { result.getBinder() = this.getAMethod() }
}

class ElementInstantiation extends NewNode {
  string importPath;

  ElementInstantiation() {
    exists(RequiredObject requiredObject |
      this = requiredObject.asSourceNode().getAnInstantiation() and
      importPath = requiredObject.getDependency()
    )
  }

  string getId() {
    result = this.getArgument(0).(SourceNode).getAPropertyWrite("id").getRhs().getStringValue()
  }

  string getImportPath() { result = importPath }
}

/**
 * The property metadata found in an SapExtendCall.
 */
class Metadata extends ObjectLiteralNode {
  SapExtendCall extension;

  SapExtendCall getExtension() { result = extension }

  Metadata() { this = extension.getContent().getAPropertySource("metadata") }

  PropertyMetadata getProperty(string name) {
    result.getParentMetadata() = this and result.getName() = name
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
    this.getStringValue() = "string"
    or
    /* text: { type: "string" } */
    this.getAPropertySource("type").getStringValue() = "string"
    or
    /* text: { someOther: "someOtherVal", ... } */
    not exists(this.getAPropertySource("type"))
  }

  MethodCallNode getAWrite() {
    (
      /*
       * 1. The receiver is a reference to a custom control whose property
       * has the same name of the property the setter is writing to.
       */

      exists(ControlReference controlReference |
        result.getReceiver().getALocalSource() = controlReference and
        exists(controlReference.getDefinition().getMetadata().getProperty(name))
      )
      or
      /*
       * 2. The receiver is a parameter of the `renderer` method of the custom
       * control whose property has the same name of the property the setter is
       * writing to.
       */

      exists(CustomControl control |
        result.getReceiver().getALocalSource() = control.getRenderer().getParameter(1) and
        exists(control.getMetadata().getProperty(name))
      )
    ) and
    (
      result.getNumArgument() = 1 and
      result.getMethodName() = "set" + capitalize(name) and
      name != "property"
      or
      result.getNumArgument() = 2 and
      result.getMethodName() = "setProperty" and
      result.getArgument(0).getALocalSource().asExpr().(StringLiteral).getValue() = name
    ) and
    inSameWebApp(this.getFile(), result.getFile())
  }

  MethodCallNode getARead() {
    (
      /*
       * 1. The receiver is a reference to a custom control whose property
       * has the same name of the property the getter is reading from.
       */

      exists(ControlReference controlReference |
        result.getReceiver().getALocalSource() = controlReference and
        exists(controlReference.getDefinition().getMetadata().getProperty(name))
      )
      or
      /*
       * 2. The receiver is a parameter of the `renderer` method of the custom
       * control whose property has the same name of the property the getter is
       * reading from.
       */

      exists(CustomControl control |
        result.getReceiver().getALocalSource() = control.getRenderer().getParameter(1) and
        exists(control.getMetadata().getProperty(name))
      )
    ) and
    (
      result.getNumArgument() = 0 and
      result.getMethodName() = "get" + capitalize(name) and
      name != "property"
      or
      result.getNumArgument() = 1 and
      result.getMethodName() = "getProperty" and
      result.getArgument(0).getALocalSource().asExpr().(StringLiteral).getValue() = name
    ) and
    inSameWebApp(this.getFile(), result.getFile())
  }
}

module EventBus {
  abstract class EventBusPublishCall extends CallNode {
    abstract EventBusSubscribeCall getAMatchingSubscribeCall();

    abstract DataFlow::Node getPublishedData();

    string getChannelName() { result = this.getArgument(0).getALocalSource().getStringValue() }

    string getMessageType() { result = this.getArgument(1).getALocalSource().getStringValue() }
  }

  abstract class EventBusSubscribeCall extends CallNode {
    abstract EventBusPublishCall getMatchingPublishCall();

    abstract DataFlow::Node getSubscriptionData();

    string getChannelName() { result = this.getArgument(0).getALocalSource().getStringValue() }

    string getMessageType() { result = this.getArgument(1).getALocalSource().getStringValue() }
  }

  class GlobalEventBusPublishCall extends EventBusPublishCall {
    API::Node publishMethod;

    GlobalEventBusPublishCall() {
      publishMethod = ModelOutput::getATypeNode("UI5EventBusPublish") and
      this = publishMethod.getACall()
    }

    override GlobalEventBusSubscribeCall getAMatchingSubscribeCall() {
      result.getChannelName() = this.getChannelName() and
      result.getMessageType() = this.getMessageType()
    }

    override DataFlow::Node getPublishedData() {
      exists(API::Node publishedData |
        publishedData = ModelOutput::getATypeNode("UI5EventBusPublishedEventData")
      |
        publishMethod.getASuccessor*() = publishedData and
        result = publishedData.getInducingNode()
      )
    }
  }

  class SapUICoreEventBusPublishCall extends EventBusPublishCall {
    API::Node publishMethod;

    SapUICoreEventBusPublishCall() {
      publishMethod = ModelOutput::getATypeNode("SapUICoreEventBusPublish") and
      this = publishMethod.getACall()
    }

    override SapUICoreEventBusSubscribeCall getAMatchingSubscribeCall() {
      result.getChannelName() = this.getChannelName() and
      result.getMessageType() = this.getMessageType()
    }

    override DataFlow::Node getPublishedData() {
      exists(API::Node publishedData |
        publishedData = ModelOutput::getATypeNode("SapUICoreEventBusPublishedEventData")
      |
        publishMethod.getASuccessor*() = publishedData and
        result = publishedData.getInducingNode()
      )
    }
  }

  class ComponentEventBusPublishCall extends EventBusPublishCall {
    API::Node customController;

    ComponentEventBusPublishCall() {
      exists(API::Node customControllerGetOwnerComponentEventBusPublish |
        customControllerGetOwnerComponentEventBusPublish =
          ModelOutput::getATypeNode("CustomControllerGetOwnerComponentEventBusPublish")
      |
        customController = ModelOutput::getATypeNode("CustomController") and
        customControllerGetOwnerComponentEventBusPublish = customController.getASuccessor+() and
        this = customControllerGetOwnerComponentEventBusPublish.getACall()
      )
    }

    override ComponentEventBusSubscribeCall getAMatchingSubscribeCall() {
      result.getChannelName() = this.getChannelName() and
      result.getMessageType() = this.getMessageType()
    }

    override DataFlow::Node getPublishedData() { result = this.getArgument(2) }
  }

  class GlobalEventBusSubscribeCall extends EventBusSubscribeCall {
    API::Node subscribeMethod;

    GlobalEventBusSubscribeCall() {
      subscribeMethod = ModelOutput::getATypeNode("UI5EventBusSubscribe") and
      this = subscribeMethod.getACall()
    }

    override GlobalEventBusPublishCall getMatchingPublishCall() {
      result.getChannelName() = this.getChannelName() and
      result.getMessageType() = this.getMessageType()
    }

    override DataFlow::Node getSubscriptionData() {
      exists(API::Node subscribeMethodCallbackDataParameter |
        subscribeMethodCallbackDataParameter =
          ModelOutput::getATypeNode("UI5EventSubscriptionHandlerDataParameter")
      |
        subscribeMethod.getASuccessor*() = subscribeMethodCallbackDataParameter and
        result = subscribeMethodCallbackDataParameter.getInducingNode()
      )
    }
  }

  class SapUICoreEventBusSubscribeCall extends EventBusSubscribeCall {
    API::Node subscribeMethod;

    SapUICoreEventBusSubscribeCall() {
      subscribeMethod = ModelOutput::getATypeNode("SapUICoreEventBusSubscribe") and
      this = subscribeMethod.getACall()
    }

    override SapUICoreEventBusPublishCall getMatchingPublishCall() {
      result.getChannelName() = this.getChannelName() and
      result.getMessageType() = this.getMessageType()
    }

    override DataFlow::Node getSubscriptionData() {
      exists(API::Node subscribeMethodCallbackDataParameter |
        subscribeMethodCallbackDataParameter =
          ModelOutput::getATypeNode("SapUICoreEventSubscriptionHandlerDataParameter")
      |
        subscribeMethod.getASuccessor+() = subscribeMethodCallbackDataParameter and
        result = subscribeMethodCallbackDataParameter.getInducingNode()
      )
    }
  }

  class ComponentEventBusSubscribeCall extends EventBusSubscribeCall {
    API::Node customController;

    ComponentEventBusSubscribeCall() {
      exists(API::Node customControllerGetOwnerComponentEventBusSubscribe |
        customControllerGetOwnerComponentEventBusSubscribe =
          ModelOutput::getATypeNode("CustomControllerGetOwnerComponentEventBusSubscribe")
      |
        customController = ModelOutput::getATypeNode("CustomController") and
        customControllerGetOwnerComponentEventBusSubscribe = customController.getASuccessor+() and
        this = customControllerGetOwnerComponentEventBusSubscribe.getACall()
      )
    }

    override ComponentEventBusPublishCall getMatchingPublishCall() {
      result.getChannelName() = this.getChannelName() and
      result.getMessageType() = this.getMessageType()
    }

    override DataFlow::Node getSubscriptionData() { result = this.getABoundCallbackParameter(2, 2) }
  }
}

private predicate test1(DataFlow::CallNode node) {
  exists(API::Node customControllerGetOwnerComponentEventBusSubscribe, API::Node customController |
    customControllerGetOwnerComponentEventBusSubscribe =
      ModelOutput::getATypeNode("CustomControllerGetOwnerComponentEventBusSubscribe") and
    customController = ModelOutput::getATypeNode("CustomController") and
    customControllerGetOwnerComponentEventBusSubscribe = customController.getASuccessor+() and
    node = customControllerGetOwnerComponentEventBusSubscribe.getACall()
  )
}

private predicate test2(DataFlow::CallNode node) {
  node = ModelOutput::getATypeNode("CustomControllerGetOwnerComponentEventBusSubscribe").getACall()
}
