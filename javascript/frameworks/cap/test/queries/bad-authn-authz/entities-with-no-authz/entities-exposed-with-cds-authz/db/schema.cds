namespace advanced_security.entities_exposed_with_cds_authz.sample_entities;

entity Entity11 {
  Attribute1 : String(100);
  Attribute2 : String(100)
}

@requires: ['authenticated-user']
entity Entity12 {
  Attribute1 : String(100);
  Attribute2 : String(100)
}

entity Entity21 {
  Attribute1 : String(100);
  Attribute2 : String(100)
}

@requires: ['authenticated-user']
entity Entity22 {
  Attribute1 : String(100);
  Attribute2 : String(100)
}

entity Entity3 {
  Attribute1 : String(100);
  Attribute2 : String(100)
}