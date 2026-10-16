sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
    "use strict";
    return Controller.extend("codeql-sap-js.controller.app", {
        doSomething1: function () {
            var oModel = this.getView().getModel();
            var input = oModel.getProperty('/input');
            oModel.setProperty('/output1', input);
        },
        doSomething2: function (modelProperty) {
            var oModel = this.getView().getModel();
            oModel.setProperty('/output2', modelProperty);
        },
        doSomething3: function (oEvent) {
            var oModel = this.getView().getModel();
            var sInputValue = oEvent.getSource().getValue(); // User input source sap.m.Input#getValue
            oModel.setProperty('/output3', sInputValue);
        },
        doSomething4: function () {
            var oView = this.getView();
            var oInput = oView.byId("input");
            var oHtmlOutput = oView.byId("htmlOutput");

            var value = oInput.getValue() // User input source sap.m.Input#getValue
            oHtmlOutput.setContent(value) // XSS sink sap.ui.core.HTML#setContent
        },
        onInit: function () {
            var oData = {
                input: null,
                output1: null,
                output2: null,
                output3: null
            };
            var oModel = new JSONModel(oData);
            this.getView().setModel(oModel);
        }
    });
}
);
