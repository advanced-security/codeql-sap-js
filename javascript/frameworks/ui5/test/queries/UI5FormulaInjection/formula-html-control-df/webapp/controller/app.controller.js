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
            
            var input = oModel.getProperty('/input');

            sap.ui.core.util.File.put("someKey", input); // Path injection sink, data is not sanitized.
        }
    });
}
);
