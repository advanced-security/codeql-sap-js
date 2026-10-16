/**
 * Provides synthesized data-flow nodes for property bindings in UI5 JSON views, such as
 * `"value": "{/input}"`.
 *
 * The local overlay lets the module extend the local data-flow graph without making global
 * API-graph entities depend on these query-local synthesized nodes.
 */
overlay[local?]
module;

import javascript
private import semmle.javascript.dataflow.internal.AdditionalFlowInternal as AdditionalFlowInternal
private import semmle.javascript.dataflow.internal.DataFlowPrivate as DataFlowPrivate

private predicate isUI5JsonBindingTarget(JsonObject bindingTarget, string propertyName) {
  (
    bindingTarget.getPropStringValue(propertyName).matches("{%}")
    or
    exists(JsonObject bindingInfo |
      bindingInfo = bindingTarget.getPropValue(propertyName) and
      exists(bindingInfo.getPropStringValue("path"))
    )
  ) and
  exists(JsonObject root |
    root.isTopLevel() and
    root.getPropStringValue("Type") = "sap.ui.core.mvc.JSONView" and
    root = bindingTarget.getParent*()
  )
}

string getJsonBindingLiteral(JsonObject bindingTarget, string propertyName) {
  result = bindingTarget.getPropStringValue(propertyName)
  or
  exists(JsonObject bindingInfo, string path, string effectivePath |
    bindingInfo = bindingTarget.getPropValue(propertyName) and
    path = bindingInfo.getPropStringValue("path") and
    (
      path.matches("{%}") and
      effectivePath = path.regexpCapture("\\{(.*)\\}", 1)
      or
      not path.matches("{%}") and
      effectivePath = path
    )
  |
    if
      exists(string model |
        model = bindingInfo.getPropStringValue("model") and
        model != ""
      )
    then result = "{" + bindingInfo.getPropStringValue("model") + ">" + effectivePath + "}"
    else result = "{" + effectivePath + "}"
  )
}

private File getNearestManifest(File file) {
  result.getBaseName() = "manifest.json" and
  result.getParentContainer().getAChildContainer*().getAFile() = file and
  forall(File enclosingManifest |
    enclosingManifest.getBaseName() = "manifest.json" and
    enclosingManifest.getParentContainer().getAChildContainer*().getAFile() = file
  |
    result.getAbsolutePath().length() >= enclosingManifest.getAbsolutePath().length()
  )
}

private StringLiteral getManifestComponentAnchor(File manifest) {
  exists(Property manifestProperty |
    manifestProperty.getName() = "manifest" and
    result = manifestProperty.getInit() and
    result.getValue() = "json" and
    result.getFile().getBaseName() = "Component.js" and
    result.getFile().getParentContainer() = manifest.getParentContainer()
  )
}

private string getJsonBindingTargetNodeTag(JsonObject bindingTarget, string propertyName) {
  exists(Location location | location = bindingTarget.getPropValue(propertyName).getLocation() |
    result =
      "ui5-json-binding:" + location.getFile().getAbsolutePath() + ":" +
        location.getStartLine().toString() + ":" + location.getStartColumn().toString()
  )
}

private class JsonBindingTargetNodeSynthesizer extends AdditionalFlowInternal::AdditionalFlowInternal
{
  override predicate needsSynthesizedNode(
    AstNode node, string tag, DataFlowPrivate::DataFlowCallable container
  ) {
    exists(JsonObject bindingTarget, string propertyName |
      isUI5JsonBindingTarget(bindingTarget, propertyName) and
      node = getManifestComponentAnchor(getNearestManifest(bindingTarget.getJsonFile())) and
      tag = getJsonBindingTargetNodeTag(bindingTarget, propertyName) and
      container.asSourceCallable() = node.getContainer()
    )
  }
}

/**
 * A data-flow node for a property binding in a UI5 JSON view.
 *
 * For example, this represents the `value` property in:
 * ```json
 * { "Type": "sap.m.Input", "value": "{/input}" }
 * ```
 */
class JsonBindingTargetNode extends DataFlowPrivate::GenericSynthesizedNode {
  JsonObject bindingTarget;
  string propertyName;

  JsonBindingTargetNode() {
    isUI5JsonBindingTarget(bindingTarget, propertyName) and
    this =
      AdditionalFlowInternal::getSynthesizedNode(getManifestComponentAnchor(getNearestManifest(bindingTarget
                .getJsonFile())), getJsonBindingTargetNodeTag(bindingTarget, propertyName))
  }

  JsonObject getBindingTarget() { result = bindingTarget }

  string getPropertyName() { result = propertyName }

  override Location getLocation() {
    result = bindingTarget.getPropValue(propertyName).getLocation()
  }

  override File getFile() { result = bindingTarget.getJsonFile() }

  override string toString() {
    result =
      "\"" + propertyName + "\": \"" + getJsonBindingLiteral(bindingTarget, propertyName) + "\""
  }
}
