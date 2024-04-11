using { advanced_security.default_is_privileged.sample_entities as db_schema } from '../db/schema';

/* Uncomment the line below to make the service hidden */
// @protocol: 'none'
service Service1 @(path: '/service-1') {
  /* Entity to send READ/GET about. */
  entity Service1Entity as projection on db_schema.Entity1 excluding { Attribute2 }

  /* API to talk to Service1. */
  action send1 (
    messageToPass : String
  ) returns String;
}
