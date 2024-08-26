using {advanced_security.models.test as db_schema} from '../db/schema';

service Service3 @(path: '/service-3') {
  entity Service3Entity1 as
    projection on db_schema.Service3Entity1
    excluding {
      Attribute4
    }

  action send1(messageToPass : String) returns String;
  action send2(messageToPass : String) returns String;
}
