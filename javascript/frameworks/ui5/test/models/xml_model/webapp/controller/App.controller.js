sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/xml/XMLModel",
  "sap/ui/model/json/JSONModel"
], function (Controller, XMLModel, JSONModel) {
  function UnrelatedModel() {}

  return Controller.extend("coverage.xml.controller.App", {
    onInit: function () {
      const XmlAlias = XMLModel;
      const direct = new XMLModel("<root><value>direct</value></root>");
      const aliased = new XmlAlias("<root><value>alias</value></root>");
      const json = new JSONModel({ value: "json" });
      const unrelated = new UnrelatedModel();
      this.getView().setModel(direct, "direct");
      this.getView().setModel(aliased, "aliased");
      this.getView().setModel(json, "json");
      this.getView().setModel(unrelated, "unrelated");
    }
  });
});
