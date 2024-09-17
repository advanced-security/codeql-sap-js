const cds = require("@sap/cds");

module.exports = cds.service.impl(function () {
  this.on("send2", async (msg) => {
    const { messageToPass } = msg.data;
    const doSomething = console.log;
    doSomething(messageToPass);
  });

  super.init();
});
