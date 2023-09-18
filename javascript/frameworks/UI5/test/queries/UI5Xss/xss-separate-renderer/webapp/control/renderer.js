sap.ui.define([
    "sap/ui/core/Renderer"
], function (Control) {
    return Control.extend("codeql-sap-js.control.renderer", {
        apiVersion: 2,
        render: function (oRm, oControl) {
            oRm.openStart("div", oControl);
            oRm.unsafeHtml(oControl.getText()); // XSS sink RenderManager.unsafeHtml
            oRm.close("div");
        }
    });
})
