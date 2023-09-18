sap.ui.define([
    "sap/ui/core/Control"
], function (Control) {
    return Control.extend("codeql-sap-js.control.xss", {
        metadata: {
            properties: {
                text: { type: "int" }
            }
        },
        renderer: {
            apiVersion: 2,
            render: function (oRm, oControl) {
                jQuery.sap.log.debug(oControl.getText()); //log-injection sink non-sanitized
            }
        }
    });
})
