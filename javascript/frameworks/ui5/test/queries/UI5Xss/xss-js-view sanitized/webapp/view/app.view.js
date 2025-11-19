sap.ui.jsview("codeql-sap-js.view.app", {
    /** Specifies the Controller belonging to this View.
    * In the case that it is not implemented, or that "null" is returned, this View does not have a Controller.
    * @memberOf codeql-sap-js.controller.app
    */
    getControllerName: function () {
        return "codeql-sap-js.controller.app";
    },

    /** Is initially called once after the Controller has been instantiated. It is the place where the UI is constructed.
    * Since the Controller is given to this method, its event handlers can be attached right away.
    * @memberOf codeql-sap-js.controller.app
    */
    createContent: function (oController) {
        return [new sap.m.Input({
            placeholder: "Enter Payload",
            description: "Try: <img src=x onerror=alert(\"XSS\")>",
            value: "{/input}"
        }),
        new sap.ui.core.HTML({
            content: "{/input}",
            sanitizeContent: true
        })];
    }
});