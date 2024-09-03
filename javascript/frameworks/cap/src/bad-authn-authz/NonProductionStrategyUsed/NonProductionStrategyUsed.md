# Non-Production Authentication Strategy Used without Profiles

Using a non-production authentication strategy without setting up a distinct profile for development may pose allow unintended authentication and/or authorization if the application is deployed into production.

## Recommendation

### Isolate the use of development-level strategies to a development profile

Use separate profiles for development and deployment and select one as needed. In this way, properties including authentication strategies can be substituted by changing a single command line option: `--profile`. For example, having the following section in the application's `package.json` states that the `"dummy"` authentication strategy must be used while `"xsuaa"`, a production-grade strategy, should be used when deployed:

``` json
{
  "requires": {
    "[dev]": {
      "auth": "dummy"
    },
    "[deploy]": {
      "auth": "xsuaa"
    }
  }
}
```

The application can be now run in different modes depending on the `--profile` command line option:

``` shell
$ cds serve --profile dev    # Runs the application in development profile with strategy "dummy"
$ cds serve --profile deploy # Runs the application in development profile with strategy "xsuaa"
```

## Example

The following CAP application states that it uses `"basic"` authentication strategy along with mocked credentials. Using the pair of username and password, an attacker can gain access to certain assets by signing in to the application.

``` json
{
  "cds": {
    "requires": {
      "auth": {
        "kind": "basic",
        "users": {
          "JohnDoe": {
            "password": "JohnDoesPassword",
            "roles": ["JohnDoesRole"],
            "attr": {}
          },
          "JaneDoe": {
            "password": "JaneDoesPassword",
            "roles": ["JaneDoesRole"],
            "attr": {}
          }
        }
      }
    }
  }
}
```

## References

- Common Weakness Enumeration: [CWE-288](https://cwe.mitre.org/data/definitions/288.html).
- Common Weakness Enumeration: [CWE-798](https://cwe.mitre.org/data/definitions/798.html).
- SAP CAPire Documentation: [Authentication Strategies](https://cap.cloud.sap/docs/node.js/authentication#strategies).
