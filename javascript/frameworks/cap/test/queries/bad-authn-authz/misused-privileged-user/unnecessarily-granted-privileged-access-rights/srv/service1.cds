using { advanced_security.unnecessarily_granted_privileged_access_rights.sample_entities as db_schema } from '../db/schema';

service Service1 @(path: '/service-1') {
  /* Unrestricted read access to anyone. */
  @(restrict: [ { grant: 'READ' } ])
  entity Service1Entity1 as projection on db_schema.Entity1 excluding { Attribute2 }

  /* Read access only to users with access level greater than 2. */
  @(restrict: [ { grant: 'READ', to: '$user.level > 2' } ])
  entity Service1Entity2 as projection on db_schema.Entity1 excluding { Attribute1 }

  /* API to talk to Service1. */
  action send1 (
    messageToPass : String
  ) returns String;

  /* API to talk to Service1. */
  action send2 (
    messageToPass : String
  ) returns String;

  /* API to talk to Service1. */
  action send3 (
    messageToPass : String
  ) returns String;

  /* API to talk to Service1. */
  action send4 (
    messageToPass : String
  ) returns String;

  /* API to talk to Service1. */
  action send5 (
    messageToPass : String
  ) returns String;
}
