using { advanced_security.entities_exposed_with_js_authz.sample_entities as db_schema } from '../db/schema';

service Service1 @(path: '/service-1') {
  /* Entity to send READ/GET about. */
  entity Service1Entity as projection on db_schema.Entity1 excluding { Attribute2 }

  /* API to talk to Service1. */
  action send1 (
    messageToPass : String
  ) returns String;
}
