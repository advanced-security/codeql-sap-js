# SAP UI5 with CodeQL

CodeQL queries and supporting models for the SAP UI5 JavaScript framework

### Queries
- [XSS](javascript/frameworks/UI5/src/UI5Xss/UI5Xss.ql)
- [Log Injection](javascript/frameworks/UI5/src/UI5LogInjection/UI5LogInjection.ql)
- [Clickjacking](javascript/frameworks/UI5/src/UI5Clickjacking/UI5Clickjacking.ql)
 
### Modeled UI5 framework elements
 - UI5 AMD-style components (also via jQuery)
 - MVC elements: 
    - UI5 Controllers and Data Models (literal/external JSON models)
    - UI5 [declarative Views](DeclarativeApp.png) (XML/JSON/HTML/JS)
    - Library/custom UI5 Controls
    - Project naming conventions (e.g. Control-Renderer)
  - Source/Sink definition via [ModelAsData extensions](javascript/frameworks/UI5/ext/ui5-data-extensions.yml#L61-L97)
  - Controls inheritance via [ModelAsData extensions](javascript/frameworks/UI5/ext/ui5-data-extensions.yml#L42-L59)

### Supported Features with tests
The following tables list the main supported features with corresponding test cases
#### Detecting XSS and Log injection vulnerabilities
|test | library controls | [MaD sources sinks](javascript/frameworks/UI5/ext/ui5-data-extensions.yml#L61-L97) | custom controls | UI5View | JS dataflow | HTML APIs | sanitizer | acc.path via handler |
| - | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| [xss-html-control](https://github.com/advanced-security/codeql-sap-js/security/code-scanning/1033) | ✅︎ | ✅︎ | | XMLView |
| [xss-custom-control-api1](https://github.com/advanced-security/codeql-sap-js/security/code-scanning/1051)| ✅︎ | ✅︎ | ✅︎ | XMLView | | classic |
| [xss-custom-control-api2](https://github.com/advanced-security/codeql-sap-js/security/code-scanning/250)| ✅︎ | ✅︎ | ✅︎ | XMLView | | DOM |
| [xss-json-view](https://github.com/advanced-security/codeql-sap-js/security/code-scanning/247)<br/>[xss-html-view](https://github.com/advanced-security/codeql-sap-js/security/code-scanning/245)<br/>[xss-js-view](https://github.com/advanced-security/codeql-sap-js/security/code-scanning/246) | ✅︎ | ✅︎ | | JsonView<br/>HTMLView<br/>JSView |
| [log-html-control-df](https://github.com/advanced-security/codeql-sap-js/security/code-scanning/275) | ✅︎ | ✅︎ | |XMLView| ✅︎ |
| [sanitized](https://github.com/advanced-security/codeql-sap-js/security/code-scanning/277)| ✅︎ | ✅︎ | ✅︎ | XMLView | ✅︎ | DOM | ✅︎ |
| [xss-event-handlers](https://github.com/advanced-security/codeql-sap-js/security/code-scanning/335)| ✅︎ | ✅︎ | ✅︎ | XMLView | | | | ✅︎ |

#### Detecting Clickjacking vulnerabilities
| test | secure | insecure frameOptions | missing frameOptions |
| - | :-: | :-: | :-: |
| [clickjacking-deny-all](javascript/frameworks/UI5/test/queries/UI5Clickjacking/clickjacking-deny-all/index.html#L10) | ✅︎ | |
| [clickjacking-allow-all:l9](https://github.com/advanced-security/codeql-sap-js/security/code-scanning/240)<br/>[clickjacking-allow-all:l28](https://github.com/advanced-security/codeql-sap-js/security/code-scanning/241) | | ✅︎ |
| [clickjacking-default-all](https://github.com/advanced-security/codeql-sap-js/security/code-scanning/330) | | | ✅︎ |
