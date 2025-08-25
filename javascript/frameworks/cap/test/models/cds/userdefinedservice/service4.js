const cds = require("@sap/cds");

module.exports = cds.service.impl((srv) => {  // ImplMethodCallApplicationServiceDefinition
  this.on("SomeEvent1", (req) => {
    /* ... */
  });
});

