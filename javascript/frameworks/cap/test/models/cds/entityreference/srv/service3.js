const cds = require("@sap/cds");

module.exports = class Service3 extends cds.ApplicationService {
  init() {
    this.on("send1", async (req) => {
      return this.tx(
        { user: new cds.User.Privileged("privileged-user-1") },
        (tx) =>
          tx.run(
            /* 1. Resolve to Service3.Service3Entity1 in service-3.cds.json */
            SELECT.from`Service3.Service3Entity1`
              .where`Attribute1=${req.data.messageToPass}`
          )
      );
    });
    this.on("send2", async (req) => {
      return this.tx(
        { user: new cds.User.Privileged("privileged-user-1") },
        (tx) =>
          tx.run(
            /* 2. Resolve to advanced_security.models.test.Service3Entity2 in service-3.cds.json */
            SELECT.from`advanced_security.models.test.Service3Entity1`
              .where`Attribute1=${req.data.messageToPass}`
          )
      );
    });
  }
};
