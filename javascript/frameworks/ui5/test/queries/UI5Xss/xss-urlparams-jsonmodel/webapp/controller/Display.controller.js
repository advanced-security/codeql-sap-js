sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/HTML",
    "sap/ui/core/Fragment"
], function (Controller, JSONModel, HTML, Fragment) {
    "use strict";
    return Controller.extend("ui5-xss-urlparams-jsonmodel.controller.Display", {
        onInit: function () {
            var oUrlQuery = new URLSearchParams(window.location.search);
            var sRemotePayload = oUrlQuery.get("payload");
            
            // Test 1: Direct sink in onInit - tests if URLSearchParams.get() is detected as source
            var oDirectHtml = new HTML({ content: "<div>" + sRemotePayload + "</div>" });
            this.getView().addContent(oDirectHtml);
            
            // Test 2: Flow through JSONModel to View XML binding
            var oViewModel = new JSONModel({
                remotePayload: sRemotePayload
            });
            this.getView().setModel(oViewModel);
            
            // Test 3: Flow through JSONModel to Fragment XML binding (mirrors app6c pattern)
            Fragment.load({
                id: this.getView().getId(),
                name: "ui5-xss-urlparams-jsonmodel.fragments.Content",
                controller: this
            }).then(function (oFragment) {
                this.byId("page").addContent(oFragment);
            }.bind(this));
        }
    });
});
