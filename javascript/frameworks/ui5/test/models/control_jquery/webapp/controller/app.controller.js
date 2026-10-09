sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/core/Element",
  "sap/ui/core/Fragment"
], function (Controller, Element, Fragment) {
  "use strict";

  function checkType(label, value) {}

  return Controller.extend("codeql.sap.jquery.controller.app", {
    onAfterRendering: function () {
      this.byId("target").$().html("controller");
      this.getView().byId("target").$().html("view-control");
      this.getView().$().html("view");
      sap.ui.getCore().byId("target").$().html("core");
      Element.getElementById("target").$().html("element-id");
      Element.closestTo("#target").$().html("closest");
      Fragment.byId("fragment", "target").$().html("fragment");
      sap.ui.core.Element.getElementById("target").$().html("global-element");
      sap.ui.core.Fragment.byId("fragment", "target").$().html("global-fragment");
      this.byId("target").$("inner").html("suffix");

      var control = this.byId("target");
      control.$().append("append-first", "append-second");
      control.$().prepend("prepend-first", "prepend-second");
      control.$().before("before-first", "before-second");
      control.$().after("after-first", "after-second");
      control.$().html(function () { return "html-callback"; });
      control.$().append(function () { return "append-callback"; });
      control.$().wrap(function () { return "wrap-callback"; });
      control.$().append("fluent-prefix").addClass("selected").find("span").end().html("fluent");
      control.$().empty().html("empty-chain");
      control.$().html("setter-first").html("setter-second");
      control.$().text("safe-set-text").html("text-chain");
      control.$().attr("title", "safe-title").html("attr-chain");
      control.$().addAriaLabelledBy("label").html("ui5-plugin-chain");
      control.$().text("safe-text");

      checkType("type-view", this.getView().$());
      checkType("type-suffix", control.$("inner"));
      checkType("type-clone", control.$().clone());
      checkType("type-setter", control.$().attr("title", "type-title"));
      checkType("not-html-getter", control.$().html());
      checkType("not-text-getter", control.$().text());
      checkType("not-value-getter", control.$().val());
      checkType("not-dom-element", control.$().get(0));
      checkType("not-control-array", control.$().control());

      var unrelated = {
        $: function () {
          return { html: function (value) { return value; } };
        }
      };
      unrelated.$().html("not-ui5");
    }
  });
});
