sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/xml/XMLModel",
  "sap/ui/model/BindingMode"
], function (Controller, XMLModel, BindingMode) {
  "use strict";

  return Controller.extend("codeql.sap.xmlflow.controller.app", {
    onInit: function () {
      const Alias = XMLModel;
      const GlobalAlias = sap.ui.model.xml.XMLModel;
      const imported = new XMLModel("model/data.xml");
      const aliased = new Alias("model/data.xml");
      const global = new sap.ui.model.xml.XMLModel("model/data.xml");
      const globalAliased = new GlobalAlias("model/data.xml");
      const oneWay = new XMLModel("model/data.xml");
      const oneTime = new XMLModel("model/data.xml");
      const twoWay = new XMLModel("model/data.xml");
      const write = new XMLModel("model/data.xml");

      oneWay.setDefaultBindingMode(BindingMode.OneWay);
      oneTime.setDefaultBindingMode("OneTime");
      twoWay.setDefaultBindingMode(BindingMode.TwoWay);
      write.setDefaultBindingMode("OneWay");

      this.getView().setModel(imported, "imported");
      this.getView().setModel(aliased, "aliased");
      this.getView().setModel(global, "global");
      this.getView().setModel(globalAliased, "globalAliased");
      this.getView().setModel(oneWay, "oneWay");
      this.getView().setModel(oneTime, "oneTime");
      this.getView().setModel(twoWay, "twoWay");
      this.getView().setModel(write, "write");
      this.byId("context").bindElement("/profile");
    },

    onEdit: function (event) {
      this.getView().getModel("write").setProperty("/written", event.getSource().getValue());
      this.byId("apiOutput").$().html(this.getView().getModel("write").getProperty("/written"));
      this.byId("apiOutput").$().html(this.getView().getModel("write").getProperty("/other"));
    }
  });
});
