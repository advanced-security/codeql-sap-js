sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment"
], function (Controller, Fragment) {
    "use strict";
    return Controller.extend("ui5-xss-fragment-static-byid.controller.Main", {
        onInit: function () {
            // Load fragment with view ID prefix
            Fragment.load({
                id: this.getView().getId(),
                name: "ui5-xss-fragment-static-byid.view.PayloadForm",
                controller: this
            }).then(function (oFragment) {
                this.byId("fragmentArea").addContent(oFragment);
            }.bind(this));
        },

        onSubmitPayload: function () {
            // XSS vulnerability: Fragment.byId() static method to access fragment controls
            var sAttackerData = Fragment.byId(this.getView().getId(), "attackerInput").getValue();
            var oHtmlSink = Fragment.byId(this.getView().getId(), "vulnerableOutput");
            
            // Sink: setContent with unsanitized user input
            oHtmlSink.setContent("<span>" + sAttackerData + "</span>");
        }
    });
});
