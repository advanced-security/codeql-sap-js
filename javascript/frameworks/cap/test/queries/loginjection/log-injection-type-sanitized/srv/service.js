const cds = require("@sap/cds");
const LOG = cds.log("logger");

module.exports = cds.service.impl(function() {
    /* Log upon receiving an "send" event. */
    this.on("send", async (msg) => {
        const { messageToPass } = msg.data;
        /* A log injection sink. */
        LOG.info("Received: ", messageToPass); // messageToPass is Integer, not a log injection!
  });
})
