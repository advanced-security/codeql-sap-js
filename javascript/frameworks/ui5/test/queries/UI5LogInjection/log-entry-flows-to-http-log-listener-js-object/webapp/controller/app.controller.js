sap.ui.define(
  ["sap/ui/core/mvc/Controller", "sap/ui/model/json/JSONModel", "sap/base/Log"],
  function (Controller, JSONModel, Log) {
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
        Log.addLogListener({
          onLogEntry: function (oLogEntry) {
            const http = new XMLHttpRequest();
            const url = "https://some.remote.server/location";
            http.open("POST", url);
            http.send(oLogEntry.message); // js/ui5-log-injection-to-http
          },
        });
      },
    });
  },
);
