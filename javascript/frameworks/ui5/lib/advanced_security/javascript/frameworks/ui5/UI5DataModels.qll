/**
 * Provides UI5 model references and implementations, manifest model declarations, binding-mode
 * semantics, and binding-path-to-model resolution.
 */

import javascript
import DataFlow
import advanced_security.javascript.frameworks.ui5.Bindings
import advanced_security.javascript.frameworks.ui5.Fragment
import advanced_security.javascript.frameworks.ui5.UI5
import advanced_security.javascript.frameworks.ui5.UI5Control
import advanced_security.javascript.frameworks.ui5.UI5View
private import semmle.javascript.frameworks.data.internal.ApiGraphModelsExtensions as ApiGraphModelsExtensions

/**
 * A reference to a model obtained by a method call to `getModel`.
 *
 * For example, `this.getView().getModel("products")`.
 */
class ModelReference extends MethodCallNode {
  ModelReference() {
    exists(ViewReference view | this = view.getAMemberCall("getModel"))
    or
    exists(ControlReference control | this = control.getAMemberCall("getModel"))
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
    result.getMethodName() = "setModel" and
    modelNamesMatch(this, result) and
    (
      modelControlOwnersMatch(this, result)
      or
      modelViewOwnersMatch(this, result)
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

private predicate modelNamesMatch(ModelReference getModelCall, MethodCallNode setModelCall) {
  if getModelCall.isDefaultModelReference()
  then setModelCall.getNumArgument() = 1
  else (
    setModelCall.getNumArgument() = 2 and
    setModelCall.getArgument(1).getALocalSource().getStringValue() = getModelCall.getModelName()
  )
}

private predicate modelViewOwnersMatch(ModelReference getModelCall, MethodCallNode setModelCall) {
  exists(ViewReference getModelView, ViewReference setModelView |
    getModelCall.getReceiver().getALocalSource() = getModelView and
    setModelCall.getReceiver().getALocalSource() = setModelView and
    getModelView.getDefinition() = setModelView.getDefinition()
  )
}

private predicate modelControlOwnersMatch(ModelReference getModelCall, MethodCallNode setModelCall) {
  exists(ControlReference getModelControl, ControlReference setModelControl |
    getModelCall.getReceiver().getALocalSource() = getModelControl and
    setModelCall.getReceiver().getALocalSource() = setModelControl and
    controlReferenceScopesMatch(getModelControl, setModelControl) and
    (
      getModelControl.getDefinition() = setModelControl.getDefinition() or
      getModelControl.getId() = setModelControl.getId()
    )
  )
}

private CustomController getControlReferenceController(ControlReference reference) {
  reference = result.getAViewReference().getAMemberCall("byId")
  or
  reference = result.getAThisNode().getAMemberCall("byId")
}

private predicate controlReferenceScopesMatch(ControlReference left, ControlReference right) {
  exists(CustomController controller |
    controller = getControlReferenceController(left) and
    controller = getControlReferenceController(right)
  )
  or
  not exists(getControlReferenceController(left)) and
  not exists(getControlReferenceController(right)) and
  left.getFile() = right.getFile()
}

private predicate controlReferenceBelongsToBindingView(
  ControlReference reference, UI5BindingPath bindingPath
) {
  getControlReferenceController(reference) = bindingPath.getView().getController()
  or
  not exists(getControlReferenceController(reference)) and
  reference.getFile() = bindingPath.getView().getController().getFile()
}

/**
 * A UI5 model value, for example `new JSONModel({ value: "" })`.
 */
abstract class UI5Model extends InvokeNode {
  CustomController getController() { result.asExpr() = this.asExpr().getParent+() }

  /**
   * A `getProperty` or `getObject` method call on this `UI5Model`. These methods read from a single property of this model.
   */
  MethodCallNode getARead() { result = this.getAMemberCall(["getProperty", "getObject"]) }
}

/**
 * A path-specific content node of a manifest-created default JSON model, such as the node for
 * `/input` referenced by `value="{/input}"`.
 */
abstract class ManifestJsonModelContentNode extends DataFlow::Node {
  abstract DefaultManifestJsonModel getModel();

  abstract string getAbsolutePath();
}

/**
 * Represents models that are loaded from an internal source, i.e. XML Models or JSON models
 * whose contents are hardcoded in a JS file or loaded from a JSON file.
 *
 * For example, this includes `new JSONModel({ value: "" })` and client data models declared in
 * `manifest.json`.
 */
abstract class UI5InternalModel extends UI5Model {
  abstract string getPathString();

  abstract string getPathString(Property property);

  /**
   * Holds if the content of the model is statically determinable.
   */
  abstract predicate contentIsStaticallyVisible();

  /**
   * Gets a node representing content stored in this model. For `new JSONModel({ value: "" })`,
   * this includes the `value` property; manifest-created models use path-specific binding nodes.
   */
  DataFlow::Node getAContentNode() {
    result = this.(JsonModel).getAProperty()
    or
    result.asExpr().(StringLiteral).getParent() = this.(JsonModel).asExpr()
    or
    result.(ManifestJsonModelContentNode).getModel() = this.(DefaultManifestJsonModel)
  }

  /**
   * Holds if property bindings can update this model.
   */
  predicate hasTwoWayBinding() {
    this.(JsonModel).isTwoWayBinding()
    or
    this.(DefaultManifestJsonModel).isTwoWayBinding()
  }
}

/**
 * A JSON data source declared as `{ "type": "JSON", "uri": "model/data.json" }`.
 */
class JsonDataSourceDefinition extends DataSourceManifest {
  JsonDataSourceDefinition() { this.getType() = "JSON" }
}

/**
 * A model entry under `sap.ui5/models`, for example `{ "products": { "dataSource": "api" } }`.
 */
abstract class ModelManifest extends JsonObject { }

private JsonObject getManifestModelDefinition(string modelName) {
  exists(JsonObject root |
    root.isTopLevel() and
    result =
      root.getPropValue("sap.ui5")
          .(JsonObject)
          .getPropValue("models")
          .(JsonObject)
          .getPropValue(modelName)
  )
}

/** Gets the canonical UI5 module path represented by a MaD client data model alias. */
private string getInternalModelType(string typeAlias) {
  ApiGraphModelsExtensions::typeModel("UI5ClientDataModel", typeAlias, "") and
  ApiGraphModelsExtensions::typeModel(typeAlias, result, "")
}

private DataSourceManifest getReferencedDataSource(JsonObject model) {
  result.getName() = model.getPropStringValue("dataSource") and
  result.getParentManifestJson() = model.getJsonFile()
}

/**
 * Gets the internal model type explicitly configured on `model`, or the type inferred by UI5
 * from its referenced data source. For example, a model referencing a data source with
 * `"type": "JSON"` resolves to `sap/ui/model/json/JSONModel`.
 */
private string getEffectiveInternalModelType(JsonObject model) {
  result = ui5TypeNameToModulePath(model.getPropStringValue("type")) and
  result = getInternalModelType(_)
  or
  not exists(model.getPropStringValue("type")) and
  result = getInternalModelType("UI5" + getReferencedDataSource(model).getType() + "DataModel")
}

/**
 * A JSON or XML client data model declared in `sap.ui5/models`.
 *
 * This covers both `{ "type": "sap.ui.model.json.JSONModel" }` and
 * `{ "dataSource": "modelData" }` when `modelData` is a JSON data source.
 */
class InternalModelManifest extends ModelManifest {
  string modelName;
  string type;

  InternalModelManifest() {
    this = getManifestModelDefinition(modelName) and
    type = getEffectiveInternalModelType(this)
  }

  string getName() { result = modelName }

  string getType() { result = type }
}

/**
 * A resource model declaration such as
 * `{ "i18n": { "type": "sap.ui.model.resource.ResourceModel" } }`.
 */
class ResourceModelManifest extends ModelManifest {
  string modelName;
  string type;

  ResourceModelManifest() {
    this = getManifestModelDefinition(modelName) and
    type = this.getPropStringValue("type") and
    type = "sap.ui.model.resource.ResourceModel"
  }

  string getName() { result = modelName }

  string getType() { result = type }
}

/**
 * The definition of an external model in the `manifest.json`, in the `"models"` property.
 *
 * For example, `{ "": { "dataSource": "mainService" } }`.
 */
class ExternalModelManifest extends ModelManifest {
  string modelName;
  string dataSourceName;

  ExternalModelManifest() {
    this = getManifestModelDefinition(modelName) and
    dataSourceName = this.getPropStringValue("dataSource") and
    exists(DataSourceManifest dataSource |
      dataSource.getName() = dataSourceName and
      dataSource.getParentManifestJson() = this.getJsonFile()
    )
  }

  string getName() { result = modelName }

  string getDataSourceName() { result = dataSourceName }

  /** Gets the data source for this external model from the same manifest file. */
  DataSourceManifest getDataSource() {
    result.getName() = dataSourceName and
    result.getParentManifestJson() = this.getJsonFile()
  }
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
 * When given a constructor call `new JSONModel("controller/model.json")`, gets the content of the
 * file referred to by the URI in the string argument.
 */
bindingset[path]
JsonObject resolveDirectPath(string path) {
  exists(WebApp webApp | result.getJsonFile() = webApp.getResource(path))
}

/**
 * When given `new JSONModel(sap.ui.require.toUrl("sap/ui/demo/mock/products.json"))`, gets the
 * content of the file referred to by the resolved argument.
 */
bindingset[path]
private JsonObject resolveIndirectPath(string path) {
  result = any(JsonObject tODO | tODO.getFile().getAbsolutePath() = path)
}

/**
 * The default `JSONModel` automatically created from the application manifest.
 *
 * For example, `{ "models": { "": { "type": "sap.ui.model.json.JSONModel" } } }`.
 *
 * The MaD-modeled component call serves as this model's data-flow node. UI5 creates and attaches
 * the manifest-declared model during component initialization, so application code has no
 * corresponding `JSONModel` constructor call.
 */
class DefaultManifestJsonModel extends UI5InternalModel {
  DefaultManifestJsonModel() {
    this.(Component).getInternalModelDef("").getType() = "sap/ui/model/json/JSONModel"
  }

  private ModelReference getAReference() {
    result.isDefaultModelReference() and
    not exists(result.getAMatchingSetModelCall()) and
    (
      result = this.(Component).getAThisNode().getAMemberCall("getModel")
      or
      inSameUI5Component(result.getFile(), this.(Component).getParentManifestJson())
    )
  }

  private MethodCallNode getASetDefaultBindingModeCall() {
    result = this.getAReference().getAMemberCall("setDefaultBindingMode")
  }

  /**
   * Holds unless the application changes the model to another binding mode.
   */
  predicate isTwoWayBinding() {
    isTwoWayBindingMode(this.getASetDefaultBindingModeCall().getArgument(0))
    or
    not exists(this.getASetDefaultBindingModeCall())
  }

  override string getPathString() { none() }

  override string getPathString(Property property) { none() }

  override predicate contentIsStaticallyVisible() { none() }
}

/**
 * A client-side JSON model, for example `new JSONModel({ input: "" })`.
 */
class JsonModel extends UI5InternalModel {
  JsonModel() {
    this instanceof NewNode and
    (
      exists(RequiredObject jsonModel |
        jsonModel.asSourceNode().flowsTo(this.getCalleeNode()) and
        jsonModel.getDependency() = "sap/ui/model/json/JSONModel"
      )
      or
      this.getCalleeName() = "JSONModel"
    )
  }

  private JsonObject getAConstructorJsonObject() {
    result = resolveDirectPath(this.getAnArgument().asExpr().(StringLiteral).getValue())
    or
    result =
      resolveIndirectPath(this.getAnArgument()
            .(MethodCallNode)
            .getAnArgument()
            .asExpr()
            .(StringLiteral)
            .getValue())
  }

  override string getPathString() {
    result = constructPathStringJson(this.getAConstructorJsonObject())
    or
    exists(ObjectLiteralNode objectNode |
      objectNode.flowsTo(this.getAnArgument()) and constructPathString(objectNode) = result
    )
  }

  override string getPathString(Property property) {
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

  override predicate contentIsStaticallyVisible() {
    exists(this.getPathString())
    or
    exists(JsonObject jsonObject |
      jsonObject = resolveDirectPath(this.getArgument(0).getStringValue())
    )
  }

  private MethodCallNode getASetDefaultBindingModeCall() {
    this.flowsTo(result.getReceiver()) and result.getMethodName() = "setDefaultBindingMode"
  }

  predicate isOneWayBinding() {
    isOneWayBindingMode(this.getASetDefaultBindingModeCall().getArgument(0))
  }

  predicate isTwoWayBinding() {
    isTwoWayBindingMode(this.getASetDefaultBindingModeCall().getArgument(0))
    or
    not exists(this.getASetDefaultBindingModeCall())
  }

  /**
   * Gets a property of this `JsonModel`.
   */
  DataFlow::PropWrite getAProperty() {
    this.getArgument(0).getALocalSource().asExpr() = result.getPropertyNameExpr().getParent+()
  }
}

/**
 * A client-side XML model, for example `new XMLModel("<root/>")`.
 */
class XmlModel extends UI5InternalModel {
  XmlModel() {
    this instanceof NewNode and
    exists(RequiredObject xmlModel |
      xmlModel.asSourceNode().flowsTo(this.getCalleeNode()) and
      xmlModel.getDependency() = "sap/ui/model/xml/XMLModel"
    )
  }

  override string getPathString(Property property) { result = property.toString() }

  override string getPathString() { result = "TODO" }

  override predicate contentIsStaticallyVisible() { exists(this.getPathString()) }
}

/**
 * A reference to a manifest-declared resource model, for example
 * `this.getOwnerComponent().getModel("i18n")`.
 */
class ResourceModel extends UI5Model, ModelReference {
  string modelName;

  ResourceModel() {
    exists(CustomController controller, ResourceModelManifest manifest |
      (
        this = controller.getAThisNode().getAMemberCall("getModel")
        or
        this = controller.getOwnerComponentRef().getAMemberCall("getModel")
      ) and
      modelName = this.getModelName() and
      manifest.getName() = modelName
    )
  }

  override MethodCallNode getARead() { result = ModelReference.super.getARead() }

  MethodCallNode getResourceBundle() { result = this.getAMemberCall("getResourceBundle") }
}

/**
 * The imported `sap/ui/model/BindingMode` object used in calls such as
 * `model.setDefaultBindingMode(BindingMode.OneWay)`.
 */
class BindingMode extends RequiredObject {
  BindingMode() { this.getDependency() = "sap/ui/model/BindingMode" }

  PropRead getOneWay() { result = this.asSourceNode().getAPropertyRead("OneWay") }

  PropRead getTwoWay() { result = this.asSourceNode().getAPropertyRead("TwoWay") }

  PropRead getDefault_() { result = this.asSourceNode().getAPropertyRead("Default") }

  PropRead getOneTime() { result = this.asSourceNode().getAPropertyRead("OneTime") }
}

private predicate isOneWayBindingMode(DataFlow::Node argument) {
  argument.getALocalSource().getStringValue() = "OneWay"
  or
  exists(BindingMode bindingMode | bindingMode.getOneWay().flowsTo(argument))
}

private predicate isTwoWayBindingMode(DataFlow::Node argument) {
  argument.getALocalSource().getStringValue() = "TwoWay"
  or
  exists(BindingMode bindingMode | bindingMode.getTwoWay().flowsTo(argument))
}

/**
 * A UI5 model whose content comes from a server-side service, for example an OData model returned
 * by `this.getOwnerComponent().getModel("main")`.
 */
abstract class UI5ExternalModel extends UI5Model, RemoteFlowSource {
  abstract string getName();
}

/**
 * The default OData model used by a call such as `this.getView().bindElement("/")`.
 */
class DefaultODataServiceModel extends UI5ExternalModel {
  DefaultODataServiceModel() {
    exists(ExternalModelManifest model |
      model.getName() = "" and
      model.getDataSource() instanceof ODataDataSourceManifest and
      this.getCalleeName() = "bindElement" and
      inSameWebApp(this.getFile(), model.getJsonFile())
    )
  }

  override string getSourceType() { result = "DefaultODataServiceModel" }

  override string getName() { result = "" }

  Binding asBinding() { result.getBindElementCall() = this }
}

/**
 * A named or explicitly constructed OData model, for example
 * `this.getOwnerComponent().getModel("main")` or `new ODataModel("/service")`.
 */
class ODataServiceModel extends UI5ExternalModel {
  string modelName;

  override string getSourceType() { result = "ODataServiceModel" }

  ODataServiceModel() {
    exists(CustomController controller |
      this.getCalleeName() = "getModel" and
      modelName = this.getArgument(0).getALocalSource().getStringValue() and
      controller.getOwnerComponent().getExternalModelDef(modelName).getDataSource() instanceof
        ODataDataSourceManifest
    )
    or
    this instanceof NewNode and
    exists(RequiredObject oDataModel |
      oDataModel.asSourceNode().flowsTo(this.getCalleeNode()) and
      oDataModel.getDependency() in [
          "sap/ui/model/odata/v2/ODataModel", "sap/ui/model/odata/v4/ODataModel"
        ]
    ) and
    modelName = "<no name>"
  }

  override string getName() { result = modelName }
}

/**
 * Gets the model attached to the control, view, component, or fragment that owns `bindingPath`.
 */
UI5Model resolveModel(UI5BindingPath bindingPath) {
  result.flowsTo(getNearestSetModelCall(bindingPath).getArgument(0))
  or
  result = getDefaultODataModel(bindingPath)
  or
  result = getDefaultManifestJsonModel(bindingPath)
}

private predicate modelNameMatchesBindingPath(
  MethodCallNode setModelCall, UI5BindingPath bindingPath
) {
  if exists(bindingPath.getModelName())
  then
    setModelCall.getArgument(1).getALocalSource().asExpr().(StringLiteral).getValue() =
      bindingPath.getModelName()
  else not exists(setModelCall.getArgument(1))
}

private MethodCallNode getControlSetModelCall(UI5BindingPath bindingPath, UI5Control control) {
  exists(ControlReference reference |
    reference = control.getAReference() and
    controlReferenceBelongsToBindingView(reference, bindingPath) and
    reference.flowsTo(result.getReceiver())
  ) and
  result.getMethodName() = "setModel" and
  modelNameMatchesBindingPath(result, bindingPath)
}

private predicate controlIsStrictDescendant(UI5Control descendant, UI5Control ancestor) {
  descendant.asXmlControl().getParent+() = ancestor.asXmlControl()
  or
  descendant.asJsonControl().getParent+() = ancestor.asJsonControl()
}

private MethodCallNode getControlSetModelCall(UI5BindingPath bindingPath) {
  exists(UI5Control control |
    control = getAControlInBindingHierarchy(bindingPath) and
    result = getControlSetModelCall(bindingPath, control) and
    not exists(UI5Control closer |
      closer = getAControlInBindingHierarchy(bindingPath) and
      controlIsStrictDescendant(closer, control) and
      exists(getControlSetModelCall(bindingPath, closer))
    )
  )
}

private MethodCallNode getViewSetModelCall(UI5BindingPath bindingPath) {
  result.getMethodName() = "setModel" and
  bindingPath.getView().getController().getAViewReference().flowsTo(result.getReceiver()) and
  modelNameMatchesBindingPath(result, bindingPath)
}

private MethodCallNode getComponentSetModelCall(UI5BindingPath bindingPath) {
  (
    result =
      bindingPath
          .getView()
          .getController()
          .getOwnerComponentRef()
          .getALocalSource()
          .getAMemberCall("setModel")
    or
    exists(Component component |
      inSameUI5Component(bindingPath.getLocation().getFile(), component.getParentManifestJson()) and
      result = component.getAThisNode().getALocalSource().getAMemberCall("setModel")
    )
  ) and
  modelNameMatchesBindingPath(result, bindingPath)
}

private MethodCallNode getNearestSetModelCall(UI5BindingPath bindingPath) {
  result = getControlSetModelCall(bindingPath)
  or
  result = getViewSetModelCall(bindingPath) and
  not exists(getControlSetModelCall(bindingPath))
  or
  result = getComponentSetModelCall(bindingPath) and
  not exists(getControlSetModelCall(bindingPath)) and
  not exists(getViewSetModelCall(bindingPath))
}

/**
 * Gets the data-flow node that represents the model content selected by `bindingPath`.
 */
DataFlow::Node getModelNode(UI5BindingPath bindingPath) {
  exists(Property p, JsonModel model |
    model = bindingPath.getModel() and
    result.(DataFlow::PropWrite).getPropertyNameExpr() = p.getNameExpr() and
    bindingPath.getAbsolutePath() = model.getPathString(p) and
    inSameWebApp(bindingPath.getLocation().getFile(), result.getFile())
  )
  or
  exists(string propName, JsonModel model |
    model = bindingPath.getModel() and
    result = model.getArgument(0).getALocalSource() and
    bindingPath.getPath() = model.getPathStringPropName(propName) and
    exists(JsonObject obj, JsonValue val | val = obj.getPropValue(propName)) and
    inSameWebApp(bindingPath.getLocation().getFile(), result.getFile())
  )
  or
  result = getNonStaticJsonModelNode(bindingPath)
  or
  exists(ManifestJsonModelContentNode content |
    content.getModel() = bindingPath.getModel() and
    content.getAbsolutePath() = bindingPath.getAbsolutePath() and
    result = content
  )
  or
  result = getExternalModelNode(bindingPath)
}

/**
 * A binding target backed by a manifest-created JSON model, for example `value="{/input}"` in an
 * XML view or `"value": "{/input}"` in a JSON view.
 */
private class ManifestJsonModelBindingNode extends ManifestJsonModelContentNode {
  DefaultManifestJsonModel model;
  string absolutePath;

  ManifestJsonModelBindingNode() {
    exists(UI5BindingPath bindingPath |
      model = bindingPath.getModel() and
      absolutePath = bindingPath.getAbsolutePath() and
      (
        this.(DataFlow::XmlAttributeNode).getAttribute() =
          bindingPath.getBinding().getBindingTarget().asXmlAttribute()
        or
        this = bindingPath.getBinding().getBindingTarget().asDataFlowNode()
      )
    )
  }

  override DefaultManifestJsonModel getModel() { result = model }

  override string getAbsolutePath() { result = absolutePath }
}

private DefaultManifestJsonModel getDefaultManifestJsonModel(UI5BindingPath bindingPath) {
  not exists(bindingPath.getModelName()) and
  inSameUI5Component(bindingPath.getLocation().getFile(), result.(Component).getParentManifestJson()) and
  not hasDefaultModelOverride(bindingPath)
}

private predicate hasDefaultModelOverride(UI5BindingPath bindingPath) {
  exists(MethodCallNode setModelCall |
    setModelCall =
      [
        getAControlReferenceInOwningController(bindingPath).getALocalSource(),
        bindingPath.getView().getController().getAViewReference().getALocalSource(),
        bindingPath.getView().getController().getOwnerComponentRef().getALocalSource(),
        any(Component component |
          inSameUI5Component(bindingPath.getLocation().getFile(), component.getParentManifestJson())
        ).getAThisNode().getALocalSource()
      ].getAMemberCall("setModel") and
    setModelCall.getNumArgument() = 1
  )
}

private ControlReference getAControlReferenceInOwningController(UI5BindingPath bindingPath) {
  result = getAControlInBindingHierarchy(bindingPath).getAReference() and
  result.getFile() = bindingPath.getView().getController().getFile()
}

private UI5Control getAControlInBindingHierarchy(UI5BindingPath bindingPath) {
  result.asXmlControl() = bindingPath.getControlDeclaration().asXmlControl().getParent*()
  or
  result.asJsonControl() = bindingPath.getControlDeclaration().asJsonControl().getParent*()
}

pragma[nomagic]
private DefaultODataServiceModel getDefaultODataModel(UI5BindingPath bindingPath) {
  bindingPath.getLocation().getFile().getBaseName().matches("%.fragment.xml") and
  not exists(MethodCallNode viewSetModelCall |
    viewSetModelCall.getMethodName() = "setModel" and
    inSameWebApp(bindingPath.getLocation().getFile(), viewSetModelCall.getFile())
  ) and
  exists(FragmentLoad load |
    load.getCallbackObjectReference().flowsTo(result.asBinding().asDataFlowNode()) and
    load.getNameArgument()
        .getStringValue()
        .matches("%" +
            bindingPath.getLocation().getFile().getBaseName().replaceAll(".fragment.xml", "") + "%") and
    inSameWebApp(bindingPath.getLocation().getFile(), load.getFile())
  )
}

pragma[nomagic]
private JsonModel getNonStaticJsonModelNode(UI5BindingPath bindingPath) {
  not result.contentIsStaticallyVisible() and
  result = bindingPath.getModel()
}

pragma[nomagic]
private UI5ExternalModel getExternalModelNode(UI5BindingPath bindingPath) {
  result = bindingPath.getModel() and
  inSameWebApp(bindingPath.getLocation().getFile(), result.getFile())
}
