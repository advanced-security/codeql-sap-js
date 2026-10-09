sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/xml/XMLModel"
], function (Controller, XMLModel) {
  "use strict";

  return Controller.extend("codeql.sap.xmlread.controller.app", {
    onInit: function () {
      const model = new XMLModel("model/data.xml");
      this.getView().setModel(model);
    },
    onRead: function () {
      const model = this.getView().getModel();
      const output = this.byId("output").$();

      output.html(model.getProperty("/element"));
      output.html(model.getProperty("/element/text()"));
      output.html(model.getProperty("/item/@note"));
      output.html(model.getObject("/item/@note"));
      output.html(model.getObject("/element/text()"));

      output.html(model.getObject("/element"));
      output.html(model.getObject("/"));
      output.html(model.getObject("/item"));
      output.html(model.getProperty("/other"));
      output.html(model.getObject("/other/text()"));
      output.html(model.getObject("/item/@other"));
    }
  });
});
