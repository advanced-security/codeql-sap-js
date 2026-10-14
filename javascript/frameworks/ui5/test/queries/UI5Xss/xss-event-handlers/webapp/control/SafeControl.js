sap.ui.define(["sap/ui/core/Control"], function (Control) {
  "use strict";

  return Control.extend("codeql-sap-js.control.SafeControl", {
    getValue: function () {
      return this._value || "";
    },
    setContent: function (content) {
      this._content = content;
      this.invalidate();
      return this;
    },
    renderer: {
      apiVersion: 2,
      render: function (renderManager, control) {
        renderManager.openStart("div", control).openEnd();
        renderManager.text(control._content || "");
        renderManager.close("div");
      }
    }
  });
});
