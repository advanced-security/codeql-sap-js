sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/m/Input",
    "sap/m/Button",
    "sap/m/VBox",
    "sap/ui/core/HTML",
  ],
  function (Controller, Input, Button, VBox, HTML) {
    "use strict";
    return Controller.extend("codeql-sap-js.controller.app", {
      onInit: function () {
        let inputReference = this.getView().byId("unit-test-target1");
        let htmlControl = this.getView().byId("htmlControl");

        /* ========== 1. Input value piped into static HTML, via a reference ========== */
        /* 1-1. Value directly set to `HTML.content` */
        htmlControl.content = inputReference.getValue();

        /* 1-2. Value set by `HTML.setContent(content)` */
        htmlControl.setContent(inputReference.getValue());
      },

      doSomething1: function () {
        let inputReference = this.getView().byId("unit-test-target1");

        /* ========== 2. Input value piped into dynamic HTML, instantiated and placed on-demand ========== */
        /* 2-1. Value passed to the argument of the constructor call */
        let htmlControl1 = new HTML({
          content: `<div>${inputReference.getValue()}</div>`,
        });
        htmlControl1.placeAt("HTMLPlaceholder");

        /* 2-2. Value directly set to `HTML.content` */
        let htmlControl2 = new HTML();
        htmlControl2.content = inputReference.getValue();
        htmlControl2.placeAt("HTMLPlaceholder");

        /* 2-3. Value set by `HTML.setContent(content)` */
        let htmlControl3 = new HTML();
        htmlControl3.setContent(inputReference.getValue());
        htmlControl3.placeAt("HTMLPlaceholder");
      },

      doSomething2: function () {
        let inputReference = this.getView().byId("unit-test-target1");

        /* ========== 2. Input value piped into dynamic HTML, instantiated and placed on-demand ========== */
        /* 2-1. Value passed to the argument of the constructor call */
        let htmlControl1 = new HTML({
          content: `<div>${inputReference.getValue()}</div>`,
        });

        /* 2-2. Value directly set to `HTML.content` */
        let htmlControl2 = new HTML();
        htmlControl2.content = inputReference.getValue();

        /* 2-3. Value set by `HTML.setContent(content)` */
        let htmlControl3 = new HTML();
        htmlControl3.setContent(inputReference.getValue());
      }
    });
  }
);
