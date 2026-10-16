sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/m/Input"
], function (Controller, JSONModel, ODataModel, Input) {
    "use strict"
    return Controller.extend("codeql-sap-js.controller.app", {
        onInit: function () {
            /* 1. Setting an ODataModel as a default model and two JSON models as helpers on THE ENTIRE VIEW */
            var oModelDefault1 = new ODataModel();
            var oModel11 = new JSONModel();
            var oModel12 = new JSONModel();
            this.getView().setModel(oModelDefault1);
            this.getView().setModel(oModel11, "viewModel1");
            this.getView().setModel(oModel12, "viewModel2");
            
            /* 2. Setting an ODataModel as a default model and two JSON models as helpers on A NEW CONTROL */
            var oControl1 = new Input();
            var oModelDefault2 = new ODataModel();
            var oModel21 = new JSONModel();
            var oModel22 = new JSONModel();
            oControl1.setModel(oModelDefault2);
            oControl1.setModel(oModel21, "controlModel1");
            oControl1.setModel(oModel22, "controlModel2");

            /* 3. Setting an ODataModel as a default model and two JSON models as helpers on A CONTROL REFERENCE */
            var oControl2 = this.getView().byId("unit-test-target1");
            var oModelDefault3 = new ODataModel();
            var oModel31 = new JSONModel();
            var oModel32 = new JSONModel();
            oControl2.setModel(oModelDefault3);
            oControl2.setModel(oModel31, "controlRefModel1");
            oControl2.setModel(oModel32, "controlRefModel2");

            var oControl3 = this.getView().byId("unit-test-target2");
            var oModel41 = new JSONModel();
            var oModel42 = new JSONModel();
            oControl3.setModel(oModel41, "controlRef2Model1");
            oControl3.setModel(oModel42, "controlRef2Model2");

            var oModel43 = new JSONModel();
            oControl3.setModel(oModel43, "viewModel2");

            /* The controller's viewModel2 collides with unit-test-target2's viewModel2 */
        }
    });
})