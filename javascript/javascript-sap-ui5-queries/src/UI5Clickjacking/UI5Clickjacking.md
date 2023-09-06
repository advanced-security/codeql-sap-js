# Clickjacking

UI5 applications that do not explicitly set the frame options to `deny` may be vulnerable to UI redress attacks (”clickjacking”). In these attacks, the vulnerable site is loaded in a frame on an attacker-controlled site which uses opaque or transparent layers to trick the user into unintentionally clicking a button or link on the vulnerable site.

## Recommendation

Explicitly set the frame options to `"deny"`, either through `window["sap-ui-config"]`, or `data-sap-ui-frameOptions` attribute of the script tag where it sources the bootstrap script `"sap-ui-core.js"`:

``` javascript
window["sap-ui-config"] = {
  frameOptions: "deny",
  ...
};
```

``` javascript
window["sap-ui-config"].frameOptions = "deny";
```

``` html
<script src="resources/sap-ui-core.js" data-sap-ui-frameOptions="deny"></script>
```

## Example

### Setting the Frame Options to `"allow"`

This UI5 application explicitly allows to be embedded in other applications.

```javascript
<!doctype html>
<html lang="en">
  <head>
    ...
    <script>
      window["sap-ui-config"] = {
        frameOptions: "allow",  // either through JS
        ...
      };
    </script>

    <script
      src="resources/sap-ui-core.js"
      data-sap-ui-frameOptions="allow"  // or through this HTML attribute
    ></script>
  </head>
  ...
</html>
```

### Not Setting the Frame Options to Anything

The default value of `window["sap-ui-config"]` and `data-sap-ui-frameOptions` are both `"allow"`, which makes leaving it untouched allows the application to be embedded.

## References
* OWASP: [Clickjacking Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html).
* Mozilla: [X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options).
* SAP: [Frame Options](https://sapui5.hana.ondemand.com/sdk/#/topic/62d9c4d8f5ad49aa914624af9551beb7.html).
* SAP: [Allowlist Service](https://sapui5.hana.ondemand.com/sdk/#/topic/d04a6d41480c4396af16b5d2b25509ec.html).
* Common Weakness Enumeration: [CWE-451](https://cwe.mitre.org/data/definitions/451.html).
