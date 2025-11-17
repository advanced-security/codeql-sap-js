sap.ui.define(
  ["sap/ui/core/mvc/Controller", "sap/ui/core/HTML"],
  function (Controller, HTML) {
    "use strict";
    return Controller.extend("codeql-sap-js.controller.app", {
      onInit: function () {
        let inputReference = this.getView().byId("unit-test-target1");
        let htmlControl = this.getView().byId("htmlControl");

        /* ========== 1. UNSAFE: Input value piped into a reference to a static HTML, via a reference ========== */
        /* 1-1. Value directly set to `HTML.content` */
        htmlControl.content = inputReference.getValue(); // UNSAFE: property `content` set with an input value of a reference to a static value

        /* 1-2. Value set by `HTML.setContent(content)` */
        htmlControl.setContent(inputReference.getValue()); // UNSAFE: property `content` set with an input value of a reference to a static value
      },

      doSomething1: function () {
        let inputReference = this.getView().byId("unit-test-target1");

        /* ========== 2. UNSAFE: Input value piped into dynamic HTML, instantiated and placed on-demand ========== */
        /* 2-1. Value passed to the argument of the constructor call */
        let htmlControl1 = new HTML({
          content: `<div>${inputReference.getValue()}</div>`, // UNSAFE: property `content` set with an input value, control later placed at DOM
        });
        htmlControl1.placeAt("HTMLPlaceholder");

        /* 2-2. Value directly set to `HTML.content` */
        let htmlControl2 = new HTML();
        htmlControl2.content = inputReference.getValue(); // UNSAFE: property `content` set with an input value, control later placed at DOM
        htmlControl2.placeAt("HTMLPlaceholder");

        /* 2-3. Value set by `HTML.setContent(content)` */
        let htmlControl3 = new HTML();
        htmlControl3.setContent(inputReference.getValue()); // UNSAFE: property `content` set with an input value, control later placed at DOM
        htmlControl3.placeAt("HTMLPlaceholder");
      },

      doSomething2: function () {
        let inputReference = this.getView().byId("unit-test-target1");

        /* ========== 3. SAFE: Input value piped into dynamic HTML, instantiated but not placed anywhere in the DOM ========== */
        let htmlControl1 = new HTML({
          content: `<div>${inputReference.getValue()}</div>`, // SAFE: property `content` set with an input value but control not placed anywhere
        });

        let htmlControl2 = new HTML();
        htmlControl2.content = inputReference.getValue(); // SAFE: property `content` set with an input value but control not placed anywhere

        let htmlControl3 = new HTML();
        htmlControl3.setContent(inputReference.getValue()); // SAFE: property `content` set with an input value but control not placed anywhere
      },
    });
  }
);
