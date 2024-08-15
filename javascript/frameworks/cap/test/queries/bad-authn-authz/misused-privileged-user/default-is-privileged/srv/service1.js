const cds = require("@sap/cds");

/* Emit a "Received1" event upon receiving a READ request on its entity. */
module.exports = class Service1 extends cds.ApplicationService {
  init() {
    this.on("send1", async (req) => {
      const { messageToPass } = req.data;
      const Service2 = await cds.connect.to("Service2");

      /*
       * Antipattern: `cds.User.default` is overwritten to `cds.User.Privileged`
       */
      const cdsUser = cds.User;
      cdsUser.default = cdsUser.Privileged;

      Service2.send("send2", { messageToPass });
    });

    super.init();
  }
};
