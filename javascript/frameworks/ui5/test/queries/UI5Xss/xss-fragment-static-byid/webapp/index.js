sap.ui.define([
    "sap/ui/core/mvc/HTMLView"
], function (HTMLView) {
    "use strict";
    HTMLView.create({
        viewName: "ui5-xss-fragment-static-byid.view.Main"
    }).then(function (oView) {
        oView.placeAt("content");
    });
});
