sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
    "use strict"
    return Controller.extend("codeql-sap-js.controller.app", {
        onInit: function () {
            var oData = {
                input0: null,
                input1: null,
                input2: null,
                input3: null,
                input4: null
            };
            var oModel = new JSONModel(oData);
            this.getView().setModel(oModel);
            
            // enable sanitization programmatically
            this.getView().byId("htmlJsSanitized2").setProperty("sanitizeContent", true);

            // setting the property directly is not sufficient
            this.getView().byId("htmlJsSanitized3").sanitizeContent = true;

            // disable sanitization programmatically
            this.getView().byId("htmUnsanitized").setProperty("sanitizeContent", false);
        }
    });
})