const cds = require("@sap/cds");

/* Emit a "Received1" event upon receiving a READ request on its entity. */
module.exports = class Service1 extends cds.ApplicationService {
  init() {
    this.on("send1", async (req) => {
      const { messageToPass } = req.data;  // UNSAFE: Taint source, Exposed service
      const Service2 = await cds.connect.to("service-2");
      Service2.send("send2", { messageToPass });
    });

    this.on("send2", async (req) => {
      const [ messageToPass ] = req.params;  // UNSAFE: Taint source, Exposed service
      const Service2 = await cds.connect.to("service-2");
      Service2.send("send2", { messageToPass });
    });

    this.on("send3", async (req) => {
      const messageToPass = req.headers["user-agent"];  // UNSAFE: Taint source, Exposed service
      const Service2 = await cds.connect.to("service-2");
      Service2.send("send2", { messageToPass });
    });

    this.on("send4", async (req) => {
      const messageToPass1 = req.http.req.query.someProp;  // UNSAFE: Taint source, Exposed service
      const messageToPass2 = req.http.req.body.someProp;  // UNSAFE: Taint source, Exposed service
      const messageToPass3 = req.http.req.params.someProp;  // UNSAFE: Taint source, Exposed service
      const messageToPass4 = req.http.req.headers.someProp;  // UNSAFE: Taint source, Exposed service
      const messageToPass5 = req.http.req.cookies.someProp;  // UNSAFE: Taint source, Exposed service
      const messageToPass6 = req.http.req.originalUrl;  // UNSAFE: Taint source, Exposed service
      const messageToPass7 = req.http.req.hostname;  // UNSAFE: Taint source, Exposed service
      const messageToPass8 = req.http.req.get("someProp");  // UNSAFE: Taint source, Exposed service
      const messageToPass9 = req.http.req.is("someProp");  // UNSAFE: Taint source, Exposed service
      const messageToPass10 = req.http.req.header("someProp");  // UNSAFE: Taint source, Exposed service
      const messageToPass11 = req.http.req.param("someProp");  // UNSAFE: Taint source, Exposed service
      const Service2 = await cds.connect.to("service-2");  // UNSAFE: Taint source, Exposed service
      Service2.send("send2", { messageToPass1 });
    });

    this.on("send5", async (req) => {
      const messageToPass = req.id;  // UNSAFE: Taint source, Exposed service
      const Service2 = await cds.connect.to("service-2");
      Service2.send("send2", { messageToPass });
    });

    this.on("send6", async (req) => {
      const messageToPass = req.locale;  // SAFE: Not a taint source, Exposed service
      const Service2 = await cds.connect.to("service-2");
      Service2.send("send2", { messageToPass });
    });

    this.on("send7", async (req) => {
      const messageToPass = req.tenant;  // SAFE: Not a taint source, Exposed service
      const Service2 = await cds.connect.to("service-2");
      Service2.send("send2", { messageToPass });
    });

    this.on("send8", async (req) => {
      const messageToPass = req.timestamp;  // SAFE: Not a taint source, Exposed service
      const Service2 = await cds.connect.to("service-2");
      Service2.send("send2", { messageToPass });
    });

    this.on("send9", async (req) => {
      const messageToPass = req.user;  // SAFE: Not a taint source, Exposed service
      const Service2 = await cds.connect.to("service-2");
      Service2.send("send2", { messageToPass });
    });
  }
};
