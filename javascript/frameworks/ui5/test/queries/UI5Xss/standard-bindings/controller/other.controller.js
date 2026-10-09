sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
  "use strict";

  return Controller.extend("codeql.sap.standard.controller.other", {
    onInit: function () {
      this.byId("htmlOutput").setSanitizeContent(true);
    }
  });
});
