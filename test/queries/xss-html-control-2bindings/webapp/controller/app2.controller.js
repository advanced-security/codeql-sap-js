sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
    "use strict"
    return Controller.extend("codeql-sap-js.controller.app2", {
        onInit: function () {
            var oData = {
                input: null
            };
            var oModel = new JSONModel(oData);
            this.getView().setModel(oModel);
        }
    });
})