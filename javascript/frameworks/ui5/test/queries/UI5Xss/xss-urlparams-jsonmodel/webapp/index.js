sap.ui.define([
    "sap/ui/core/mvc/XMLView"
], function (XMLView) {
    "use strict";
    XMLView.create({
        viewName: "ui5-xss-urlparams-jsonmodel.view.Display"
    }).then(function (oView) {
        oView.placeAt("content");
    });
});
