sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/base/security/encodeXML"
], function (Controller, encodeXML) {
    "use strict";

    return Controller.extend("controllers.products.ProductDetails", {
        onRenderPressed: function () {
            var value = this.getView().byId("descText").getValue();
            this.getView().byId("htmlDesc").setContent(value);
            this.getView().byId("encodedHtml").setContent(encodeXML(value));
            this.getView().byId("missingHtml").setContent(value);
            this.getView().byId("plainText").setText(value);
        }
    });
});
