sap.ui.define([
    "sap/ui/core/ComponentContainer"
], function (ComponentContainer) {
    "use strict";
    new ComponentContainer({
        name: "xss.fragment.odata.defaultmodel",
        settings: {
            id: "xss.fragment.odata.defaultmodel"
        },
        async: true
    }).placeAt("content");
});
