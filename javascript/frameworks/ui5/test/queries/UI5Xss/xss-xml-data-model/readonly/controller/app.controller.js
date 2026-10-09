sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
  "use strict";
  return Controller.extend("codeql.sap.xmlreadonly.controller.app", {
    onInit: function () {
      this.getView().getModel().setDefaultBindingMode("OneWay");
    }
  });
});
