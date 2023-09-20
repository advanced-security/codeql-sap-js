sap.ui.define([
    "sap/ui/core/mvc/JSView"
], function (JSView) {
    "use strict";
    JSView.create({
        viewName: "codeql-sap-js.view.app"
    }).then(function (oView) {
        oView.placeAt("content");
    });

}); 