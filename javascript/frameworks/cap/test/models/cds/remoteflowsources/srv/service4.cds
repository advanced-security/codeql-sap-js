using { advanced_security.log_injection.sample_entities as db_schema } from '../db/schema';

@protocol: 'none' // NOTE: This service is internal use only.
service Service4 @(path: '/service-4') {
  entity Service4Entity as projection on db_schema.Entity4 excluding { Attribute4 }

  action send4 (
    messageToPass: String
  ) returns String;
}
