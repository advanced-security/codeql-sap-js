sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment"
], function (Controller, Fragment) {
    "use strict";
    return Controller.extend("ui5-xss-fragment-static-byid.controller.Main", {
        onInit: function () {
            Fragment.load({
                id: this.getView().getId(),
                name: "ui5-xss-fragment-static-byid.view.PayloadForm",
                // Deliberately omit controller to exercise controller-less Fragment.load.
            }).then(function (oFragment) {
                this.byId("fragmentArea").addContent(oFragment);
            }.bind(this));

            Fragment.load({
                id: "displayForm",
                name: "ui5-xss-fragment-static-byid.view.DisplayForm",
                controller: this
            }).then(function (oFragment) {
                this.byId("fragmentArea").addContent(oFragment);
            }.bind(this));
        },

        onSubmitPayload: function () {
            var sAttackerData = Fragment.byId(this.getView().getId(), "attackerInput").getValue();
            var oHtmlSink = Fragment.byId(this.getView().getId(), "vulnerableOutput");
            
            oHtmlSink.setContent("<span>" + sAttackerData + "</span>");
        },

        copyDisplayText: function () {
            var sText = Fragment.byId("displayForm", "attackerInput").getText();
            Fragment.byId("displayForm", "vulnerableOutput").setText(sText);
        }
    });
});
