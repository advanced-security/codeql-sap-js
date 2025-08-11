const cds = require("@sap/cds");

module.exports = class Service4 extends cds.ApplicationService {
  init() {
    this.on("send1", async (req) => {
      const { messageToPass } = req.data;  // SAFE: Unexposed service, not a taint source
      const Service2 = await cds.connect.to("service-2");
      Service2.send("send2", { messageToPass });
    });

    this.on("send2", async (req) => {
      const [ messageToPass ] = req.params;  // SAFE: Unexposed service, not a taint source
      const Service2 = await cds.connect.to("service-2");
      Service2.send("send2", { messageToPass });
    });

    this.on("send3", async (req) => {
      const messageToPass = req.headers["user-agent"];  // SAFE: Unexposed service, not a taint source
      const Service2 = await cds.connect.to("service-2");
      Service2.send("send2", { messageToPass });
    });

    this.on("send4", async (req) => {
      const messageToPass1 = req.http.req.query.someProp;  // SAFE: Unexposed service, not a taint source
      const messageToPass2 = req.http.req.body.someProp;  // SAFE: Unexposed service, not a taint source
      const messageToPass3 = req.http.req.params.someProp;  // SAFE: Unexposed service, not a taint source
      const messageToPass4 = req.http.req.headers.someProp;  // SAFE: Unexposed service, not a taint source
      const messageToPass5 = req.http.req.cookies.someProp;  // SAFE: Unexposed service, not a taint source
      const messageToPass6 = req.http.req.originalUrl;  // SAFE: Unexposed service, not a taint source
      const messageToPass7 = req.http.req.hostname;  // SAFE: Unexposed service, not a taint source
      const messageToPass8 = req.http.req.get("someProp");  // SAFE: Unexposed service, not a taint source
      const messageToPass9 = req.http.req.is("someProp");  // SAFE: Unexposed service, not a taint source
      const messageToPass10 = req.http.req.header("someProp");  // SAFE: Unexposed service, not a taint source
      const messageToPass11 = req.http.req.param("someProp");  // SAFE: Unexposed service, not a taint source
      const Service2 = await cds.connect.to("service-2");  // SAFE: Unexposed service, not a taint source
      Service2.send("send2", { messageToPass1 });
    });

    this.on("send5", async (req) => {
      const messageToPass = req.id;  // SAFE: Unexposed service, not a taint source
      const Service2 = await cds.connect.to("service-2");
      Service2.send("send2", { messageToPass });
    });
  }
};
