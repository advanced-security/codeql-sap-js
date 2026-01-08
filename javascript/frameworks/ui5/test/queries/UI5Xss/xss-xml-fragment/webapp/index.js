sap.ui.define([
    "sap/ui/core/mvc/HTMLView"
], function (HTMLView) {
    "use strict";
    HTMLView.create({
        viewName: "codeql-sap-js.view.app"
    }).then(function (oView) {
        oView.placeAt("content");
    });

}); 