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
                var value = oControl.getText();
                var sanitized = encodeXML(String(value)) //xss sanitized
                jQuery.sap.log.debug(sanitized); //log-injection sink non-sanitized
                oRm.unsafeHtml(sanitized); // XSS sink sanitized
                oRm.close("div");
            }
        }
    });
})
