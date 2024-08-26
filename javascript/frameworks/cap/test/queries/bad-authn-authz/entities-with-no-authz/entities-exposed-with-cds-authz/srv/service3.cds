using { advanced_security.entities_exposed_with_cds_authz.sample_entities as db_schema } from '../db/schema';

service Service3 @(path: '/service-1') {
  /* Not an error: dominated by `@requires` of Service3. */
  entity Service3Entity1 as projection on db_schema.Entity3 excluding { Attribute2 }

  /* Not an error: dominated by `@requires` of Service3. */
  actions {
    action send1 (
      messageToPass : String
    ) returns String;
  }

  /* Not an error: dominated by `@requires` of Service3. */
  function fun1() returns String;
}

annotate Service3 with @(requires: [ 'authenticated-user' ]);