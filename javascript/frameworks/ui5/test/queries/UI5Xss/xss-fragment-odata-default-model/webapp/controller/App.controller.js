sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment"
], function (Controller, Fragment) {
    "use strict";

    return Controller.extend("xss.fragment.odata.defaultmodel.controller.App", {
        onInit: function () {
            // XSS vulnerability pattern:
            // 1. OData model is configured as default model in manifest.json
            // 2. Fragment is loaded dynamically
            // 3. Fragment is bound to OData entity via bindElement
            // 4. Fragment contains HTML control that renders OData content
            
            Fragment.load({
                id: this.getView().getId(),
                name: "xss.fragment.odata.defaultmodel.fragments.DataDisplay",
                controller: this
            }).then(function (oFragment) {
                // Bind fragment to an OData entity - vulnerability is in the backend data
                oFragment.bindElement("/Messages(1)");
                
                // Add the fragment to the page content
                this.byId("page").addContent(oFragment);
            }.bind(this));
        }
    });
});
