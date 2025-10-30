const cds = require("@sap/cds");

module.exports = cds.service.impl(function () {
  this.on("send2", async (msg) => {
    const { messageToPass } = msg.data;  // UNSAFE: Taint source, Exposed service
    const doSomething = console.log;
    doSomething(messageToPass);
  });
});
