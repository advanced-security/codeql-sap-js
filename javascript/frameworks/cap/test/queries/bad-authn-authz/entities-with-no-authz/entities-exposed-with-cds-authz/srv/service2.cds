using { advanced_security.entities_exposed_with_cds_authz.sample_entities as db_schema } from '../db/schema';

service Service2 @(path: '/service-2', requires: [ 'authenticated-user' ]) {
  /* Entity to send READ/GET about. */
  entity Service2Entity @(restrict: [
    { grant: 'WRITE', to: 'Role1' },
    { grant: [ 'WRITE', 'UPDATE' ], to: 'Role2', where: 'Attribute3 = $user.attr' }
  ]) as projection on db_schema.Entity2 excluding { Attribute4 }

  /* API to talk to Service2. */
  actions {
    @(requires: 'Role3')
    action send2 ( messageToPass: String ) returns String;
  }

  function fun2 @(restrict: [{ to: 'Role4' }]) () returns String;
}