sap.ui.define([
    "sap/ui/core/mvc/JSONView"
], function (JSONView) {
    "use strict";
    JSONView.create({
        viewName: "codeql-sap-js.view.app"
    }).then(function (oView) {
        oView.placeAt("content");
    });

}); 