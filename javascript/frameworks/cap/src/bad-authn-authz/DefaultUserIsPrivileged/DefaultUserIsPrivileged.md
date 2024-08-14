# Default User is overwritten as privileged

Users that cannot be verified as authenticated are represented as `cds.User.default` internally. Setting this property to `cds.User.Privileged` may result in providing protected assets to unauthorized users.

## Recommendation

### Set up a development profile that uses non-production authentication

Overwriting `cds.User.default` as `cds.User.Privileged` for testing purposes is not recommended as such code may easily slip through production.

Instead, set up a development profile and opt in to use a non-production strategy such as `"basic"`, `"dummy"`, or `"mocked"` during its use. This can be done in the file `package.json` in the root folder of the CAP application:

``` json
{
  "requires": {
    "[dev]": {
      "auth": "dummy"
    }
  }
}
```

Setting `"dummy"` as the development authentication strategy has the effect of disabling `@requires` and `@restrict` annotations of CDS definitions that provides authorization. The application during development then can be run and tested with the `--profile dev` option.

```shell
cds serve --profile dev
```

## Example

Setting `cds.User.default` to `cds.User.Privileged` may happen anywhere in the application. In the following example, the `server.js` file provides the top-level definition of a CAP application and overwrites the `default` user property with the `Privileged` class.

``` javascript
const cds = require("@sap/cds");
const app = require("express")();

/*
 * Antipattern: `cds.User.default` is overwritten to `cds.User.Privileged`
 */
cds.User.default = cdsUser.Privileged;

cds.serve("all").in(app);
```

## References

- SAP CAPire Documentation: [cds.User.default](https://cap.cloud.sap/docs/node.js/authentication#default-user).
- SAP CAPire Documentation: [cds.User.Privileged](https://cap.cloud.sap/docs/node.js/authentication#privileged-user).
- SAP CAPire Documentation: [Authentication Strategies](https://cap.cloud.sap/docs/node.js/authentication#strategies).
- Common Weakness Enumeration: [CWE-250](https://cwe.mitre.org/data/definitions/250.html).
