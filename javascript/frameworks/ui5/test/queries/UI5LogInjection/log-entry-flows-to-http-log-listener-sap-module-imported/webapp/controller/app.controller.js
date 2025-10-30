sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/base/Log",
    "codeql-sap-js/log/CustomLogListener",
  ],
  function (Controller, JSONModel, Log, CustomLogListener) {
    "use strict";
    return Controller.extend("codeql-sap-js.controller.app", {
      onInit: function () {
        var oData = {
          input: null,
          output: null,
        };
        var oModel = new JSONModel(oData);
        this.getView().setModel(oModel);

        var input = oModel.getProperty("/input");

        /* 1. Log the remote input. */
        Log.debug(input); //
        /* 2. Create a JS object that implements Log.Listener on-the-fly. */
        Log.addLogListener(CustomLogListener);
      },
    });
  },
);
