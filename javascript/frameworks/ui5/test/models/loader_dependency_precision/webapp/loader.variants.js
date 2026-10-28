sap.ui.require(["sap/ui/core/Element", "example/Store"], function (Element, Store) {
  Element.getElementById("target").$().html("require-success");
  Store.getElementById("target").$().html("unrelated-success-dependency");
}, function (error) {
  error.getElementById("target").$().html("require-error");
});

sap.ui.define(["example/Store", "sap/ui/core/Fragment"], function (Store, Fragment) {
  Fragment.byId("view", "target").$().html("anonymous-export-flag");
  Store.byId("view", "target").$().html("unrelated-anonymous-dependency");
}, true);

sap.ui.define("codeql.sap.named", ["example/Store", "sap/ui/core/Element"], function (Store, Element) {
  Element.closestTo("#target").$().html("named-export-flag");
  Store.closestTo("#target").$().html("unrelated-named-dependency");
}, true);

other.ui.define(["sap/ui/core/Element"], function (Element) {
  Element.getElementById("target").$().html("unrelated-loader");
});
