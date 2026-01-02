sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment"
], function (Controller, JSONModel, Fragment) {
    "use strict"
    return Controller.extend("codeql-sap-js.controller.app", {
        onInit: function () {
            var oData = {
                input: null
            };
            var oModel = new JSONModel(oData);
            this.getView().setModel(oModel);

            Fragment.load({
                name: "codeql-sap-js.view.TestFragment",
                controller: this,
                id: this.getView().getId()
            }).then(function (oFragment) {
                this.getView().addDependent(oFragment);
                oFragment.placeAt("fragmentContainer");
            }.bind(this));
        }
    });
})