sap.ui.define([
    "sap/ui/core/mvc/XMLView"
], function (XMLView) {
    "use strict";
    XMLView.create({
        viewName: "codeql-sap-js.view.app"
    }).then(function (oView) {
        oView.placeAt("content");
    });

}); 