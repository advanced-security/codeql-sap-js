sap.ui.define([
    "sap/ui/core/Control",
    "sap/base/security/encodeXML"
], function (Control, encodeXML) {
    return Control.extend("codeql-sap-js.control.xss", {
        metadata: {
            properties: {
                text: { type: "string" }
            }
        },
        renderer: {
            apiVersion: 2,
            render: function (oRm, oControl) {
                oRm.openStart("div", oControl);
                oRm.unsafeHtml(encodeXML(String(oControl.getText()))); // XSS sink sanitized
                oRm.unsafeHtml(jQuery.sap.encodeHTML(String(oControl.getText()))); // XSS sink sanitized
                oRm.close("div");
            }
        }
    });
})
