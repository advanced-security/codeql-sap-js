sap.ui.define(
  ["sap/ui/core/Fragment", "sap/ui/core/mvc/Controller", "sap/ui/model/json/JSONModel"],
  function (Fragment, Controller, JSONModel) {
    "use strict";

    return Controller.extend("codeql.sap.bindcontext.controller.app", {
      onInit: function () {
        this.byId("customerDetails").bindElement("/customer");
        this.byId("relativeDetails").bindElement("other");
        this.byId("trailingSlashDetails").bindElement("/customer/");
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
        this.byId("localModelDetails").setModel(
          new JSONModel({
            customer: {
              name: ""
            }
          })
        );
      },
      testGlobalReferenceLookups: function () {
        sap.ui.getCore().byId("globalReferenceSink").bindElement("/customer");
        Fragment.byId("app", "globalReferenceSink").bindElement("/customer");
      }
    });
  }
);
