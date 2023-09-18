jQuery.sap.declare("codeql-sap-js.control.xss");
jQuery.sap.require("sap.ui.core.Control");

sap.ui.core.Control.extend("codeql-sap-js.control.xss", {
    metadata: {
        properties: {
            text: { type: "string" }
        }
    },
    renderer: {
        apiVersion: 2,
        render: function (oRm, oControl) {
            oRm.openStart("div", oControl);
            oRm.unsafeHtml(oControl.getText()); // XSS sink RenderManager.unsafeHtml
            oRm.close("div");
        }
    }
});
