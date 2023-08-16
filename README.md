# SAP UI5 with CodeQL

CodeQL queries and supporting models for the SAP UI5 JavaScript framework

### Queries
- XSS
- Log Injection
- Clickjacking
 
### Modeled elements
 - UI5 AMD-style components (also via jQuery)
 - MVC elements: 
    - UI5 Controllers and Data Models (literal/external Json models)
    - UI5 declarative Views (XML/Json/HTML/JS)
    - Library/custom UI5 Controls
    - Project naming conventions (e.g. Control-Renderer)
  - Source/Sink definition via [ModelAsData extensions](https://github.com/advanced-security/codeql-sap-js/blob/main/.github/codeql/extensions/ui5-data-extensions.yml#L41)
  - Control inheritance via [ModelAsData extensions](https://github.com/advanced-security/codeql-sap-js/blob/main/.github/codeql/extensions/ui5-data-extensions.yml#L16)

### Supported Features with tests
The following tables list the main supported features with corresponding test cases
#### Detecting XSS and Log injection vulnerabilities
|test | library controls | [MaD sources/sinks](https://github.com/advanced-security/codeql-sap-js/blob/main/.github/codeql/extensions/ui5-data-extensions.yml) | custom controls | UI5View | JS dataflow | HTML APIs | sanitizer | acc.path via handler |
| - | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| [xss-declarative](https://github.com/advanced-security/codeql-sap-js/security/code-scanning/248) | ✅︎ | ✅︎ | | XMLView |
| [xss-custom-control](https://github.com/advanced-security/codeql-sap-js/security/code-scanning/249)| ✅︎ | ✅︎ | ✅︎ | XMLView | | classic |
| [xss-custom-control-dom](https://github.com/advanced-security/codeql-sap-js/security/code-scanning/250)| ✅︎ | ✅︎ | ✅︎ | XMLView | | DOM |
| [xss-json-view](https://github.com/advanced-security/codeql-sap-js/security/code-scanning/247)<br/>[xss-html-view](https://github.com/advanced-security/codeql-sap-js/security/code-scanning/245)<br/>[xss-js-view](https://github.com/advanced-security/codeql-sap-js/security/code-scanning/246) | ✅︎ | ✅︎ | | JsonView<br/>HTMLView<br/>JSView |
| [xss-js-dataflow](https://github.com/advanced-security/codeql-sap-js/security/code-scanning/275) | ✅︎ | ✅︎ | |XMLView| ✅︎ |
| [context-specific-sanitizer](https://github.com/advanced-security/codeql-sap-js/security/code-scanning/277)| ✅︎ | ✅︎ | ✅︎ | XMLView |✅︎ | DOM | ✅︎ |
| [xss-event-handler-param](https://github.com/advanced-security/codeql-sap-js/blob/main/test/queries/xss/xss-event-handlers/webapp/view/app.view.xml#L11C56-L11C64)| ✅︎ | ✅︎ | ✅︎ | XMLView | | | | 🚧 |

#### Detecting Clickjacking vulnerabilities
| test | secure | insecure frameOptions | missing frameOptions |
| - | :-: | :-: | :-: |
| [clickjacking-deny-all]( https://github.com/advanced-security/codeql-sap-js/blob/main/test/queries/clickjacking/clickjacking-deny-all/index.html#L10) | ✅︎ | |
| [clickjacking-allow-all:l9]( https://github.com/advanced-security/codeql-sap-js/security/code-scanning/240)<br/>[clickjacking-allow-all:l28](https://github.com/advanced-security/codeql-sap-js/security/code-scanning/241) | | ✅︎ |
| [clickjacking-default-all]([clickjacking/clickjacking-default-all](https://github.com/advanced-security/codeql-sap-js/security/code-scanning/280)) | | | ✅︎ |
