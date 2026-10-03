sap.ui.jsview("codeql.sap.bindcontext.js.view.app", {
  getControllerName: function () {
    return "codeql.sap.bindcontext.js.controller.app";
  },

  createContent: function () {
    return [
      new sap.m.Input({
        value: "{/customer/name}"
      }),
      new sap.ui.core.HTML("jsBoundSink", {
        content: "{name}"
      }),
      new sap.ui.core.HTML("jsSiblingSink", {
        content: "{name}"
      })
    ];
  }
});
