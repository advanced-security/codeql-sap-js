const cds = require("@sap/cds");

module.exports = cds.service.impl(function () {
  /* Log upon receiving an "send2" event. */
  this.on("send2", async (msg) => {
    const { messageToPass } = msg.data;

    /*
     * Antipattern: `cds.User.default` is overwritten to `cds.User.Privileged`
     */
    const cdsUser = cds.User;
    cdsUser.default = cdsUser.Privileged;
  });

  super.init();
});
