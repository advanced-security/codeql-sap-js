const cds = require("@sap/cds");

class CustomPrivilegedUser2 extends cds.User {
  is() {
    return true;
  }
}

module.exports = cds.service.impl(function () {
  this.on("send2", async (msg) => {
    /* 3. Creating a cds.User.Privileged directly */
    const user1 = new cds.User.Privileged("privileged1");
    this.tx({ user1 }, (tx) =>
      tx.run(
        INSERT.into("Service2Entity").entries({
          url: req._.req.url,
          user: req.user.id,
          data: msg.data.messageToPass,
        }),
      ),
    );
    /* 4. Creating a custom privileged user directly */
    const user2 = new CustomPrivilegedUser2("privileged2");
    this.tx({ user2 }, (tx) =>
      tx.run(
        INSERT.into("Service2Entity").entries({
          url: req._.req.url,
          user: req.user.id,
        }),
      ),
    );
  });
});
