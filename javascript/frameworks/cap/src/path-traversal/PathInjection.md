# CAP CDS Utils used with user-controlled sources

If a path is constructed from user-provided input without sufficient sanitization, a malicious user may be able to manipulate the contents of the filesystem without proper authorization.

Additionally if user-provided input is used to create file contents this can also result in a malicious user manipulating the filesystem in an unchecked way.

## Recommendation

CAP applications using CDS Utils should not use user-provided input without sanitization.

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
        }
    }
}

```

## References

- OWASP 2021: [Injection](https://owasp.org/Top10/A03_2021-Injection/).
- SAP CAP CDS Utils : [Documentation](https://cap.cloud.sap/docs/node.js/cds-utils).