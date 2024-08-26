const cds = require("@sap/cds");
let svc = new cds.ApplicationService("", cds.model, options);
let svc1 = await new cds.ApplicationService("", cds.model, options);
const svc2 = cds.connect.to("some-service");
const svc3 = await cds.connect.to("some-service");
const { svc5 } = cds.serve("some-service");
const { svc4 } = await cds.serve("some-service");

const cdslib = require("@sap/cds/lib");
const { svc6 } = cdslib.serve("some-service");

const { Service2 } = cds.connect.to("service-2");

module.exports = class Service1 extends cds.ApplicationService {
  init() {
    this.on("send1", async (req) => {
      const { messageToPass } = req.data;

      Service2.send("send2", { messageToPass });
    });
  }
};
