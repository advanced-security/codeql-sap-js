const cds = require("@sap/cds");

module.exports = cds.service.impl(function () {  // ImplMethodCallApplicationServiceDefinition
  this.on("SomeEvent1", (req) => {
    /* ... */
  });
});
