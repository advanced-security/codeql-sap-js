sap.ui.define([
    "sap/ui/core/Control"
], function (Control) {
    return Control.extend("codeql-sap-js.control.xss", {
        metadata: {
            properties: {
                text: { type: "string" },
                raw: { type: "any", defaultValue: "" },
                rawGeneric: { type: "any", defaultValue: "" },
                integer: { type: "int", defaultValue: 0 },
                decimal: { type: "float", defaultValue: 0 },
                enabled: { type: "boolean", defaultValue: false },
                data: { type: "object" },
                values: { type: "string[]" },
                size: { type: "sap.ui.core.CSSSize" }
            }
        },
        renderer: function (oRm, oControl) {
            oRm.write("<div");
            oRm.writeControlData(oControl);
            oRm.write(">");
            oRm.write(oControl.getText()); // XSS sink RenderManager.write
            oRm.write(oControl.getRaw());
            oRm.write(oControl.getProperty("rawGeneric"));
            oRm.write("</div>")
        }
    });
})
