sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/base/security/encodeCSS",
  "sap/base/security/encodeJS",
  "sap/base/security/encodeURL",
  "sap/base/security/encodeURLParameters",
  "sap/base/security/encodeXML"
], function (Controller, encodeCSS, encodeJS, encodeURL, encodeURLParameters, encodeXML) {
  "use strict";

  return Controller.extend("codeql.sap.encoder.controller.app", {
    onChange: function (event) {
      const value = event.getSource().getValue();
      const parameters = JSON.parse(value);
      const output = this.byId("output").$();

      output.html(encodeCSS(value));
      output.html(encodeJS(value));
      output.html(encodeURL(value));
      output.html(encodeURLParameters(parameters));
      output.html(jQuery.sap.encodeCSS(value));
      output.html(jQuery.sap.encodeJS(value));
      output.html(jQuery.sap.encodeURL(value));
      output.html(jQuery.sap.encodeURLParameters(parameters));

      output.html(encodeXML(value));
      output.html(jQuery.sap.encodeXML(value));
      output.html(jQuery.sap.encodeHTML(value));
      output.text(value);
    }
  });
});
