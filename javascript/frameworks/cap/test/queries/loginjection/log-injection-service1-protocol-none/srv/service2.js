const cds = require("@sap/cds");
const LOG = cds.log("logger");

module.exports = cds.service.impl(function() {
    /* Log upon receiving an "send2" event. */
    this.on("send2", async (msg) => {
        const { messageToPass } = msg.data;
        /* A log injection sink. */
        LOG.info("Received: ", messageToPass); // CAP log injection alert
  });
})
