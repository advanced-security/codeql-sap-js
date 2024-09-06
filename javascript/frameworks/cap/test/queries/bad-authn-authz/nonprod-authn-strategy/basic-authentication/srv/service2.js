const cds = require("@sap/cds");

module.exports = cds.service.impl(function () {
  /* Log upon receiving an "send2" event. */
  this.on("send2", async (msg) => {
    const { messageToPass } = msg.data;
    /* Do something with the received data; customize below to individual needs. */
    const doSomething = console.log;
    doSomething(messageToPass);
  });

  super.init();
});
