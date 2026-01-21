sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/HTML"
], function (Controller, JSONModel, HTML) {
    "use strict";
    return Controller.extend("codeql-sap-js.controller.app", {
        onInit: function () {
            var oData = {
                input: null,
                output: null,
            };
            var oModel = new JSONModel(oData);
            this.getView().setModel(oModel);

            jQuery.sap.globalEval(oModel.getProperty('/input')); // UNSAFE: evaluating user input

            var sanitizer = new HTML();
            sanitizer.setSanitizeContent(true);
            sanitizer.setContent(oModel.getProperty('/input')); // SAFE: content is sanitized before eval
            jQuery.sap.globalEval(sanitizer.getContent()); // SAFE: content is sanitized before eval

            let htmlSanitized = this.getView().byId("htmlSanitized");
            jQuery.sap.globalEval(htmlSanitized.getContent()); // SAFE: content is sanitized declaratively in the view
        }
    });
}
);
