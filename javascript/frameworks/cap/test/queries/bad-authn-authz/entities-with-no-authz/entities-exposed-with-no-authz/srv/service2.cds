using {advanced_security.entities_exposed_with_no_authz.sample_entities as db_schema} from '../db/schema';

service Service2 @(path: '/service-2') {
  /* Entity to send READ/GET about. */
  entity Service2Entity as
    projection on db_schema.Entity2
    excluding {
      Attribute4
    }

  /* API to talk to Service2. */
  action send2(messageToPass : String) returns String;
}
