sap.ui.jsview("codeql.sap.bindcontext.js.view.app", {
  getControllerName: function () {
    return "codeql.sap.bindcontext.js.controller.app";
  },

  createContent: function () {
    return [
      new sap.m.Input({
        value: "{/customer/name}"
      }),
      new sap.m.VBox(this.createId("jsBoundContainer"), {
        items: [
          new sap.ui.core.HTML(this.createId("jsBoundSink"), {
            content: "{name}"
          })
        ]
      }),
      new sap.ui.core.HTML("jsSiblingSink", {
        content: "{name}"
      })
    ];
  }
});
