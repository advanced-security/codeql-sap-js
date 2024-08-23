using { advanced_security.unnecessarily_granted_privileged_access_rights.sample_entities as db_schema } from '../db/schema';

service Service2 @(path: '/service-2') {
  /* Unrestricted read access to anyone. */
  @(restrict: [ { grant: 'READ' } ])
  entity Service2Entity1 as projection on db_schema.Entity2 excluding { Attribute4 }

  /* Read access only to users with access level greater than 2. */
  @(restrict: [ { grant: 'READ', to: '$user.level > 2' } ])
  entity Service2Entity2 as projection on db_schema.Entity2 excluding { Attribute4 }

  /* API to talk to Service2. */
  action send5 (
    messageToPass: String
  ) returns String;
}
