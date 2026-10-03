sap.ui.define(["sap/ui/core/Fragment", "sap/ui/core/mvc/Controller"], function (Fragment, Controller) {
  "use strict";

  return Controller.extend("codeql.sap.bindcontext.controller.app", {
    onInit: function () {
      this.byId("customerDetails").bindElement("/customer");
      this.byId("legacyDetails").bindElement("/customer", {});
      this.byId("objectDetails").bindElement({
        path: "/customer",
        parameters: {}
      });
      this.byId("namedObjectDetails").bindElement({
        path: "/customer",
        model: "named"
      });
      this.byId("namedPathDetails").bindElement("named>/customer");
      this.byId("otherDetails").bindElement("/other");
    },
    testGlobalReferenceLookups: function () {
      sap.ui.getCore().byId("globalReferenceSink").bindElement("/customer");
      Fragment.byId("app", "globalReferenceSink").bindElement("/customer");
    }
  });
});
