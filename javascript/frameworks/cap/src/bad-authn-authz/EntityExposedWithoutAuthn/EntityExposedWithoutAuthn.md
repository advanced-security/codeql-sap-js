# CAP Definitions Exposed without Access Controls

Although using a production-level authentication strategy such as `jwt` ensures that all entities and services require the user to be authenticated, this does not guarantee any further authorization. Furthermore, the lack of required authentication or authorization may imply a gap in the design of the system.

## Recommendation

### Use CDS-based authorization

CDL provides two annotations to declare access controls `@requires` and `@restrict` with the latter providing more granularity than the former. For example, to check if a request is being made by an authenticated user to the CDL entity or service, annotate it with `@requires: 'authenticated-user'`. On the other hand, if it needs to be read only via a certain group of users where the user has level greater than 2, use `@restrict: { grant: 'READ', to: 'SomeUser', where: { $user.level > 2 } }` (note the leading `$`).

#### Check the original CDS entity it is derived from

CDS entities may be derived from other entities by means of selection and projection. Derived definitions inherit access control conditions and optionally override them. In order to accurately determine what authorization an entity requires, the access control of the parent entity should be transitively inspected.

### Enforce authorization with JavaScript

Access control may be enforced when a request handler for the relevant entity or service is registered. Both `cds.Service.before` and `cds.Service.on` may be used for enforcement. For example, to restrict writing to and updating an entity to a user satisfying certain requirements, either one of the below handler registrations may be used:

``` javascript
/**
 * Before serving a request to access SomeEntity, check if the request is coming from a user
 * with SomeRole and level greater than 3.
 */
this.before(["WRITE", "UPDATE"], "SomeEntity", (req) => {
  (req.user.is("SomeRole") && req.user.attr.level > 3) || req.reject(403);
});

/**
 * On request to access SomeEntity, check if the request is coming from a user
 * with SomeRole and level greater than 3.
 */
this.on(["WRITE", "UPDATE"], "SomeEntity", (req) => {
  if (req.user.is("SomeRole") && req.user.attr.level > 3) {
    /* Do something */
  } else req.reject(403);
});
```

## Examples

The following CDS definition and its JavaScript implementation imposes no authorization on `SomeEntity`. Note that the `OriginalEntity` from which `DerivedEntity` derives from does not control the access either.

### db/schema.cds

``` cap-cds
namespace sample_namespace.sample_entities;

entity OriginalEntity {
  Attribute1 : String(100);
  Attribute2 : String(100)
}
```

### srv/service1.cds

``` cap-cds
using { sample_namespace.sample_entities as db_schema } from '../db/schema';

service SomeService {
  entity DerivedEntity as projection on db_schema.OriginalEntity excluding { Attribute2 }
}
```

### srv/service1.js

``` javascript

const cds = require("@sap/cds");

module.exports = class Service1 extends cds.ApplicationService {
  init() {
    this.on("READ", "SomeService", (req) => { })
  }
}
```

## References

- SAP CAPire Documentation: [Authorization Enforcement](https://cap.cloud.sap/docs/node.js/authentication#enforcement).
- SAP CAPire Documentation: [@restrict](https://cap.cloud.sap/docs/guides/security/authorization#restrict-annotation).
- SAP CAPire Documentation:
[@requires](https://cap.cloud.sap/docs/guides/security/authorization#requires).
- SAP CAPire Documentation: [Protecting Certain Entries](https://cap.cloud.sap/docs/cds/common#protecting-certain-entries).
- SAP CAPire Documentation: [Inheritance of Restrictions](https://cap.cloud.sap/docs/guides/security/authorization#inheritance-of-restrictions).
- SAP CAPire Documentation: [Authentication Enforced in Production](https://cap.cloud.sap/docs/node.js/authentication#authentication-enforced-in-production).
- Common Weakness Enumeration: [CWE-862](https://cwe.mitre.org/data/definitions/862.html).
- Common Weakness Enumeration: [CWE-306](https://cwe.mitre.org/data/definitions/306.html).
