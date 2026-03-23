sap.ui.define([
    "sap/ui/core/Control"
], function (Control) {
    return Control.extend("codeql-sap-js.control.xss", {
        metadata: {
            properties: {
                text: { type: "string" },
                text2: { type: "string" }
            }
        },
        renderer: {
            apiVersion: 2,
            render: function (oRm, oControl) {
                oRm.openStart("div", oControl);
                oRm.unsafeHtml(oControl.getText()); // XSS sink RenderManager.unsafeHtml
                oRm.unsafeHtml(oControl.getText2()); // XSS sink RenderManager.unsafeHtml
                oRm.close("div");
            }
        }
    });
})
