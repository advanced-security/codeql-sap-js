sap.ui.define([
  "example/Store",
  "example/Fragment",
  "example/Controller"
], function (Store, Fragment, Controller) {
  "use strict";

  Store.getElementById("item").$().html("unrelated-element");
  Store.closestTo("#item").$().html("unrelated-closest");
  Fragment.byId("group", "item").$().html("unrelated-fragment");

  return Controller.extend("example.controller.app", {
    run: function () {
      this.byId("item").$().html("unrelated-controller");
      this.getView().byId("item").$().html("unrelated-view");
    }
  });
});

sap.ui.require(["example/Store"], function (Store) {
  Store.getElementById("item").$().html("unrelated-required-element");
});
