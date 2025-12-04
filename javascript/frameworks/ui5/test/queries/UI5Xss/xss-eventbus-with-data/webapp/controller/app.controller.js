sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/ui/core/EventBus"
], function(Controller, JSONModel, EventBus) {
  "use strict";
  return Controller.extend("codeql-sap-js.controller.app", {
    /*
     * 1. XSS.controller's method `doSomething1`: publish event "xss" with data pulled in
     * 2. XSS.controller's method `onInit`: subscribe to event "xss" with handler `doSomething2`
     * 3. XSS.controller's method `doSomething2`: set HTML's content
     */
    onInit: function() {
      let oData = {
        input: null,
        output1: null
      };
      let oModel = new JSONModel(oData);
      this.getView().setModel(oModel);
      this.bus = EventBus.getInstance();
      this.bus.subscribe("xssChannel", "xss", this.doSomething2, this);
    },

    doSomething1() {
      let oInput = this.getView().byId("input");
      let value = oInput.getValue();
      this.bus.publish("xssChannel", "xss", { message: value });
    },

    doSomething2(channel, event, model) {
      let oHtmlOutput = this.getView().byId("htmlOutput");
      oHtmlOutput.setContent(model.message);
    }
  });
});
