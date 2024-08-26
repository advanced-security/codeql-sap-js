using {advanced_security.models.test as db_schema} from '../db/schema';

service Service2 @(path: '/service-2') {
  entity Service2Entity2 as
    projection on db_schema.Service2Entity2
    excluding {
      Attribute4
    }

  action send2(messageToPass : String) returns String;
}
