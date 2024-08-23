# Access rights to an entity is unnecessarily elevated to privileged

The privileged user, represented as `cds.User.Privileged`, is being used to access an entity that requires authorization. If the required access rights is greater than the user accessing it, the application may expose entities to the user that does not have rights to view it.

This is especially important when the accessed entity belongs to a remote service. By default, when using a production-grade authentication strategy all CAP endpoints are authenticated. However, if the entity is outside the application, there is no guarantee that the user is authenticated in the remote service.

## Recommendations

### Avoid using `cds.User.Privileged` when accessing an access-controlled entity

Any entity that requires authorization should be accessed within the context of the authenticated user. When using a transaction, prefer using `cds.User` as the `user` attribute of the option argument to the call of `cds.ApplicationService.tx()` in order to check the required access rights of the entity against that of the user.

## Examples

The following service, named Service1 and implemented in the file service1.js, is accessing an entity that belongs to another service named Service2 and defined in the file service2.cds. The entity, Service2Entity, demands that the user have level greater than 2.

### `service1.js`

``` javascript
this.on("action1", async (req) => {
  const Service2 = await cds.connect.to("Service2");
  const { Service2Entity } = Service2.entities;
  return this.tx({ user: new cds.User.Privileged("") }, (tx) =>
    tx.run(
      SELECT.from(Service2Entity) // Declared in service2.cds
        .where`Attribute4=${req.data.messageToPass}`,
    ),
  );
});
```

### `service2.cds`

``` cds
service Service2 @(path: 'service-2') {
  /* Read access only to users with access level greater than 2. */
  @(restrict: [ { grant: 'READ', to: '$user.level > 2' } ])
  entity Service2Entity {
    Attribute1 : String(100);
    Attribute2 : String(100)
  }
}
```

## References

- SAP CAPire Documentation: [cds.User.Privileged](https://cap.cloud.sap/docs/node.js/authentication#privileged-user).
- SAP CAPire Documentation: [cds.tx()](https://cap.cloud.sap/docs/node.js/cds-tx#srv-tx-ctx).
- Common Weakness Enumeration: [CWE-250](https://cwe.mitre.org/data/definitions/250.html).
- Common Weakness Enumeration: [CWE-266](https://cwe.mitre.org/data/definitions/266.html).
