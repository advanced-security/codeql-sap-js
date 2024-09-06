const cds = require("@sap/cds");

class CustomPrivilegedUser2 extends cds.User {
  is() {
    return true;
  }
}

module.exports = cds.service.impl(function () {
  /*
   * ERROR: Service2 accessing its own entity that requires
   * authorization, with a privileged user.
   */
  this.on("send1", async (msg) => {
    const user1 = new cds.User.Privileged("privileged1");
    this.tx({ user: user1 }, (tx) =>
      tx.run(
        INSERT.into("Service2Entity2").entries({
          url: req._.req.url,
          user: req.user.id,
          data: msg.data.messageToPass,
        })
      )
    );
  });

  /*
   * ERROR: Service2 accessing its own entity that requires
   * authorization, with a custom privileged user.
   */
  this.on("send2", async (msg) => {
    const user2 = new CustomPrivilegedUser2("privileged2");
    this.tx({ user: user2 }, (tx) =>
      tx.run(
        INSERT.into("Service2Entity2").entries({
          url: req._.req.url,
          user: req.user.id,
          data: msg.data.messageToPass,
        })
      )
    );
  });
});
