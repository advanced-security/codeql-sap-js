# Log Injection

If an untrusted input, possibly through a UI5 control, is not sanitized and passed onto a logging function, it is possible that a malicious actor submits a crafted input which might lead to forging log entries. If the entries are logged as plaintext, then newline characters may be inserted by the malicious actor. If the entry is interpreted as HTML, then artitrary HTML code my be included to forge log entries.

## Recommendation

Avoid directly logging untrusted input from a remote source and sanitize it by replaceing characters so that the input no longer contains control characters and substrings that may be interpreted as HTML.

## Examples

This UI5 application directly outputs what the user submitted via the `sap.m.Input` control.

``` xml
<sap.ui.core.mvc.View controllerName="vulnerable.controller.app">
  <SearchField id="searchTodoItemsInput"
  width="20rem" search=".onSearchCompleted" /> <!-- Source -->
</sap.ui.core.mvc.View>
```

``` javascript
sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/base/Log/info",
  ],
  function (Controller, JSONModel, info) {
    return Controller.extend("vulnerable.controller.app", {
      onSearchCompleted: function () {
        var oView = this.getView();
        var oSearchField = oView.byId("searchTodoItemsInput");
        var searchValue = oSearchField.getValue();
        info(searchValue); // Sink
      },
    });
  },
);
```

## References

- OWASP: [Log Injection](https://owasp.org/www-community/attacks/Log_Injection)
- OWASP: [Log Injection Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- SAP: [namespace `sap/base/Log`](https://sapui5.hana.ondemand.com/sdk/#api/module:sap/base/Log)
