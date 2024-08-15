const cds = require("@sap/cds");

module.exports = class Service1 extends cds.ApplicationService {
  init() {
    this.on("send1", async (req) => {
      const { messageToPass } = req.data;
      const Service2 = await cds.connect.to("Service2");
      Service2.send("send2", { messageToPass });
    });

    super.init();
  }
};
