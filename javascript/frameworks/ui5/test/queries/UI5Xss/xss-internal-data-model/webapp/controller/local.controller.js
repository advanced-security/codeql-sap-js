sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/BindingMode",
    "sap/ui/model/json/JSONModel"
  ],
  function (Controller, BindingMode, JSONModel) {
    "use strict";

    return Controller.extend("codeql-sap-js.controller.local", {
      onInit: function () {
        this.getView().setModel(new JSONModel({}));
        // This changes only the view-local model, not the component's manifest model.
        this.getView().getModel().setDefaultBindingMode(BindingMode.OneWay);
      }
    });
  }
);
