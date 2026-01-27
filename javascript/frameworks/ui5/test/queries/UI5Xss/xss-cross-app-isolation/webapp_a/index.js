sap.ui.define([
    "sap/ui/core/ComponentContainer"
], function (ComponentContainer) {
    "use strict";
    new ComponentContainer({
        name: "app.a",
        settings: {
            id: "app.a"
        },
        async: true
    }).placeAt("content");
});
