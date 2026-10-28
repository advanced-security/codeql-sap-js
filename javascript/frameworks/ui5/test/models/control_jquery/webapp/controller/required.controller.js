sap.ui.require([
  "sap/ui/core/mvc/Controller",
  "sap/ui/core/Element",
  "sap/ui/core/Fragment"
], function (Controller, Element, Fragment) {
  "use strict";

  Controller.extend("codeql.sap.jquery.controller.required", {
    onAfterRendering: function () {
      this.byId("target").$().html("require-control");
      this.getView().$().html("require-view");
      Element.getElementById("target").$().html("require-element");
      Fragment.byId("fragment", "target").$().html("require-fragment");
    }
  });
});
