sap.ui.define([
    "sap/ui/core/Control", 'sap/base/security/encodeXML'
], function (Control, EncodeXML) {
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
                oRm.close("div");

                oRm.write(`
                    <div>
                        <div>${oControl.getText2()}</div>
                        <div>${EncodeXML(oControl.getText2())}</div>
                    </div>
                    `.trim());
            }
        }
    });
})
