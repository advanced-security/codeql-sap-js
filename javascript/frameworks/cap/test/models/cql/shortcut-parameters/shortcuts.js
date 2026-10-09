const cds = require("@sap/cds");

cds.read("Item").where("read-clause");
cds.create("Item").entries("create-data");
cds.update("Item").set("update-data").where("update-clause");
cds.delete("Item").where("delete-clause");
cds.insert("Item").entries("insert-data");
cds.upsert("Item").entries("upsert-data");

const unrelated = {
  read: function () { return this; },
  where: function () { return this; }
};
unrelated.read("Item").where("not-a-query-parameter");
