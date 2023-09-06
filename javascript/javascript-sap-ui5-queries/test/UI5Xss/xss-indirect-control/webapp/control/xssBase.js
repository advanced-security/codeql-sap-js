sap.ui.define(["sap/ui/core/Control"], function (Control) {
  return Control.extend("codeql-sap-js.control.xssBase", {
    metadata: {
      properties: {
        text: { type: "string" },
      },
    },
  });
});
