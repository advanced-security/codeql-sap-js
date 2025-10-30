# CAP CDS Utils used with user-controlled sources

If a path is constructed from user-provided input without sufficient sanitization, a malicious user may be able to manipulate the contents of the filesystem without proper authorization.

Additionally if user-provided input is used to create file contents this can also result in a malicious user manipulating the filesystem in an unchecked way.

## Recommendation

CAP applications using CDS Utils should not use user-provided input without sanitization.

The sanitization stragety can vary depending on what types of paths are satisfactory as user-provided input. A simple approach to sanitization is to check user-provided input against an allow list. Other potential approaches include checking components of paths or normalizing them to make sure that the path does not escape the expected root folder. 

Normalization techniques should be carefully considered and simple naive replacement strategies will not be sufficient, for example replacing any match of a parent directory reference (`../`) in the sample `.../...//` will still result in the path `../` being used which could escape the intended directory.

## Examples

This CAP service directly uses user-provided input to construct a path.

``` javascript
const cds = require("@sap/cds");
const { rm } = cds.utils

module.exports = class Service1 extends cds.ApplicationService {

    init() {
        this.on("send1", async (req) => {
            let userinput = req.data
            await rm(userinput, 'db', 'data') // Path injection alert
        }
    }
}
```

This CAP service directly uses user-provided input to add content to a file.

``` javascript
const cds = require("@sap/cds");
const { rm } = cds.utils

module.exports = class Service1 extends cds.ApplicationService {
  init() {
    this.on("send1", async (req) => {
      let userinput = req.data
      await write(userinput).to('db/data') // Path injection alert

      // GOOD: the path can not be controlled by an attacker
      let allowedDirectories = [
        'this-is-a-safe-directory'
      ];
      if (allowedDirectories.includes(userinput)) {
        await rm(userinput) // sanitized - No Path injection alert
      }
    }
  }
}
```

## References

- OWASP 2021: [Injection](https://owasp.org/Top10/A03_2021-Injection/).
- SAP CAP CDS Utils : [Documentation](https://cap.cloud.sap/docs/node.js/cds-utils).
- Common Weakness Enumeration: [CWE-020](https://cwe.mitre.org/data/definitions/20.html).
- Common Weakness Enumeration: [CWE-022](https://cwe.mitre.org/data/definitions/22.html).
