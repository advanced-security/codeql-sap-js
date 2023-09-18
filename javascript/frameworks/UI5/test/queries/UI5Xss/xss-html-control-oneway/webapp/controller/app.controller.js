sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/BindingMode",
  ],
  function (Controller, JSONModel, BindingMode) {
    "use strict";
    return Controller.extend("codeql-sap-js.controller.app", {
      onInit: function () {
        var oData = {
          input: null,
        };
        var oModel = new JSONModel(oData);
        oModel.setDefaultBindingMode(BindingMode.OneWay);
        this.getView().setModel(oModel);
      },
    });
  }
);
