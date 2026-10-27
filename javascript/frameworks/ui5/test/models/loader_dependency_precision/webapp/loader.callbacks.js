function onRequired(Element) {
  Element.getElementById("requireNamedTarget").$().html("require-named-success");
}

function onError(error) {
  throw error;
}

sap.ui.require(["sap/ui/core/Element"], onRequired, onError);

var requireFactory = function (Element) {
  Element.getElementById("requireAliasTarget").$().html("require-aliased-success");
};
var requireAlias = requireFactory;

sap.ui.require(["sap/ui/core/Element"], requireAlias, onError);

function onDefined(Element) {
  Element.getElementById("defineAliasTarget").$().html("define-aliased-success");
  return Element;
}
var defineAlias = onDefined;

sap.ui.define(["sap/ui/core/Element"], defineAlias, true);
