sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
  "use strict";

  return Controller.extend("codeql.sap.bindcontext.json.controller.app", {
    onInit: function () {
      this.byId("jsonCustomerDetails").bindElement("/customer");
      this.byId("jsonOtherDetails").bindElement("/other");
    }
  });
});
