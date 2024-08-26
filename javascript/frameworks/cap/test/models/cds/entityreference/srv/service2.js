const cds = require("@sap/cds");

module.exports = cds.service.impl(function () {
  /* 1. Resolve to advanced_security-models.test.Service2Entity1 in service-2.cds.json */
  const { Service2Entity1 } = this.entities("advanced_security.models.test");
  /* 2. Resolve to Service2.Service2Entity2 in service-2.cds.json */
  const { Service2Entity2 } = this.entities;
  /* 3. Resolve to advanced_security-models.test.Service2Entity1 in service-2.cds.json (same as 1) */
  const s2e1 = this.entities("advanced_security.models.test").Service2Entity1;
  /* 4. Resolve to Service2.Service2Entity2 in service-2.cds.json (same as 2) */
  const s2e2 = this.entities.Service2Entity2;
});
