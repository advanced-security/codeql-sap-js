sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/base/security/encodeXML"
], function (Controller, encodeXML) {
    "use strict";
    return Controller.extend("codeql-sap-js.controller.app", {
        onSearch: function (oEvent) {
            this.sSearchQuery = oEvent.getSource().getValue(); // User input source sap.m.SearchField#getValue
            this._applyListFilters();
        },
        _applyListFilters: function () {
            var iCount = 0;
            /* POSITIVE: unencoded search query written as raw HTML via jQuery */
            this.byId("filterLabel").$().html("Found " + iCount + " for: " + this.sSearchQuery); // XSS sink jQuery#html
            /* POSITIVE: same, with the control looked up through the view */
            this.getView().byId("filterLabel").$().append(this.sSearchQuery); // XSS sink jQuery#append
            /* POSITIVE: same, through a chained jQuery traversal */
            this.byId("filterLabel").$().find("span").html(this.sSearchQuery); // XSS sink jQuery#html
            /* NEGATIVE: search query encoded before being written as HTML */
            this.byId("safeLabel").$().html("Found " + iCount + " for: " + encodeXML(this.sSearchQuery));
            /* NEGATIVE: search query written as text */
            this.byId("textLabel").$().text("Found " + iCount + " for: " + this.sSearchQuery);
        }
    });
});
