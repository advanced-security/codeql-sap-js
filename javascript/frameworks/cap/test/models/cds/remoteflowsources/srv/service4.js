const cds = require("@sap/cds");

module.exports = class Service4 extends cds.ApplicationService {
  init() {
    this.on("send11", async (req) => {
      const { messageToPass } = req.data;  // SAFE: Unexposed service, not a taint source
      const Service2 = await cds.connect.to("service-2");
      Service2.send("send2", { messageToPass });
    });

    this.on("send21", async (req) => {
      const [ messageToPass ] = req.params;  // SAFE: Unexposed service, not a taint source
      const Service2 = await cds.connect.to("service-2");
      Service2.send("send2", { messageToPass });
    });

    this.on("send31", async (req) => {
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

    this.on("send51", async (req) => {
      const messageToPass = req.id;  // SAFE: Unexposed service, not a taint source
      const Service2 = await cds.connect.to("service-2");
      Service2.send("send2", { messageToPass });
    });

    this.on("send61", async (req) => {
      const messageToPass = req._queryOptions;  // SAFE: Unexposed service, not a taint source
      const Service2 = await cds.connect.to("service-2");
      Service2.send("send2", { messageToPass });
    });
  }
};

function getReqData(request) {
  return request.data;  // SAFE: Unexposed service, not a taint source
}

function getReqParams(request) {
  return request.params;  // SAFE: Unexposed service, not a taint source
}

function getReqHeaders(request) {
  return request.headers;  // SAFE: Unexposed service, not a taint source
}

function getReqId(request) {
  return request.id;  // SAFE: Unexposed service, not a taint source
}

function getReqQueryOptions(request) {
  return request._queryOptions;  // SAFE: Unexposed service, not a taint source
}
