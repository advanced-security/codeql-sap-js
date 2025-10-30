const cds = require("@sap/cds");

module.exports = (srv) => {  // ExportedClosureApplicationServiceDefinition
  srv.on("SomeEvent1", (req) => {
    /* ... */
  });
};
