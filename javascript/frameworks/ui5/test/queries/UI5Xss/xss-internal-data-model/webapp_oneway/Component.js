sap.ui.define(
  ["sap/ui/core/UIComponent", "sap/ui/model/BindingMode"],
  function (UIComponent, BindingMode) {
    "use strict";

    return UIComponent.extend("codeql-sap-js.Component", {
      metadata: {
        manifest: "json"
      },

      init: function () {
        UIComponent.prototype.init.apply(this, arguments);
        // TRUE NEGATIVE: One-way binding prevents user input from updating the manifest model.
        this.getModel().setDefaultBindingMode(BindingMode.OneWay);
      }
    });
  }
);
