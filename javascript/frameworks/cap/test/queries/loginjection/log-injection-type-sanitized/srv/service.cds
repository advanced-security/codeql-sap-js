using { advanced_security.log_injection.sample_entities as db_schema } from '../db/schema';

service Service @(path: '/service') {
  /* Entity to send READ/GET about. */
  entity ServiceEntity as projection on db_schema.Entity2 excluding { Attribute4 }

  /* API to talk to Service. */
  action send (
    messageToPass: Integer
  ) returns String;
}
