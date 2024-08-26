using { advanced_security.entities_exposed_with_js_authz.sample_entities as db_schema } from '../db/schema';

service Service1 @(path: '/service-1') {
  entity Service1Entity as projection on db_schema.Entity1 excluding { Attribute2 }

  action send1 (
    messageToPass : String
  ) returns String;

  function fun1(
    messageToPass : String
  ) returns String;
}
