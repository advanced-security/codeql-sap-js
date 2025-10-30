using { advanced_security.log_injection.sample_entities as db_schema } from '../db/schema';

service Service2 @(path: '/service-2') {
  entity Service2Entity as projection on db_schema.Entity2 excluding { Attribute4 }

  action send2 (
    messageToPass: String
  ) returns String;
}
