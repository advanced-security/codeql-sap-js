# Client-side cross-site scripting

Receiving text from the user, most notably through a control, and rendering it as HTML in another control can lead to a cross-site scripting vulnerability.

## Recommendation

### Preventing XSS Involving User Defined Control

If the XSS attack vector includes a user-defined control, then we can mitigate the issue by sanitizing the user-provided input in the implementation of the control:
- Where possible, define the property type to something other than `string` or `any`. If a value should be used, then opt for the `enum` type which only allows a predefined set of strings.
- Use escaping functions in `sap.base.security`. Relevant sanitizers include `encodeXML` and `encodeHTML`.
- When using API  with `apiVersion: 2` (Semantic Rendering), do not use `RenderManager.unsafeHtml` unless the control property `sanitizeContent` is set to `true`.
- When using the now-deprecated older API with `RenderManager.write` or `RenderManager.writeAttribute`, use their respective counterparts `RenderManager.writeEscaped` and `RenderManager.writeAttributeEscaped` which sanitizes their rendered contents.

### Preventing XSS Not Involving User Defined Control

An XSS attack vector can still exist even when no user-defined control is used. In this case, a model property or a control property act as an intermediate step when external data is passed in.
In this case, the UI5 application should not use the property as is, but should sanitize the contents before reading it. Such sanitization can take place in the controller or in the view declaration using expression bindings.

## Example

### Custom Control with Custom Rendering Method

This custom control `vulnerable.control.xss` calls `unsafeHtml` on a given `RenderManager` instance in its static renderer function. Since its `text` property is an unrestricted string type, it can point to a string with contents that can be interpreted as HTML. If it is the case, `unsafeHtml` will render the string, running a possibly embedded JavaScript code in it.

```javascript
sap.ui.define(["sap/ui/core/Control"], function (Control) {
    return Control.extend("vulnerable.control.xss", {
        metadata: { properties: { text: { type: "string" } } },
        renderer: {
            apiVersion: 2,
            render: function (oRm, oControl) {
                oRm.openStart("div", oControl);
                oRm.unsafeHtml(oControl.getText()); // sink
                oRm.close("div");
            }
        }
    });
})
```

This is the same custom control without the possibility of XSS using several means of sanitization: The property `text` is enforced to a non-string type, hence disallows unrestricted strings (This is espcially applicable if the expected input is a number anyways). Also, the `sap.base.security.encodeXML` function is used to escape HTML control characters.

```javascript
sap.ui.define(["sap/ui/core/Control", "sap/base/security/encodeXML"], function (Control, encodeXML) {
    return Control.extend("vulnerable.control.xss", {
        metadata: { properties: { text: { type: "int" } } }, // constrain the type
        renderer: {
            apiVersion: 2,
            render: function (oRm, oControl) {
                oRm.openStart("div", oControl);
                oRm.unsafeHtml(encodeXML(oControl.getText()); // encode using security functions
                oRm.close("div");
            }
        }
    });
})
```

### Library Control

This example contains only library controls that are not user-defined. The untrusted user input flows from `sap.m.Input` and directly flows out via `sap.ui.core.HTML` through the model property `input` as declared in the `onInit` method of the controller.

``` xml
<sap.ui.core.mvc.View controllerName="vulnerable.controller.app">
  <sap.m.Input value="{/input}" />	 <!-- XSS Source -->
  <sap.ui.core.HTML content="{/input}"/> <!-- XSS Sink -->
</sap.ui.core.mvc.View>
```

``` javascript
sap.ui.define(["sap/ui/core/mvc/Controller", "sap/ui/model/json/JSONModel"],
  function (Controller, JSONModel) {
    return Controller.extend("vulnerable.controller.app", {
      onInit: function () {
        var oData = { input: null };
        var oModel = new JSONModel(oData);
        this.getView().setModel(oModel);
      },
    });
  },
);
```

The issue can be resolved by setting the `HTML` control's `sanitizeContent` attribute to true.

``` xml
<sap.ui.core.mvc.View controllerName="vulnerable.controller.app">
  <sap.m.Input value="{/input}" />
  <sap.ui.core.HTML content="{/input}" sanitizeContent="true" />
</sap.ui.core.mvc.View>
```

## References

- OWASP: [DOM Based XSS](https://owasp.org/www-community/attacks/DOM_Based_XSS).
- SAP: [Cross-site Scripting](https://sapui5.hana.ondemand.com/sdk/#/topic/91f0bd316f4d1014b6dd926db0e91070.html) in UI5.
- SAP: [Prevention of Cross-site Scripting](https://sapui5.hana.ondemand.com/sdk/#/topic/4de64e2e191f4a7297d4fd2d1e233a2d.html) in UI5.
- SAP: [API Documentation of sap.ui.core.RenderManager](https://sapui5.hana.ondemand.com/sdk/#/api/sap.ui.core.RenderManager)
- SAP: [Documentation of sap.ui.core.HTML](https://sapui5.hana.ondemand.com/sdk/#/api/sap.ui.core.HTML%23methods/setSanitizeContent)
- SAP: [Defining Control Properties](https://sapui5.hana.ondemand.com/sdk/#/topic/ac56d92162ed47ff858fdf1ce26c18c4.html).
- SAP: [Expression Binding](https://sapui5.hana.ondemand.com/sdk/#/topic/daf6852a04b44d118963968a1239d2c0).
- Common Weakness Enumeration: [CWE-79](https://cwe.mitre.org/data/definitions/79.html).
- Common Weakness Enumeration: [CWE-116](https://cwe.mitre.org/data/definitions/116.html).
