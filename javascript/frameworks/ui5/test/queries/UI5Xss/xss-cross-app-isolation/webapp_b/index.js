sap.ui.define([
    "sap/ui/core/ComponentContainer"
], function (ComponentContainer) {
    "use strict";
    new ComponentContainer({
        name: "app.b",
        settings: {
            id: "app.b"
        },
        async: true
    }).placeAt("content");
});
