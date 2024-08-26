const cds = require("@sap/cds");
const db = cds.connect.to("db");

/* Emit a "Received1" event upon receiving a READ request on its entity. */
module.exports = class Service1 extends cds.ApplicationService {
  init() {
    /* 1. Resolve to advanced_security.models.test.Service1Entity1 in all definitions */
    const { Service1Entity1 } = db.entities("advanced_security.models.test");
    /* 2. Resolve to advanced_security.models.test.Service1Entity2 in all definitions */
    const { Service1Entity2 } = cds.entities("advanced_security.models.test");
  }
};
