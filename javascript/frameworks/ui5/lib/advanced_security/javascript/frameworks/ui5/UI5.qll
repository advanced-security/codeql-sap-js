import javascript
import DataFlow
import advanced_security.javascript.frameworks.ui5.JsonParser
import advanced_security.javascript.frameworks.ui5.dataflow.TypeTrackers
import semmle.javascript.security.dataflow.DomBasedXssCustomizations
import advanced_security.javascript.frameworks.ui5.UI5DataModels
import advanced_security.javascript.frameworks.ui5.UI5View
import advanced_security.javascript.frameworks.ui5.UI5HTML
import advanced_security.javascript.frameworks.ui5.UI5ModuleLoader
import codeql.util.FileSystem

/** Converts a qualified UI5 name such as `sap.m.Input` to `sap/m/Input`. */
bindingset[qualifiedName]
string ui5TypeNameToModulePath(string qualifiedName) { result = qualifiedName.replaceAll(".", "/") }

private module WebAppResourceRootJsonReader implements JsonParser::MakeJsonReaderSig<WebApp> {
  class JsonReader extends WebApp {
    string getJson() {
      // We match on the lowercase to cover all the possible variants of writing the attribute name.
      // Support both "data-sap-ui-resourceroots" and "data-sap-ui-resource-roots" (with hyphen)
      exists(string resourceRootAttributeName |
        resourceRootAttributeName.toLowerCase() =
          ["data-sap-ui-resourceroots", "data-sap-ui-resource-roots"]
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

  predicate contains(File file) { this.getAChildContainer*().getAFile() = file }
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
  or
  exists(WebApp webApp | webApp.getManifest() = f1 and webApp.getAResource() = f2)
  or
  exists(WebApp webApp | webApp.getManifest() = f2 and webApp.getAResource() = f1)
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
 * A reference to the Fragment module (`sap/ui/core/Fragment`).
 * Used for static methods like `Fragment.byId(viewId, controlId)`.
 *
 * Use of `DataFlow::moduleImport` may not cover byId references
 * coming from sources with es6 style imports of Fragments.
 */
class FragmentModule extends DataFlow::SourceNode {
  FragmentModule() { this = DataFlow::moduleImport("sap/ui/core/Fragment") }
}

/**
 * A user-defined module through `sap.ui.define` or `jQuery.sap.declare`.
 */
overlay[local?]
abstract class UserModule extends CallExpr {
  abstract string getADependency();

  string getModuleFileRelativePath() { result = this.getFile().getRelativePath() }

  abstract RequiredObject getRequiredObject(string dependencyType);
}

/**
 * A user-defined module through `sap.ui.define`.
 * https://sapui5.hana.ondemand.com/sdk/#/api/sap.ui%23methods/sap.ui.define
 */
overlay[local?]
class SapDefineModule extends UI5ModuleDefinition, UserModule {
  SapExtendCall getExtendCall() { result.getDefine() = this }

  string getName() { result = this.getExtendCall().getName() }

  Module asModule() { result = this.getTopLevel() }

  string getDependency(int i) {
    result = this.(AmdModuleDefinition).getDependencyExpr(i).getStringValue()
  }

  override string getADependency() { result = this.getDependency(_) }

  override RequiredObject getRequiredObject(string name) {
    result = this.(AmdModuleDefinition).getDependencyParameter(name)
  }

  WebApp getWebApp() { this.getFile() = result.getAResource() }

  /**
   * Gets the module defined with sap.ui.define that imports and extends (subclasses) this module.
   */
  SapDefineModule getExtendingModule() { result.getSuperModule(_) = this }

  /**
   * Gets the module that this module imports via path `importPath`.
   */
  SapDefineModule getImportedModule(string importPath) {
    /* 1. Absolute import paths: We resolve this ourselves. */
    exists(string importedModuleDefinitionPath, string importedModuleDefinitionPathSlashNormalized |
      /*
       *  Let `importPath` = "my/app/path1/path2/controller/Some.controller",
       *      `importedModuleDefinitionPath` = "my.app.path1.path2.controller.Some",
       *      `importedModuleDefinitionPathSlashNormalized` = "my/app/path1/path2/controller/Some".
       *  Then, `importedModuleDefinitionPathSlashNormalized` matches `importPath`.
       */

      importPath = this.asModule().getAnImport().getImportedPathExpr().getStringValue() and
      importedModuleDefinitionPath = result.getExtendCall().getName() and
      importedModuleDefinitionPathSlashNormalized =
        ui5TypeNameToModulePath(importedModuleDefinitionPath) and
      importPath.matches(importedModuleDefinitionPathSlashNormalized + "%")
    )
    or
    /*
     * 2. Relative import paths: We delegate the heaving lifting of resolving to
     * `Import.resolveImportedPath/0`.
     */

    exists(Import import_ |
      importPath = import_.getImportedPathExpr().getStringValue() and
      import_ = this.asModule().getAnImport() and
      import_.resolveImportedPath() = result.getTopLevel()
    )
  }

  /**
   * Holds if the `importingModule` extends the `importedModule`, imported via path `importPath`.
   */
  SapDefineModule getSuperModule(string importPath) {
    result = this.getImportedModule(importPath) and
    this.getRequiredObject(importPath).asSourceNode().flowsTo(this.getExtendCall().getReceiver())
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
    exists(CustomControl superControl |
      superControl.getDefine() = this.getDefine().getSuperModule(_)
    )
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

/** A `placeAt` call on a custom control's `this`, a control instantiation, or a control lookup. */
class ControlPlaceAtCall extends MethodCallNode {
  ControlPlaceAtCall() {
    exists(DataFlow::SourceNode control |
      control = any(CustomControl customControl).getAThisNode() or
      control instanceof ElementInstantiation or
      control instanceof ControlReference
    |
      this = control.getAMemberCall("placeAt")
    )
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
    // Standard byId patterns: this.byId("id"), this.getView().byId("id"), sap.ui.getCore().byId("id")
    this.getArgument(0).getALocalSource().getStringValue() = controlId and
    (
      exists(CustomController controller |
        this = controller.getAViewReference().getAMemberCall("byId") or
        this = controller.getAThisNode().getAMemberCall("byId")
      )
      or
      exists(SapUiCore sapUiCore | this = sapUiCore.getAMemberCall("byId"))
    )
    or
    // Fragment.byId(viewId, controlId) - static method with 2 arguments
    this.getNumArgument() = 2 and
    this.getArgument(1).getALocalSource().getStringValue() = controlId and
    exists(FragmentModule fragment | this = fragment.getAMemberCall("byId"))
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
 * A call to `sap.ui.core.Element#$`, returning an element's DOM reference wrapped in jQuery.
 * Includes both modeled element references and control references resolved by the QL library.
 */
private class ElementJQueryObjectSource extends JQuery::ObjectSource::Range {
  ElementJQueryObjectSource() {
    exists(DataFlow::SourceNode element |
      (
        element = ModelOutput::getATypeNode("UI5ElementReference").asSource() or
        element instanceof ControlReference
      ) and
      this = element.getAMemberCall("$") and
      this.(MethodCallNode).getNumArgument() <= 1
    )
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
    (
      customController = ModelOutput::getATypeNode("CustomController") and
      this = customController.getACall()
      or
      exists(CustomController superController |
        superController.getDefine() = this.getDefine().getSuperModule(_)
      )
    ) and
    name = this.getFile().getBaseName().regexpCapture("(.+).[cC]ontroller.js", 1)
  }

  Component getOwnerComponent() {
    this = result.getParentManifestJson().getARoutingTarget().getView().getController()
  }

  MethodCallNode getOwnerComponentRef() {
    exists(API::Node getOwnerComponent |
      getOwnerComponent = ModelOutput::getATypeNode("CustomControllerGetOwnerComponent")
    |
      customController.getASuccessor+() = getOwnerComponent and
      result = getOwnerComponent.asSource()
    )
    or
    exists(CustomController baseController |
      baseController.getDefine() = this.getDefine().getSuperModule(_) and
      result = baseController.getOwnerComponentRef()
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

import ManifestJson

/**
 * Holds if `file` belongs to the component root declared by `manifest`, that is, if `manifest` is
 * the nearest enclosing manifest of `file`. Manifests of enclosing components of a nested
 * application are therefore excluded, even when they declare the same component ID.
 */
bindingset[file, manifest]
predicate inSameUI5Component(File file, ManifestJson manifest) {
  manifest.getParentContainer().getAChildContainer*().getAFile() = file and
  manifest.getAbsolutePath().length() =
    max(ManifestJson enclosingManifest |
      enclosingManifest.getParentContainer().getAChildContainer*().getAFile() = file
    |
      enclosingManifest.getAbsolutePath().length()
    )
}

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

  ManifestJson getParentManifestJson() {
    this.getMetadata().getAPropertySource("manifest").asExpr().(StringLiteral).getValue() = "json" and
    result.getId() = this.getId() and
    inSameUI5Component(this.getFile(), result)
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
    result.getFile() = this.getParentManifestJson() and result.getName() = modelName
  }

  ExternalModelManifest getAnExternalModelDef() { result = this.getExternalModelDef(_) }

  InternalModelManifest getInternalModelDef(string modelName) {
    result.getFile() = this.getParentManifestJson() and
    result.getName() = modelName
  }
}

module ManifestJson {
  /* Data sources */
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

    ManifestJson getParentManifestJson() { result = manifestJson }

    string getType() { result = this.getPropValue("type").(JsonString).getValue() }
  }

  class ODataDataSourceManifest extends DataSourceManifest {
    ODataDataSourceManifest() { this.getType() = "OData" }
  }

  /* Routing */
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
    RouteManifest() { this = any(RouterManifest router).getPropValue("routes").getElementValue(_) }

    string getPattern() { result = this.getPropStringValue("pattern") }

    /**
     * Holds if, for example, this route has pattern `somePath/{someSuffix}` and `path` is
     * `someSuffix`.
     */
    predicate matchesPathString(string path) {
      path = this.getPattern().regexpCapture("([a-zA-Z]+/)\\{(.*)\\}.*", 2)
    }

    string getName() { result = this.getPropStringValue("name") }

    string getTarget() { result = this.getPropStringValue("target") }
  }

  class RoutingTargetManifest extends JsonObject {
    /** Note: This is NOT its `viewName` property! */
    string targetName;
    ManifestJson manifestJson;

    RoutingTargetManifest() {
      exists(JsonObject rootObj |
        this.getJsonFile() = manifestJson and
        rootObj.getJsonFile() = manifestJson and
        this =
          rootObj
              .getPropValue("sap.ui5")
              .(JsonObject)
              .getPropValue("routing")
              .(JsonObject)
              .getPropValue("targets")
              .(JsonObject)
              .getPropValue(targetName)
      )
    }

    /**
     * Gets the value of the `viewName` property of this target.
     */
    string getViewName() { result = this.getPropStringValue("viewName") }

    /**
     * Gets the view this target is associated with.
     */
    UI5View getView() {
      result.getController().getModuleName() =
        getSubstringAfterLastOccurrenceOfCharacter(this.getViewName(), "/")
    }

    /**
     * Gets the `manifest.json` file that this routing target is a part of.
     */
    ManifestJson getParentManifestJson() { result = manifestJson }
  }

  /* App descriptor */
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

    DataSourceManifest getADataSource() { result = this.getDataSource(_) }

    DataSourceManifest getDataSource(string name) {
      this = result.getParentManifestJson() and
      result.getName() = name
    }

    RoutingTargetManifest getARoutingTarget() { result = this.getRoutingTarget(_) }

    RoutingTargetManifest getRoutingTarget(string viewName) {
      result.getViewName() = viewName and
      result.getParentManifestJson() = this
    }
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

    string getModuleName() {
      result = getSubstringAfterLastOccurrenceOfCharacter(this.getName(), ".")
    }

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
      or
      result = this.getArgument(0).getStringValue()
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
        result =
          this.getAPropertySource("type").getALocalSource().asExpr().(StringLiteral).getValue()
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

    /** Gets a generated accessor or a generic `getProperty`/`setProperty` call. */
    bindingset[prefix, valueArgumentCount]
    private MethodCallNode getAnAccess(string prefix, int valueArgumentCount) {
      (
        exists(ControlReference controlReference |
          result.getReceiver().getALocalSource() = controlReference and
          exists(controlReference.getDefinition().getMetadata().getProperty(name))
        )
        or
        exists(CustomControl control |
          result.getReceiver().getALocalSource() = control.getRenderer().getParameter(1) and
          exists(control.getMetadata().getProperty(name))
        )
      ) and
      (
        result.getNumArgument() = valueArgumentCount and
        result.getMethodName() = prefix + capitalize(name) and
        name != "property"
        or
        result.getNumArgument() = valueArgumentCount + 1 and
        result.getMethodName() = prefix + "Property" and
        result.getArgument(0).getALocalSource().asExpr().(StringLiteral).getValue() = name
      ) and
      inSameWebApp(this.getFile(), result.getFile())
    }

    MethodCallNode getAWrite() { result = this.getAnAccess("set", 1) }

    MethodCallNode getARead() { result = this.getAnAccess("get", 0) }
  }

  module EventBus {
    private predicate hasSameEvent(EventBusPublishCall publish, EventBusSubscribeCall subscribe) {
      publish.getChannelName() = subscribe.getChannelName() and
      publish.getMessageType() = subscribe.getMessageType()
    }

    private CallNode getAComponentBusCall(string type) {
      exists(API::Node method |
        method = ModelOutput::getATypeNode(type) and
        method = ModelOutput::getATypeNode("CustomController").getASuccessor+()
      |
        result = method.getACall()
      )
    }

    private DataFlow::Node getModeledData(API::Node method, string type) {
      exists(API::Node data |
        data = ModelOutput::getATypeNode(type) and
        data = method.getASuccessor*()
      |
        result = data.getInducingNode()
      )
    }

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
        hasSameEvent(this, result)
      }

      override DataFlow::Node getPublishedData() {
        result = getModeledData(publishMethod, "UI5EventBusPublishedEventData")
      }
    }

    class SapUICoreEventBusPublishCall extends EventBusPublishCall {
      API::Node publishMethod;

      SapUICoreEventBusPublishCall() {
        publishMethod = ModelOutput::getATypeNode("SapUICoreEventBusPublish") and
        this = publishMethod.getACall()
      }

      override SapUICoreEventBusSubscribeCall getAMatchingSubscribeCall() {
        hasSameEvent(this, result)
      }

      override DataFlow::Node getPublishedData() {
        result = getModeledData(publishMethod, "SapUICoreEventBusPublishedEventData")
      }
    }

    class ComponentEventBusPublishCall extends EventBusPublishCall {
      ComponentEventBusPublishCall() {
        this = getAComponentBusCall("CustomControllerGetOwnerComponentEventBusPublish")
      }

      override ComponentEventBusSubscribeCall getAMatchingSubscribeCall() {
        hasSameEvent(this, result)
      }

      override DataFlow::Node getPublishedData() { result = this.getArgument(2) }
    }

    class GlobalEventBusSubscribeCall extends EventBusSubscribeCall {
      API::Node subscribeMethod;

      GlobalEventBusSubscribeCall() {
        subscribeMethod = ModelOutput::getATypeNode("UI5EventBusSubscribe") and
        this = subscribeMethod.getACall()
      }

      override GlobalEventBusPublishCall getMatchingPublishCall() { hasSameEvent(result, this) }

      override DataFlow::Node getSubscriptionData() {
        result = getModeledData(subscribeMethod, "UI5EventSubscriptionHandlerDataParameter")
      }
    }

    class SapUICoreEventBusSubscribeCall extends EventBusSubscribeCall {
      API::Node subscribeMethod;

      SapUICoreEventBusSubscribeCall() {
        subscribeMethod = ModelOutput::getATypeNode("SapUICoreEventBusSubscribe") and
        this = subscribeMethod.getACall()
      }

      override SapUICoreEventBusPublishCall getMatchingPublishCall() { hasSameEvent(result, this) }

      override DataFlow::Node getSubscriptionData() {
        result =
          getModeledData(subscribeMethod.getASuccessor(),
            "SapUICoreEventSubscriptionHandlerDataParameter")
      }
    }

    class ComponentEventBusSubscribeCall extends EventBusSubscribeCall {
      ComponentEventBusSubscribeCall() {
        this = getAComponentBusCall("CustomControllerGetOwnerComponentEventBusSubscribe")
      }

      override ComponentEventBusPublishCall getMatchingPublishCall() { hasSameEvent(result, this) }

      override DataFlow::Node getSubscriptionData() {
        result = this.getABoundCallbackParameter(2, 2)
      }
    }
  }
}

bindingset[input, character]
private int countCharacterInString(string input, string character) {
  result = count(int index | character = input.charAt(index) | index)
}

bindingset[input, character]
private string getSubstringAfterLastOccurrenceOfCharacter(string input, string character) {
  result = input.splitAt(character, countCharacterInString(input, character))
}
