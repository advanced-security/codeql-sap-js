sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
    "use strict";
    return Controller.extend("codeql-sap-js.controller.app", {
        onInit: function () {
            var oData = {
                input: null,
                output: null,
            };
            var oModel = new JSONModel(oData);
            this.getView().setModel(oModel);
            
            // enable sanitization programmatically
            //this.getView().setProperty("sanitizeContent", true);
            this.getView().byId("htmlControl").setProperty("sanitizeContent", true);
            this.getView().byId("htmlControl").sanitizeContent = true;

            var input = oModel.getProperty('/input');
            oModel.setProperty('/output', input);
        }
    });
}
);
