using { advanced_security.entities_exposed_with_cds_authz.sample_entities as db_schema } from '../db/schema';

service Service1 @(path: '/service-1', requires: [ 'authenticated-user' ]) {
  entity Service1Entity1 @(restrict: [
    { grant: 'WRITE', to: 'Role1' },
    { grant: [ 'WRITE', 'UPDATE' ], to: 'Role2', where: 'Attribute1 = $user.attr' }
  ]) as projection on db_schema.Entity11 excluding { Attribute2 }

  /* Not an error: Inherits the `@requires` annotation of Entity12. */
  entity Service1Entity2 as projection on db_schema.Entity12 excluding { Attribute1 }

  /* Not an error: Inherits the `@requires` annotation of Entity12. */
  entity Service1Entity3 as select from db_schema.Entity12;

  action send1 @(requires: 'Role3') (
    messageToPass : String
  ) returns String;

  function fun1 @(restrict: [{ to: 'Role4' }]) () returns String;
}
