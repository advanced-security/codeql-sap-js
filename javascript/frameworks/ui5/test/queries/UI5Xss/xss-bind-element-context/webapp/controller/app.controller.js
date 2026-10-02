sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
  "use strict";

  return Controller.extend("codeql.sap.bindcontext.controller.app", {
    onInit: function () {
      this.byId("customerDetails").bindElement("/customer");
      this.byId("otherDetails").bindElement("/other");
    }
  });
});
