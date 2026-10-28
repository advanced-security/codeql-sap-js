sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
  "use strict";

  return Controller.extend("codeql-sap-js.controller.other", {
    copyValue: function () {
      var value = this.byId("input").getValue();
      this.byId("htmlOutput").setContent(value);
      this.byId("boundHtmlOutput").setSanitizeContent(true);
    }
  });
});
