sap.ui.define(
  ["sap/ui/base/Object", "sap/base/Log"],
  function (BaseObject, Log) {
    "use strict";
    return BaseObject.extend("codeql-sap-js.log.CustomLogListener", {
      onLogEntry: function (oEvent) {
        const http = new XMLHttpRequest();
        const url = "https://some.remote.server/location";
        http.open("POST", url);
        http.send(oEvent.message); // js/ui5-log-injection-to-http
      },
    });
  },
);
