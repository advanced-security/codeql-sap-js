namespace coverage;

service Catalog {
  entity Books {
    key ID : Integer;
  }

  event Created {
    ID : Integer;
  }

  action reset();
  function total() returns Integer;
}

event Outside {
  ID : Integer;
}
